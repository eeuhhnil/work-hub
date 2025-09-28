import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'
import { FilesInterceptor } from '@nestjs/platform-express'
import { TaskService } from './task.service'
import { SpaceMemberService } from '../spaces/space-member.service'
import { ProjectMemberService } from '../project/project-member.service'
import type { AuthPayload } from '../auth/types'
import {
  CreateTaskDto,
  QueryTaskDto,
  UpdateTaskDto,
  TaskStatsDto,
} from './dtos'
import { AuthUser } from '../auth/decorators'
import {
  ProjectRole,
  SpaceRole, SystemRole,
  TaskPriority,
  TaskStatus,
} from '../../common/enums'
import { StorageService } from '../storage/storage.service'
import { v4 as uuidv4 } from 'uuid'
import {UserRoles} from "../auth/decorators/system-role.decorator";

@Controller('tasks')
@ApiTags('Tasks')
@ApiBearerAuth()
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly spaceMember: SpaceMemberService,
    private readonly projectMember: ProjectMemberService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks with pagination and filtering' })
  async findMany(
    @AuthUser() authPayload: AuthPayload,
    @Query() query: QueryTaskDto,
  ) {
    return await this.taskService.findMany(authPayload.sub, query)
  }

  @Get('calendar/:projectId')
  @ApiOperation({ summary: 'Get tasks for calendar view with permissions' })
  async getTasksForCalendar(
    @AuthUser() authPayload: AuthPayload,
    @Param('projectId') projectId: string,
  ) {
    // Check if user is member of the project
    const projectMember = await this.projectMember.checkMembership(
      projectId,
      authPayload.sub,
    )

    return await this.taskService.findTasksForCalendar(
      authPayload.sub,
      projectId,
      projectMember.role,
    )
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê số lượng task theo trạng thái của user',
    description:
      'Trả về tổng hợp số lượng task theo trạng thái (pending, completed, processing, overdue) cho tất cả project. Nếu là owner thì lấy hết số lượng, còn member thì chỉ lấy những task được assign.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê task thành công',
    type: TaskStatsDto,
  })
  async getUserTaskStats(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<TaskStatsDto> {
    return await this.taskService.getUserTaskStats(authPayload.sub)
  }

  @Get('stats/space/:spaceId')
  @ApiOperation({
    summary: 'Lấy thống kê số lượng task theo trạng thái của user trong một space cụ thể',
    description:
      'Trả về tổng hợp số lượng task theo trạng thái (pending, completed, processing, overdue) cho các project trong space được chỉ định. Nếu là owner thì lấy hết số lượng, còn member thì chỉ lấy những task được assign.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê task theo space thành công',
    type: TaskStatsDto,
  })
  async getUserTaskStatsBySpace(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
  ): Promise<TaskStatsDto> {
    // Check if user is member of the space
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    return await this.taskService.getUserTaskStatsBySpace(authPayload.sub, spaceId)
  }

  @Post('upload-files')
  @ApiOperation({ summary: 'Upload files for task attachment' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]

        if (
          allowedTypes.test(file.originalname) &&
          allowedMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX are allowed',
            ),
            false,
          )
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async uploadTaskFiles(
    @AuthUser() authPayload: AuthPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded')
    }

    const uploadedFiles: Array<{
      filename: string
      originalName: string
      url: string
      size: number
      mimetype: string
      uploadedAt: Date
    }> = []

    for (const file of files) {
      try {
        const processedFile =
          await this.storageService.processDocumentFile(file)
        const fileKey = `tasks/attachments/${uuidv4()}-${processedFile.originalName}`
        const url = await this.storageService.uploadFile(fileKey, processedFile)

        uploadedFiles.push({
          filename: fileKey,
          originalName: processedFile.originalName,
          url,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        })
      } catch (error) {
        throw new BadRequestException(
          `Error uploading file ${file.originalname}: ${error.message}`,
        )
      }
    }

    return {
      message: 'Files uploaded successfully',
      files: uploadedFiles,
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        space: {
          type: 'string',
          description: 'Space ID',
        },
        project: {
          type: 'string',
          description: 'Project ID',
        },
        assignee: {
          type: 'string',
          description: 'Assignee user ID',
        },
        name: {
          type: 'string',
          description: 'Task name',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'string',
          enum: Object.values(TaskPriority),
          description: 'Task priority',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task start date',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task due date',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Task attachment files (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)',
        },
      },
      required: ['space', 'project', 'name'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]

        if (
          allowedTypes.test(file.originalname) &&
          allowedMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX are allowed',
            ),
            false,
          )
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )

  @UserRoles(SystemRole.PROJECT_MANAGER)
  async createOne(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const { space, project, assignee, ...restPayload } = payload

    // Kiểm tra quyền membership - cho phép cả owner và member tạo task
    await Promise.all([
      this.spaceMember.checkMembership(space, authPayload.sub),
      this.projectMember.checkMembership(project, authPayload.sub),
    ])

    // Process uploaded files
    let processedAttachments: Array<{
      filename: string
      originalName: string
      url: string
      size: number
      mimetype: string
      uploadedAt: Date
    }> = []

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const processedFile =
            await this.storageService.processDocumentFile(file)
          const fileKey = `tasks/attachments/${uuidv4()}-${processedFile.originalName}`
          const url = await this.storageService.uploadFile(
            fileKey,
            processedFile,
          )

          processedAttachments.push({
            filename: fileKey,
            originalName: processedFile.originalName,
            url,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
          })
        } catch (error) {
          throw new BadRequestException(
            `Error uploading file ${file.originalname}: ${error.message}`,
          )
        }
      }
    }

    return await this.taskService.createOne(
      {
        owner: authPayload.sub,
        assignee: assignee ? assignee : authPayload.sub,
        space,
        project,
        attachments: processedAttachments,
        ...restPayload,
      },
      authPayload,
    )
  }

  @Post('space/:spaceId/project/:projectId')
  @ApiOperation({ summary: 'Create task in specific space and project' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignee: {
          type: 'string',
          description: 'Assignee user ID',
        },
        name: {
          type: 'string',
          description: 'Task name',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'string',
          enum: Object.values(TaskPriority),
          description: 'Task priority',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task start date',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task due date',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Task attachment files (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)',
        },
      },
      required: ['name'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]

        if (
          allowedTypes.test(file.originalname) &&
          allowedMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX are allowed',
            ),
            false,
          )
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )

  @UserRoles(SystemRole.PROJECT_MANAGER)
  async createTaskInProject(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Param('projectId') projectId: string,
    @Body() payload: Omit<CreateTaskDto, 'space' | 'project'>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const { assignee, ...restPayload } = payload
    await Promise.all([
      this.spaceMember.checkOwnership(spaceId, authPayload.sub),
      this.projectMember.checkOwnership(projectId, authPayload.sub),

      assignee ? this.spaceMember.checkMembership(spaceId, assignee) : null,
      assignee ? this.projectMember.checkMembership(projectId, assignee) : null,
    ])

    // Process uploaded files
    let processedAttachments: Array<{
      filename: string
      originalName: string
      url: string
      size: number
      mimetype: string
      uploadedAt: Date
    }> = []

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const processedFile =
            await this.storageService.processDocumentFile(file)
          const fileKey = `tasks/attachments/${uuidv4()}-${processedFile.originalName}`
          const url = await this.storageService.uploadFile(
            fileKey,
            processedFile,
          )

          processedAttachments.push({
            filename: fileKey,
            originalName: processedFile.originalName,
            url,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
          })
        } catch (error) {
          throw new BadRequestException(
            `Error uploading file ${file.originalname}: ${error.message}`,
          )
        }
      }
    }

    const taskData = {
      ...restPayload,
      space: spaceId,
      project: projectId,
      attachments: processedAttachments,
    }

    return await this.taskService.createOne(
      {
        owner: authPayload.sub,
        assignee: assignee ? assignee : authPayload.sub,
        ...taskData,
      },
      authPayload,
    )
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get one task' })
  async findOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.taskService.findOne(taskId)
    if (!task) throw new NotFoundException(`Task not found`)

    await Promise.all([
      this.spaceMember.checkMembership(task.space as string, authPayload.sub),
      this.projectMember.checkMembership(
        task.project as string,
        authPayload.sub,
      ),
    ])

    await task.populate('space project assignee owner')

    return task
  }

  @UserRoles(SystemRole.PROJECT_MANAGER, SystemRole.EMPLOYEE)
  @Put(':taskId')
  @ApiOperation({ summary: 'Update one task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignee: {
          type: 'string',
          description: 'Assignee user ID',
        },
        name: {
          type: 'string',
          description: 'Task name',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'string',
          enum: Object.values(TaskPriority),
          description: 'Task priority',
        },
        status: {
          type: 'string',
          enum: Object.values(TaskStatus),
          description: 'Task status',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task start date',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task due date',
        },
        attachments: {
          type: 'string',
          description: 'Existing attachments as JSON string',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'New attachment files (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)',
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ]

        if (
          allowedTypes.test(file.originalname) &&
          allowedMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX are allowed',
            ),
            false,
          )
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  )
  async updateOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('taskId') taskId: string,
    @Body() payload: UpdateTaskDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const { sub } = authPayload
    const { assignee, status } = payload

    const task = await this.taskService.findOne(taskId)
    if (!task) throw new NotFoundException(`Task not found`)

    const [spaceMember, projectMember] = await Promise.all([
      this.spaceMember.checkMembership(task.space as string, sub),
      this.projectMember.checkMembership(task.project as string, sub),

      assignee
        ? this.spaceMember.checkMembership(task.space as string, assignee)
        : null,
      assignee
        ? this.projectMember.checkMembership(task.project as string, assignee)
        : null,
    ])

    // Use service to determine permissions and filter payload
    const permissions = this.taskService.determineTaskPermissions(
      task,
      sub,
      spaceMember.role,
      projectMember.role,
    )

    const filteredPayload = this.taskService.filterUpdatePayload(payload, permissions)

    // Process uploaded files
    let newAttachments: Array<{
      filename: string
      originalName: string
      url: string
      size: number
      mimetype: string
      uploadedAt: Date
    }> = []

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const processedFile =
            await this.storageService.processDocumentFile(file)
          const fileKey = `tasks/attachments/${uuidv4()}-${processedFile.originalName}`
          const url = await this.storageService.uploadFile(
            fileKey,
            processedFile,
          )

          newAttachments.push({
            filename: fileKey,
            originalName: processedFile.originalName,
            url,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date(),
          })
        } catch (error) {
          throw new BadRequestException(
            `Error uploading file ${file.originalname}: ${error.message}`,
          )
        }
      }
    }

    // Process existing attachments and combine with new ones
    const processedPayload = { ...filteredPayload }
    let existingAttachments: Array<{
      filename: string
      originalName: string
      url: string
      size: number
      mimetype: string
      uploadedAt: Date
    }> = []

    if (filteredPayload.attachments) {
      try {
        // If attachments is a string (from FormData), parse it
        const attachmentsData = typeof filteredPayload.attachments === 'string'
          ? JSON.parse(filteredPayload.attachments)
          : filteredPayload.attachments

        existingAttachments = Array.isArray(attachmentsData)
          ? attachmentsData.map((attachment) => ({
              filename: attachment.filename,
              originalName: attachment.originalName,
              url: attachment.url,
              size: attachment.size,
              mimetype: attachment.mimetype,
              uploadedAt: attachment.uploadedAt || new Date(),
            }))
          : []
      } catch (error) {
        existingAttachments = []
      }
    }

    // Combine existing and new attachments
    const finalAttachments = [...existingAttachments, ...newAttachments]

    // Create final payload with proper types, excluding attachments
    const { attachments: _, ...payloadWithoutAttachments } = filteredPayload

    // Prepare final update payload
    const finalUpdatePayload: any = {
      ...payloadWithoutAttachments,
      attachments: finalAttachments,
    }

    // Only set completedAt if status is being updated to COMPLETED
    const statusValue = (filteredPayload as any).status
    if (statusValue === TaskStatus.COMPLETED) {
      finalUpdatePayload.completedAt = new Date()
    } else if (statusValue && statusValue !== TaskStatus.COMPLETED) {
      // If status is being changed to something other than COMPLETED, clear completedAt
      finalUpdatePayload.completedAt = undefined
    }

    const updatedTask = await this.taskService.updateOne(
      taskId,
      finalUpdatePayload,
      authPayload,
    )
    await task.populate('space project assignee owner')

    return updatedTask
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete task' })
  async deleteOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.taskService.findOne(taskId)
    if (!task) throw new NotFoundException(`Task not found`)

    const [spaceMember, projectMember] = await Promise.all([
      this.spaceMember.checkMembership(task.space as string, authPayload.sub),
      this.projectMember.checkMembership(
        task.project as string,
        authPayload.sub,
      ),
    ])

    const isTaskOwner = (task.owner as string) === authPayload.sub
    const isSpaceOwner = spaceMember.role === SpaceRole.OWNER
    const isProjectOwner = projectMember.role === ProjectRole.OWNER

    if (!isTaskOwner && !isSpaceOwner && !isProjectOwner) {
      throw new ForbiddenException(`Permission denied`)
    }

    await this.taskService.deleteOne(taskId, authPayload)

    return {
      message: 'Deleted task successfully!',
    }
  }
}
