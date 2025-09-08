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
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { TaskService } from './task.service'
import { SpaceMemberService } from '../spaces/space-member.service'
import { ProjectMemberService } from '../project/project-member.service'
import type { AuthPayload } from '../auth/types'
import { CreateTaskDto, QueryTaskDto, UpdateTaskDto } from './dtos'
import { AuthUser } from '../auth/decorators'
import { ProjectRole, SpaceRole, TaskStatus } from '../../common/enums'

@Controller('tasks')
@ApiTags('Tasks')
@ApiBearerAuth()
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly spaceMember: SpaceMemberService,
    private readonly projectMember: ProjectMemberService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks with pagination and filtering' })
  async findMany(
    @AuthUser() authPayload: AuthPayload,
    @Query() query: QueryTaskDto,
  ) {
    return await this.taskService.findMany(authPayload.sub, query)
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  async createOne(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateTaskDto,
  ) {
    const { space, project, assignee } = payload
    await Promise.all([
      this.spaceMember.checkMembership(space, authPayload.sub),
      this.projectMember.checkMembership(project, authPayload.sub),

      assignee ? this.spaceMember.checkMembership(space, assignee) : null,
      assignee ? this.projectMember.checkMembership(project, assignee) : null,
    ])

    return await this.taskService.createOne({
      owner: authPayload.sub,
      assignee: assignee ? assignee : authPayload.sub,
      ...payload,
    })
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

  @Put(':taskId')
  @ApiOperation({ summary: 'Update one task' })
  async updateOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('taskId') taskId: string,
    @Body() payload: UpdateTaskDto,
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

    if (
      (task.owner as string) !== sub &&
      (task.assignee as string) !== sub &&
      spaceMember.role !== SpaceRole.OWNER &&
      projectMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException(`Permission denied`)
    }

    const updatedTask = await this.taskService.updateOne(taskId, {
      completedAt: status === TaskStatus.COMPLETED ? new Date() : undefined,
      ...payload,
    })
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

    if (
      (task.owner as string) !== authPayload.sub &&
      (task.assignee as string) !== authPayload.sub &&
      spaceMember.role !== SpaceRole.OWNER &&
      projectMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException(`Permission denied`)
    }

    await this.taskService.deleteOne(taskId, authPayload.sub)

    return {
      message: 'Deleted task successfully!',
    }
  }
}
