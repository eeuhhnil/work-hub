import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { DbService } from '../../common/db/db.service'
import { Task } from '../../common/db/models'
import { IdLike } from '../../common/types'
import {
  QueryTaskDto,
  TaskStatsDto,
  UpdateTaskDto,
  ApproveTaskDto,
  RejectTaskDto,
  QueryPendingApprovalTasksDto,
} from './dtos'
import { FilterQuery } from 'mongoose'
import { NotificationService } from '../notification/notification.service'
import {
  ProjectRole,
  TaskStatus,
  SpaceRole,
  SystemRole,
} from '../../common/enums'

@Injectable()
export class TaskService {
  constructor(
    private readonly db: DbService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOne(payload: Omit<Task, '_id'>, actor?: any) {
    const task = await this.db.task.create(payload)
    await this.notificationService.notifyCreateTask(task, actor)

    return task
  }

  async findOne(taskId: IdLike<string>) {
    return this.db.task.findById(taskId)
  }

  async findMany(userId: string, query: QueryTaskDto) {
    const filter: FilterQuery<Task> = {
      $or: [{ owner: userId }, { assignee: userId }],
    }

    // filter thêm từ query
    if (query.project) {
      filter.project = query.project
    }
    // if (query.space) {
    //   filter.space = query.space
    // }

    // phân trang & sort
    const { page = 1, limit = 10 } = query
    const sort = query.getSortObject()

    const options = {
      page,
      limit,
      sort,
      populate: 'assignee',
    }

    return this.db.task.paginate(filter, options)
  }

  async findTasksForCalendar(
    userId: string,
    projectId: string,
    userRole: ProjectRole,
  ) {
    let filter: FilterQuery<Task> = {
      project: projectId,
      dueDate: { $exists: true, $ne: null }, // Only tasks with due dates
    }

    // If user is not owner, only show tasks assigned to them
    if (userRole !== ProjectRole.OWNER) {
      filter.assignee = userId
    }
    // If user is owner, show all tasks in the project (no additional filter needed)

    const options = {
      sort: { dueDate: 1 }, // Sort by due date ascending
      populate: 'assignee owner',
    }

    return this.db.task.find(filter, null, options)
  }

  async updateOne(
    taskId: IdLike<string>,
    payload: Partial<Omit<Task, '_id'>>,
    actor?: any,
  ) {
    const originalTask = await this.db.task.findById(taskId)

    // Special handling: If Employee tries to submit task for approval
    // They should update status to PENDING_APPROVAL (not COMPLETED)
    // Only PM can set status to COMPLETED through approve action
    if (payload.status === TaskStatus.COMPLETED && originalTask) {
      // Check if actor is the assignee (Employee) and not PM/Owner
      const actorId = actor?._id || actor?.sub
      const user = await this.db.user.findById(actorId)

      const isAssignee =
        originalTask.assignee &&
        originalTask.assignee.toString() === actorId?.toString()
      const isPM = user?.role === SystemRole.PROJECT_MANAGER
      const isProjectOwner = await this.db.projectMember.findOne({
        user: actorId,
        project: originalTask.project,
        role: ProjectRole.OWNER,
      })

      // If assignee (not PM/Owner) tries to set COMPLETED, convert to PENDING_APPROVAL
      if (isAssignee && !isPM && !isProjectOwner) {
        payload.status = TaskStatus.PENDING_APPROVAL

        // Update the task
        const updated = await this.db.task.findOneAndUpdate(
          { _id: taskId },
          payload,
          { new: true },
        )

        // Send notification to PM about pending approval
        await this.notificationService.notifyTaskPendingApproval(updated, actor)

        // Send regular update notification
        await this.notificationService.notifyUpdatedTask(
          updated,
          actor,
          payload,
        )

        return updated
      }
    }

    const updated = await this.db.task.findOneAndUpdate(
      { _id: taskId },
      payload,
      {
        new: true,
      },
    )

    // Send notification if actor is provided
    await this.notificationService.notifyUpdatedTask(updated, actor, payload)

    // Special notification for status changes
    if (
      payload.status &&
      originalTask &&
      payload.status !== originalTask.status
    ) {
      await this.notificationService.notifyTaskStatusChanged(
        updated,
        payload.status,
        actor,
      )
    }

    return updated
  }

  async deleteOne(taskId: IdLike<string>, actor?: any) {
    const task = await this.db.task.findById(taskId)
    if (!task) return null

    // Send notification before deletion if actor is provided

    await this.notificationService.notifyDeletedTask(
      taskId.toString(),
      task.project?.toString() || '',
      task.space?.toString() || '',
      actor,
    )

    return this.db.task.deleteOne({ _id: taskId })
  }

  /**
   * Determine user permissions for task operations
   */
  determineTaskPermissions(
    task: Task,
    userId: string,
    spaceMemberRole: SpaceRole,
    projectMemberRole: ProjectRole,
  ) {
    const isTaskOwner = (task.owner as string) === userId
    const isTaskAssignee = (task.assignee as string) === userId
    const isSpaceOwner = spaceMemberRole === SpaceRole.OWNER
    const isProjectOwner = projectMemberRole === ProjectRole.OWNER

    // Check if user has any relation to the task
    const hasTaskAccess =
      isTaskOwner || isTaskAssignee || isSpaceOwner || isProjectOwner

    if (!hasTaskAccess) {
      throw new ForbiddenException('Permission denied')
    }

    return {
      isTaskOwner,
      isTaskAssignee,
      isSpaceOwner,
      isProjectOwner,
      canUpdateAllFields: isSpaceOwner || isProjectOwner,
      canUpdateAllExceptStatus: isTaskOwner && !isSpaceOwner && !isProjectOwner,
      canUpdateStatusAndFiles:
        isTaskAssignee && !isTaskOwner && !isSpaceOwner && !isProjectOwner,
    }
  }

  /**
   * Filter update payload based on user permissions
   */
  filterUpdatePayload(
    payload: UpdateTaskDto,
    permissions: ReturnType<typeof this.determineTaskPermissions>,
  ) {
    const {
      canUpdateAllFields,
      canUpdateAllExceptStatus,
      canUpdateStatusAndFiles,
    } = permissions

    if (canUpdateAllFields) {
      // Space/Project owners can update everything including COMPLETED status
      return payload
    }

    if (canUpdateAllExceptStatus) {
      // Task owners can update everything except status
      const { status, ...allowedFields } = payload

      if (status !== undefined) {
        throw new ForbiddenException(
          'As task owner, you cannot update task status. Only assignee can update status or PM can approve.',
        )
      }

      return allowedFields
    }

    if (canUpdateStatusAndFiles) {
      // Task assignees can only update status and attachments
      const { status, attachments, ...otherFields } = payload

      // Check if assignee is trying to update forbidden fields
      const forbiddenFields = Object.keys(otherFields).filter(
        (key) => otherFields[key] !== undefined,
      )
      if (forbiddenFields.length > 0) {
        throw new ForbiddenException(
          `As task assignee, you can only update status and upload files. Cannot update: ${forbiddenFields.join(', ')}`,
        )
      }

      // Check if assignee is trying to set status to COMPLETED directly
      if (status === TaskStatus.COMPLETED) {
        throw new ForbiddenException(
          'You cannot set task status to COMPLETED directly. It will be set to PENDING_APPROVAL for PM review.',
        )
      }

      // Only allow PENDING, PROCESSING, PENDING_APPROVAL for assignees
      if (
        status &&
        ![
          TaskStatus.PENDING,
          TaskStatus.PROCESSING,
          TaskStatus.PENDING_APPROVAL,
        ].includes(status)
      ) {
        throw new ForbiddenException(
          'As task assignee, you can only set status to PENDING, PROCESSING, or submit for approval. COMPLETED status is set by PM approval.',
        )
      }

      return { status, attachments }
    }

    throw new ForbiddenException('Permission denied')
  }

  async getUserTaskStats(userId: string): Promise<TaskStatsDto> {
    // Lấy tất cả các project mà user là owner hoặc member
    const userProjects = await this.db.projectMember.find({ user: userId })
    const projectIds = userProjects.map((pm) => pm.project)

    // Tạo filter dựa trên role của user trong từng project
    const ownerProjectIds = userProjects
      .filter((pm) => pm.role === ProjectRole.OWNER)
      .map((pm) => pm.project)

    const memberProjectIds = userProjects
      .filter((pm) => pm.role === ProjectRole.MEMBER)
      .map((pm) => pm.project)

    // Tạo query conditions
    const baseConditions: any[] = []

    // Nếu user là owner của project thì lấy tất cả task trong project đó
    if (ownerProjectIds.length > 0) {
      baseConditions.push({
        project: { $in: ownerProjectIds },
      })
    }

    // Nếu user là member của project thì chỉ lấy task được assign cho user đó
    if (memberProjectIds.length > 0) {
      baseConditions.push({
        project: { $in: memberProjectIds },
        assignee: userId,
      })
    }

    if (baseConditions.length === 0) {
      return {
        pending: 0,
        processing: 0,
        pendingApproval: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const filter = { $or: baseConditions }
    const currentDate = new Date()

    // Aggregate để đếm theo status
    const stats = await this.db.task.aggregate([
      { $match: filter },
      {
        $addFields: {
          isOverdue: {
            $and: [
              { $ne: ['$dueDate', null] },
              { $lt: ['$dueDate', currentDate] },
              { $in: ['$status', [TaskStatus.PENDING, TaskStatus.PROCESSING]] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PENDING] }, 1, 0],
            },
          },
          processing: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PROCESSING] }, 1, 0],
            },
          },
          pendingApproval: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PENDING_APPROVAL] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.COMPLETED] }, 1, 0],
            },
          },
          overdue: {
            $sum: {
              $cond: ['$isOverdue', 1, 0],
            },
          },
        },
      },
    ])

    if (stats.length === 0) {
      return {
        pending: 0,
        processing: 0,
        pendingApproval: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const result = stats[0]
    return {
      pending: result.pending || 0,
      processing: result.processing || 0,
      pendingApproval: result.pendingApproval || 0,
      completed: result.completed || 0,
      overdue: result.overdue || 0,
    }
  }

  async getUserTaskStatsBySpace(
    userId: string,
    spaceId: string,
  ): Promise<TaskStatsDto> {
    // Tìm tất cả project trong space trước
    const projectsInSpace = await this.db.project.find({ space: spaceId })
    const projectIdsInSpace = projectsInSpace.map((p) => p._id)

    console.log('Debug - projectsInSpace:', projectsInSpace.length)
    console.log('Debug - spaceId:', spaceId)

    // Tìm các project mà user là member
    const userProjects = await this.db.projectMember.find({
      user: userId,
      project: { $in: projectIdsInSpace },
    })

    console.log('Debug - userProjects in space:', userProjects.length)

    if (userProjects.length === 0) {
      return {
        pending: 0,
        processing: 0,
        pendingApproval: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const projectIds = userProjects.map((pm) => pm.project)

    // Tạo filter dựa trên role của user trong từng project
    const ownerProjectIds = userProjects
      .filter((pm) => pm.role === ProjectRole.OWNER)
      .map((pm) => pm.project)

    const memberProjectIds = userProjects
      .filter((pm) => pm.role === ProjectRole.MEMBER)
      .map((pm) => pm.project)

    // Tạo query conditions
    const baseConditions: any[] = []

    // Nếu user là owner của project thì lấy tất cả task trong project đó
    if (ownerProjectIds.length > 0) {
      baseConditions.push({
        project: { $in: ownerProjectIds },
      })
    }

    // Nếu user là member của project thì chỉ lấy task được assign cho user đó
    if (memberProjectIds.length > 0) {
      baseConditions.push({
        project: { $in: memberProjectIds },
        assignee: userId,
      })
    }

    if (baseConditions.length === 0) {
      return {
        pending: 0,
        processing: 0,
        pendingApproval: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const filter = { $or: baseConditions }
    const currentDate = new Date()

    // Aggregate để đếm theo status
    const stats = await this.db.task.aggregate([
      { $match: filter },
      {
        $addFields: {
          isOverdue: {
            $and: [
              { $ne: ['$dueDate', null] },
              { $lt: ['$dueDate', currentDate] },
              { $in: ['$status', [TaskStatus.PENDING, TaskStatus.PROCESSING]] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PENDING] }, 1, 0],
            },
          },
          processing: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PROCESSING] }, 1, 0],
            },
          },
          pendingApproval: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.PENDING_APPROVAL] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', TaskStatus.COMPLETED] }, 1, 0],
            },
          },
          overdue: {
            $sum: {
              $cond: ['$isOverdue', 1, 0],
            },
          },
        },
      },
    ])

    if (stats.length === 0) {
      return {
        pending: 0,
        processing: 0,
        pendingApproval: 0,
        completed: 0,
        overdue: 0,
      }
    }

    const result = stats[0]
    return {
      pending: result.pending || 0,
      processing: result.processing || 0,
      pendingApproval: result.pendingApproval || 0,
      completed: result.completed || 0,
      overdue: result.overdue || 0,
    }
  }

  async findPendingApprovalTasks(
    userId: string,
    query: QueryPendingApprovalTasksDto,
  ) {
    const { page = 1, limit = 10, project, space } = query

    // Build filter for tasks that need approval
    const filter: FilterQuery<Task> = {
      status: TaskStatus.PENDING_APPROVAL,
    }

    if (project) {
      filter.project = project
    }

    if (space) {
      filter.space = space
    }

    // Get user info to check if they can approve tasks
    const user = await this.db.user.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // If user is PM, they can see all pending approval tasks
    // If user is project owner, they can see tasks in their projects only
    if (user.role === SystemRole.PROJECT_MANAGER) {
      // PM can see all pending approval tasks (no additional filter needed)
    } else {
      // For project owners, filter by projects they own
      const ownedProjects = await this.db.projectMember
        .find({
          user: userId,
          role: ProjectRole.OWNER,
        })
        .select('project')

      if (ownedProjects.length === 0) {
        // User is not PM and doesn't own any projects
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        }
      }

      const projectIds = ownedProjects.map((p) => p.project.toString())
      filter.project = { $in: projectIds }
    }

    const [data, total] = await Promise.all([
      this.db.task
        .find(filter)
        .populate('assignee', 'fullName email')
        .populate('owner', 'fullName email')
        .populate('project', 'name')
        .populate('space', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.db.task.countDocuments(filter),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async approveTask(
    taskId: IdLike<string>,
    payload: ApproveTaskDto,
    actor: any,
  ) {
    const task = await this.db.task.findById(taskId)
    if (!task) {
      throw new NotFoundException('Task not found')
    }

    if (task.status !== TaskStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Task is not pending approval')
    }

    // Check if actor has permission to approve
    const actorId = actor._id || actor.sub
    const user = await this.db.user.findById(actorId)

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if user is PM or project owner
    const canApprove =
      user.role === SystemRole.PROJECT_MANAGER ||
      (await this.db.projectMember.findOne({
        user: actorId,
        project: task.project,
        role: ProjectRole.OWNER,
      }))

    if (!canApprove) {
      throw new ForbiddenException(
        'You do not have permission to approve this task',
      )
    }

    // Update task status to COMPLETED
    const updatedTask = await this.db.task.findOneAndUpdate(
      { _id: taskId },
      {
        status: TaskStatus.COMPLETED,
        approvedBy: actorId,
        approvedAt: new Date(),
        reviewComment: payload.comment,
        completedAt: new Date(),
      },
      { new: true },
    )

    // Send notification to assignee
    await this.notificationService.notifyTaskApproved(updatedTask, actor)

    return updatedTask
  }

  async rejectTask(taskId: IdLike<string>, payload: RejectTaskDto, actor: any) {
    const task = await this.db.task.findById(taskId)
    if (!task) {
      throw new NotFoundException('Task not found')
    }

    if (task.status !== TaskStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Task is not pending approval')
    }

    // Check if actor has permission to reject
    const actorId = actor._id || actor.sub
    const user = await this.db.user.findById(actorId)

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if user is PM or project owner
    const canReject =
      user.role === SystemRole.PROJECT_MANAGER ||
      (await this.db.projectMember.findOne({
        user: actorId,
        project: task.project,
        role: ProjectRole.OWNER,
      }))

    if (!canReject) {
      throw new ForbiddenException(
        'You do not have permission to reject this task',
      )
    }

    // Update task status back to PROCESSING
    const updatedTask = await this.db.task.findOneAndUpdate(
      { _id: taskId },
      {
        status: TaskStatus.PROCESSING,
        rejectedBy: actorId,
        rejectedAt: new Date(),
        reviewComment: payload.reason,
      },
      { new: true },
    )

    // Send notification to assignee
    await this.notificationService.notifyTaskRejected(
      updatedTask,
      actor,
      payload.reason,
    )

    return updatedTask
  }
}
