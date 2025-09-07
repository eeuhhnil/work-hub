import { Injectable } from '@nestjs/common'
import { DbService } from '../../common/db/db.service'
import { Task } from '../../common/db/models/task.model'
import { IdLike } from '../../common/types'
import { QueryTaskDto } from './dtos'
import { FilterQuery } from 'mongoose'
import { NotificationService } from '../notification/notification.service'

@Injectable()
export class TaskService {
  constructor(
    private readonly db: DbService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOne(payload: Omit<Task, '_id'>, actor?: any) {
    const task = await this.db.task.create(payload)

    // Send notification if actor is provided
    if (actor) {
      await this.notificationService.notifyCreateTask(task, actor)
    }

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
    if (query.space) {
      filter.space = query.space
    }

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
    if (actor) {
      await this.notificationService.notifyDeletedTask(
        taskId.toString(),
        task.project.toString(),
        task.space.toString(),
        actor,
      )
    }

    return this.db.task.deleteOne({ _id: taskId })
  }
}
