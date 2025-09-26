import { Injectable } from '@nestjs/common'
import { DbService } from '../../common/db/db.service'
import { Task } from '../../common/db/models'
import { IdLike } from '../../common/types'
import { QueryTaskDto, TaskStatsDto } from './dtos'
import { FilterQuery } from 'mongoose'
import { NotificationService } from '../notification/notification.service'
import { ProjectRole, TaskStatus } from '../../common/enums'

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
    const updated = await this.db.task.findOneAndUpdate(
      { _id: taskId },
      payload,
      {
        new: true,
      },
    )

    // Send notification if actor is provided
    if (actor && updated) {
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
        completed: 0,
        overdue: 0,
      }
    }

    const result = stats[0]
    return {
      pending: result.pending || 0,
      processing: result.processing || 0,
      completed: result.completed || 0,
      overdue: result.overdue || 0,
    }
  }

  async getUserTaskStatsBySpace(userId: string, spaceId: string): Promise<TaskStatsDto> {
    // Tìm tất cả project trong space trước
    const projectsInSpace = await this.db.project.find({ space: spaceId })
    const projectIdsInSpace = projectsInSpace.map(p => p._id)

    console.log('Debug - projectsInSpace:', projectsInSpace.length)
    console.log('Debug - spaceId:', spaceId)

    // Tìm các project mà user là member
    const userProjects = await this.db.projectMember.find({
      user: userId,
      project: { $in: projectIdsInSpace }
    })

    console.log('Debug - userProjects in space:', userProjects.length)

    if (userProjects.length === 0) {
      return {
        pending: 0,
        processing: 0,
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
        completed: 0,
        overdue: 0,
      }
    }

    const result = stats[0]
    return {
      pending: result.pending || 0,
      processing: result.processing || 0,
      completed: result.completed || 0,
      overdue: result.overdue || 0,
    }
  }
}
