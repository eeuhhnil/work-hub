import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import * as path from 'node:path'
import { StorageService } from '../storage/storage.service'
import { ProjectService } from './project.service'
import { ProjectMemberService } from './project-member.service'
import { SpaceMemberService } from '../spaces/space-member.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import {
  CreateProjectDto,
  QueryProjectDto,
  UpdateProjectDto,
  ProjectProgressDto,
  UserProjectsProgressResponseDto,
} from './dtos/dtos'
import { FileInterceptor } from '@nestjs/platform-express'
import {UserRoles} from "../auth/decorators/system-role.decorator";
import {SystemRole} from "../../common/enums";

@Controller('projects')
@ApiTags('Projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(
    private readonly storage: StorageService,
    private readonly project: ProjectService,
    private readonly projectMember: ProjectMemberService,
    private readonly spaceMember: SpaceMemberService,
  ) {}

  @UserRoles(SystemRole.PROJECT_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create project' })
  async createOne(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateProjectDto,
  ) {
    await this.spaceMember.checkOwnership(payload.space, authPayload.sub)

    return await this.project.createOne(authPayload.sub, payload, authPayload)
  }

  @Get('with-progress')
  @ApiOperation({ summary: 'Get all projects with progress for current user' })
  async getUserProjectsWithProgress(@AuthUser() authPayload: AuthPayload) {
    return this.project.findUserProjectsWithProgress(authPayload.sub)
  }

  @Get('user-projects')
  @ApiOperation({ summary: 'Get all projects user has access to' })
  async findUserProjects(@AuthUser() authPayload: AuthPayload) {
    return await this.project.findUserProjects(authPayload.sub)
  }

  @Post('space/:spaceId')
  @ApiOperation({ summary: 'Create project in specific space' })
  async createProjectInSpace(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Body() payload: Omit<CreateProjectDto, 'space'>,
  ) {
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    const projectData = {
      ...payload,
      space: spaceId,
    }

    return await this.project.createOne(
      authPayload.sub,
      projectData,
      authPayload,
    )
  }

  @Get()
  @ApiOperation({ summary: 'Find many projects that user has access to' })
  async findMany(
    @AuthUser() authPayload: AuthPayload,
    @Query() query: QueryProjectDto,
  ) {
    // Chỉ trả về projects mà user có quyền truy cập
    return await this.project.findMany(query, authPayload.sub)
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get one project' })
  async findOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('projectId') projectId: string,
  ) {
    await this.projectMember.checkMembership(projectId, authPayload.sub)

    const project = await this.project.findOne(projectId)
    if (!project) throw new NotFoundException(`Project not found`)

    return project
  }

  @Put(':projectId')
  @ApiOperation({ summary: 'Update project' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (
          !file.mimetype.startsWith('image/') ||
          file.mimetype === 'image/gif'
        ) {
          return callback(
            new BadRequestException('Only images accepted'),
            false,
          )
        }
        callback(null, true)
      },
    }),
  )
  async updateOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('projectId') projectId: string,
    @Body() payload: UpdateProjectDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    await this.projectMember.checkOwnership(projectId, authPayload.sub)
    let avatar: string | undefined
    if (file) {
      const processedAvatar = await this.storage.proccessAvatarFile(file)
      const fileExtension = path.extname(processedAvatar.originalname)
      avatar = await this.storage.uploadFile(
        `projects/${projectId}/${fileExtension}`,
        processedAvatar,
      )
    }
    payload['avatar'] = avatar

    return await this.project.updateOne(projectId, payload, authPayload.sub)
  }

  @UserRoles(SystemRole.PROJECT_MANAGER)
  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete project by id' })
  async deleteOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('projectId') projectId: string,
  ) {
    await this.projectMember.checkOwnership(projectId, authPayload.sub)

    return await this.project.deleteOne(projectId, authPayload.sub)
  }
}
