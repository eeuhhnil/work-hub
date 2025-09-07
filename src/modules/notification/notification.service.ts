import { Injectable, NotFoundException } from '@nestjs/common'
import { NotificationGateway } from './notification.gateway'
import { NotificationType } from './types'
import { DbService } from '../../common/db/db.service'
import {
  CreateNotificationDto,
  QueryNotificationDto,
} from './dtos/create-notification'
import { PaginationMetadata } from '../../common/interceptors'
import { Notification } from '../../common/db/models'
import { IdLike } from '../../common/types'

@Injectable()
export class NotificationService {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly db: DbService,
  ) {
    this.gateway.setNotificationService(this)
  }

  private async sendNotificationToUser(userId: string, notificationData: any) {
    const savedNotification = await this.createNotification({
      recipientId: userId,
      type: notificationData.type,
      data: notificationData.data,
    })

    this.gateway.sendNotification(userId, notificationData)

    return savedNotification
  }

  async createNotification(payload: CreateNotificationDto) {
    return await this.db.notification.create({
      recipientId: payload.recipientId,
      type: payload.type,
      data: payload.data,
    })
  }

  async findMany(
    query: QueryNotificationDto,
  ): Promise<{ data: Notification[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search } = query

    const where: any = {}
    if (search) {
      where.$or = [{ type: { $regex: search, $options: 'i' } }]
    }

    // lấy dữ liệu và tổng số
    const [data, total] = await Promise.all([
      this.db.notification
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.db.notification.countDocuments(where),
    ])

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
  }

  async notifyCreateSpace(userId: string, space: any) {
    await this.sendNotificationToUser(userId, {
      type: NotificationType.CREATE_SPACE,
      data: {
        spaceId: space._id.toString(),
        spaceName: space.name,
      },
    })
  }

  async notifyUpdatedSpace(spaceId: string, actorId: string) {
    const members = await this.db.spaceMember.find({ space: spaceId })

    for (const member of members) {
      if (member.user.toString() !== actorId) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.UPDATE_SPACE,
          data: {
            actorId: actorId,
            spaceId: spaceId,
          },
        })
      }
    }
  }

  async notifyDeletedSpace(spaceId: string, actor: any, spaceName: string) {
    const members = await this.db.spaceMember.find({ space: spaceId })

    for (const member of members) {
      if (member.user.toString() !== actor._id.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_SPACE,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            spaceId: spaceId,
            spaceName: spaceName,
          },
        })
      }
    }
  }

  // Space Member Notifications
  async notifyMemberAddedToSpace(
    spaceId: string,
    memberId: string,
    actorId: string,
  ) {
    const [space, members] = await Promise.all([
      this.db.space.findById(spaceId),
      this.db.spaceMember.find({ space: spaceId }),
    ])

    if (!space) {
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    }

    // Notify the new member
    await this.sendNotificationToUser(memberId, {
      type: NotificationType.YOU_WERE_ADDED_TO_SPACE,
      data: {
        actorId: actorId.toString(),
        spaceId: space._id.toString(),
        spaceName: space.name,
      },
    })

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actorId &&
        member.user.toString() !== memberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.ADD_MEMBER_TO_SPACE,
          data: {
            actorId: actorId.toString(),
            spaceId: spaceId,
            spaceName: space.name,
            newMemberId: memberId,
          },
        })
      }
    }
  }

  async notifyMemberRemovedFromSpace(
    spaceId: string,
    removedMemberId: string,
    actorId: string,
  ) {
    const [space, members] = await Promise.all([
      this.db.space.findById(spaceId),
      this.db.spaceMember.find({ space: spaceId }),
    ])

    if (!space) {
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    }

    // Notify the removed member
    await this.sendNotificationToUser(removedMemberId, {
      type: NotificationType.YOU_WERE_REMOVED_FROM_SPACE,
      data: {
        spaceId: spaceId,
        spaceName: space.name,
      },
    })

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actorId.toString() &&
        member.user.toString() !== removedMemberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.REMOVE_MEMBER_FROM_SPACE,
          actorId: actorId.toString(),
          data: {
            spaceId: spaceId,
            spaceName: space.name,
            removedMemberId: removedMemberId,
          },
        })
      }
    }
  }

  // Project Notifications
  async notifyCreateProject(userId: string, project: any) {
    await this.sendNotificationToUser(userId, {
      type: NotificationType.CREATE_PROJECT,
      data: {
        projectId: project._id.toString(),
        projectName: project.name,
      },
    })
  }

  async notifyUpdatedProject(projectId: string, actorId: string) {
    const members = await this.db.projectMember.find({ project: projectId })

    for (const member of members) {
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.UPDATE_PROJECT,
          actorId: actorId.toString(),
          data: {
            projectId: projectId,
          },
        })
      }
    }
  }

  async notifyDeletedProject(
    projectId: string,
    actor: any,
    projectName: string,
  ) {
    const members = await this.db.projectMember.find({ project: projectId })

    for (const member of members) {
      if (member.user.toString() !== actor._id.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_PROJECT,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            projectId: projectId,
            projectName: projectName,
          },
        })
      }
    }
  }

  // Project Member Notifications
  async notifyMemberAddedToProject(
    projectId: string,
    newMemberId: string,
    actor: any,
  ) {
    const [project, members] = await Promise.all([
      this.db.project.findById(projectId),
      this.db.projectMember.find({ project: projectId }),
    ])

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`)
    }

    // Notify the new member
    await this.sendNotificationToUser(newMemberId, {
      type: NotificationType.YOU_WERE_ADDED_TO_PROJECT,
      data: {
        projectId: project._id.toString(),
        projectName: project.name,
      },
    })

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actor._id.toString() &&
        member.user.toString() !== newMemberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.ADD_MEMBER_TO_PROJECT,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            projectId: projectId,
            projectName: project.name,
            newMemberId: newMemberId,
          },
        })
      }
    }
  }

  async notifyMemberRemovedFromProject(
    projectId: string,
    removedMemberId: string,
    actor: any,
  ) {
    const [project, members] = await Promise.all([
      this.db.project.findById(projectId),
      this.db.projectMember.find({ project: projectId }),
    ])

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`)
    }

    // Notify the removed member
    await this.sendNotificationToUser(removedMemberId, {
      type: NotificationType.YOU_WERE_REMOVED_FROM_PROJECT,
      data: {
        projectId: projectId,
        projectName: project.name,
      },
    })

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actor._id.toString() &&
        member.user.toString() !== removedMemberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.REMOVE_MEMBER_FROM_PROJECT,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            projectId: projectId,
            projectName: project.name,
            removedMemberId: removedMemberId,
          },
        })
      }
    }
  }

  // Task Notifications
  async notifyCreateTask(task: any, actor: any) {
    const [projectMembers, spaceMembers] = await Promise.all([
      this.db.projectMember.find({ project: task.project }),
      this.db.spaceMember.find({ space: task.space }),
    ])

    // Notify assignee if different from creator
    if (task.assignee && task.assignee.toString() !== actor._id.toString()) {
      await this.sendNotificationToUser(task.assignee.toString(), {
        type: NotificationType.YOU_WERE_ASSIGNED_TASK,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          projectId: task.project.toString(),
          spaceId: task.space.toString(),
        },
      })
    }

    // Notify project members
    for (const member of projectMembers) {
      if (
        member.user.toString() !== actor._id.toString() &&
        member.user.toString() !== task.assignee?.toString()
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.CREATE_TASK,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            taskId: task._id.toString(),
            taskTitle: task.title,
            projectId: task.project.toString(),
            spaceId: task.space.toString(),
            assigneeId: task.assignee?.toString(),
          },
        })
      }
    }
  }

  async notifyUpdatedTask(task: any, actor: any, changes: any) {
    const [projectMembers] = await Promise.all([
      this.db.projectMember.find({ project: task.project }),
    ])

    // Notify assignee if task was reassigned
    if (
      changes.assignee &&
      changes.assignee.toString() !== actor._id.toString()
    ) {
      await this.sendNotificationToUser(changes.assignee.toString(), {
        type: NotificationType.YOU_WERE_ASSIGNED_TASK,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          projectId: task.project.toString(),
          spaceId: task.space.toString(),
        },
      })
    }

    // Notify project members about task update
    for (const member of projectMembers) {
      if (member.user.toString() !== actor._id.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.UPDATE_TASK,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            taskId: task._id.toString(),
            taskTitle: task.title,
            projectId: task.project.toString(),
            spaceId: task.space.toString(),
            changes: changes,
          },
        })
      }
    }
  }

  async notifyDeletedTask(
    taskId: string,
    projectId: string,
    spaceId: string,
    actor: any,
  ) {
    const projectMembers = await this.db.projectMember.find({
      project: projectId,
    })

    for (const member of projectMembers) {
      if (member.user.toString() !== actor._id.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_TASK,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            taskId: taskId,
            projectId: projectId,
            spaceId: spaceId,
          },
        })
      }
    }
  }

  async notifyTaskStatusChanged(task: any, newStatus: string, actor: any) {
    const projectMembers = await this.db.projectMember.find({
      project: task.project,
    })

    for (const member of projectMembers) {
      if (member.user.toString() !== actor._id.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.TASK_STATUS_CHANGED,
          actorId: actor._id.toString(),
          actorName: actor.fullName,
          data: {
            taskId: task._id.toString(),
            taskTitle: task.title,
            projectId: task.project.toString(),
            spaceId: task.space.toString(),
            newStatus: newStatus,
          },
        })
      }
    }
  }

  async getUnreadNotifications(userId: string) {
    return this.db.notification.find({ recipientId: userId, isRead: false })
  }

  async markNotificationAsRead(notificationId: string) {
    return this.db.notification.findOneAndUpdate(
      { _id: notificationId },
      { isRead: true, readAt: new Date() },
      { new: true },
    )
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.db.notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    )
  }

  // async cleanupOldNotifications(daysOld: number = 30) {
  //   const cutoffDate = new Date()
  //   cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  //
  //   return this.db.notification.deleteMany({
  //     createdAt: { $lt: cutoffDate },
  //     isRead: true,
  //   })
  // }
}
