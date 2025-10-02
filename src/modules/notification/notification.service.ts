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
import { SystemRole, ProjectRole } from '../../common/enums'

@Injectable()
export class NotificationService {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly db: DbService,
  ) {
    this.gateway.setNotificationService(this)
  }

  private async sendNotificationToUser(userId: string, notificationData: any) {
    console.log('📤 sendNotificationToUser called with:', {
      userId,
      type: notificationData.type,
      actorName: notificationData.actorName,
      actorId: notificationData.actorId,
      data: notificationData.data,
    })

    const savedNotification = await this.createNotification({
      recipientId: userId,
      actorId: notificationData.actorId,
      actorName: notificationData.actorName,
      type: notificationData.type,
      data: notificationData.data,
    })

    const notificationToSend = {
      ...savedNotification.toObject(),
    }

    console.log('📤 Sending notification to frontend:', notificationToSend)

    // Check if gateway is available before sending
    if (this.gateway && typeof this.gateway.sendNotification === 'function') {
      this.gateway.sendNotification(userId, notificationToSend)
      console.log('✅ Notification sent via WebSocket')
    } else {
      console.warn(
        '⚠️ Gateway not available, notification saved but not sent via WebSocket',
      )
    }

    return savedNotification
  }

  async createNotification(payload: CreateNotificationDto) {
    return await this.db.notification.create({
      recipientId: payload.recipientId,
      actorId: payload.actorId,
      actorName: payload.actorName,
      type: payload.type,
      data: payload.data,
    })
  }

  async findMany(
    query: QueryNotificationDto,
    userId?: string,
  ): Promise<{ data: Notification[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search, spaceId } = query

    let where: any = {}
    if (search) {
      where.$or = [{ type: { $regex: search, $options: 'i' } }]
    }

    // If userId is provided, get notifications where user is recipient OR actor
    if (userId) {
      const userCondition = {
        $or: [{ recipientId: userId }, { actorId: userId }],
      }
      where = search ? { $and: [where, userCondition] } : userCondition
    }

    // Filter by spaceId if provided
    if (spaceId) {
      console.log(`🔍 Filtering notifications by spaceId: ${spaceId}`)
      const spaceCondition = {
        $or: [{ 'data.spaceId': spaceId }, { 'data.space': spaceId }],
      }
      where = where.$and
        ? { $and: [...where.$and, spaceCondition] }
        : Object.keys(where).length > 0
          ? { $and: [where, spaceCondition] }
          : spaceCondition

      console.log(`🔍 Final query condition:`, JSON.stringify(where, null, 2))
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

    console.log(
      `📊 Query results: Found ${data.length} notifications out of ${total} total`,
    )
    if (spaceId) {
      console.log(
        `📊 Notifications data structure sample:`,
        data.slice(0, 2).map((n) => ({
          id: n._id,
          type: n.type,
          data: n.data,
        })),
      )
    }

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
  }

  async getDebugNotifications(userId: string) {
    const notifications = await this.db.notification
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(20)

    return {
      total: notifications.length,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        data: n.data,
        createdAt: n.createdAt,
        isRead: n.isRead,
      })),
    }
  }

  async notifyCreateSpace(userId: string, space: any, actor?: any) {
    // Get actor user info
    let actorUser = actor
    if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    const actorId = actorUser?._id || actorUser?.sub
    const actorName = actorUser?.fullName || actorUser?.email || 'Someone'

    await this.sendNotificationToUser(userId, {
      type: NotificationType.CREATE_SPACE,
      actorId: actorId?.toString(),
      actorName: actorName,
      data: {
        spaceId: space._id.toString(),
        spaceName: space.name,
      },
    })
  }

  async notifyUpdatedSpace(spaceId: string, actor: any) {
    // Get actor user info
    let actorUser = actor
    if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'
    const members = await this.db.spaceMember.find({ space: spaceId })

    for (const member of members) {
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.UPDATE_SPACE,
          actorName: actorName,
          data: {
            actorId: actorId.toString(),
            spaceId: spaceId,
          },
        })
      }
    }
  }

  async notifyDeletedSpace(spaceId: string, actor: any, spaceName: string) {
    // Nếu actor không tồn tại thì bỏ qua
    // if (!actor) return;

    // Lấy thông tin user nếu actor là AuthPayload (có sub nhưng không có _id)
    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Bỏ qua nếu không tìm thấy user
      }
    }

    const actorId = actorUser._id || actorUser.sub // ID của actor
    const members = await this.db.spaceMember.find({ space: spaceId })
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    for (const member of members) {
      // Chỉ gửi notification cho các thành viên khác, không gửi cho actor
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_SPACE,
          actorId: actorId.toString(),
          actorName: actorName,
          data: {
            spaceId,
            spaceName,
          },
        })
      }
    }
  }

  // Space Member Notifications
  async notifyMemberAddedToSpace(
    spaceId: string,
    memberId: string,
    actor: any,
  ) {
    // Get actor user info
    let actorUser = actor
    if (typeof actor === 'string') {
      actorUser = await this.db.user.findById(actor)
    } else if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    if (!actorUser) {
      return // Skip if actor not found
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    const [space, members, newMember] = await Promise.all([
      this.db.space.findById(spaceId),
      this.db.spaceMember.find({ space: spaceId }),
      this.db.user.findById(memberId),
    ])

    if (!space) {
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    }

    const newMemberName =
      newMember?.fullName || newMember?.email || 'Unknown User'

    // Only notify the new member that they were added (not all other members)
    await this.sendNotificationToUser(memberId, {
      type: NotificationType.YOU_WERE_ADDED_TO_SPACE,
      actorId: actorId.toString(),
      actorName: actorName,
      data: {
        actorId: actorId.toString(),
        spaceId: spaceId,
        spaceName: space.name,
        newMemberId: memberId,
        newMemberName: newMemberName,
      },
    })

    console.log(
      `✅ Space member addition notification sent only to new member: ${newMemberName}`,
    )
  }

  async notifyMemberRemovedFromSpace(
    spaceId: string,
    removedMemberId: string,
    actor: any,
  ) {
    // Get actor user info
    let actorUser = actor
    if (typeof actor === 'string') {
      actorUser = await this.db.user.findById(actor)
    } else if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName

    const [space, members, removedMember] = await Promise.all([
      this.db.space.findById(spaceId),
      this.db.spaceMember.find({ space: spaceId }),
      this.db.user.findById(removedMemberId),
    ])

    if (!space) {
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    }

    const removedMemberName = removedMember?.fullName

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actorId.toString() &&
        member.user.toString() !== removedMemberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.REMOVE_MEMBER_FROM_SPACE,
          actorName: actorName,
          data: {
            spaceId: spaceId,
            spaceName: space.name,
            removedMemberId: removedMemberId,
            removedMemberName: removedMemberName,
          },
        })
      }
    }
  }

  // Project Notifications

  async notifyUpdatedProject(projectId: string, actor: any) {
    // Get actor user info
    let actorUser = actor
    if (typeof actor === 'string') {
      actorUser = await this.db.user.findById(actor)
    } else if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    if (!actorUser) {
      return // Skip if actor not found
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'
    const project = await this.db.project.findById(projectId)
    const members = await this.db.projectMember.find({ project: projectId })

    for (const member of members) {
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.UPDATE_PROJECT,
          actorName: actorName,
          data: {
            actorId: actorId.toString(),
            projectId: projectId,
            projectName: project?.name || 'Unknown Project',
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
    // If actor is undefined or null, skip notifications
    if (!actor) {
      return
    }

    // Get actor user info if actor is AuthPayload (has sub property)
    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const members = await this.db.projectMember.find({ project: projectId })
    const actorId = actorUser._id || actorUser.sub

    for (const member of members) {
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_PROJECT,
          actorId: actorId.toString(),
          actorName: actorUser.fullName || actorUser.email || 'Unknown User',
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
    // Get actor user info
    let actorUser = actor
    if (typeof actor === 'string') {
      actorUser = await this.db.user.findById(actor)
    } else if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    if (!actorUser) {
      return // Skip if actor not found
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    const [project, members, newMember] = await Promise.all([
      this.db.project.findById(projectId),
      this.db.projectMember.find({ project: projectId }),
      this.db.user.findById(newMemberId),
    ])

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`)
    }

    const newMemberName = newMember?.fullName

    // Only notify the new member that they were added (not all other members)
    await this.sendNotificationToUser(newMemberId, {
      type: NotificationType.YOU_WERE_ADDED_TO_PROJECT,
      actorId: actorId.toString(),
      actorName: actorName,
      data: {
        actorId: actorId.toString(),
        projectId: projectId,
        projectName: project.name,
        newMemberId: newMemberId,
        newMemberName: newMemberName,
      },
    })

    console.log(
      `✅ Project member addition notification sent only to new member: ${newMemberName}`,
    )
  }

  async notifyMemberRemovedFromProject(
    projectId: string,
    removedMemberId: string,
    actor: any,
  ) {
    // Get actor user info
    let actorUser = actor
    if (typeof actor === 'string') {
      actorUser = await this.db.user.findById(actor)
    } else if (actor?.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
    }

    if (!actorUser) {
      return // Skip if actor not found
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    const [project, members, removedMember] = await Promise.all([
      this.db.project.findById(projectId),
      this.db.projectMember.find({ project: projectId }),
      this.db.user.findById(removedMemberId),
    ])

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`)
    }

    const removedMemberName =
      removedMember?.fullName || removedMember?.email || 'Unknown User'

    // Notify the removed member
    await this.sendNotificationToUser(removedMemberId, {
      type: NotificationType.YOU_WERE_REMOVED_FROM_PROJECT,
      actorName: actorName,
      data: {
        projectId: projectId,
        projectName: project.name,
      },
    })

    // Notify other members
    for (const member of members) {
      if (
        member.user.toString() !== actorId.toString() &&
        member.user.toString() !== removedMemberId
      ) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.REMOVE_MEMBER_FROM_PROJECT,
          actorName: actorName,
          data: {
            actorId: actorId.toString(),
            projectId: projectId,
            projectName: project.name,
            removedMemberId: removedMemberId,
            removedMemberName: removedMemberName,
          },
        })
      }
    }
  }

  // Task Notifications
  async notifyCreateTask(task: any, actor: any) {
    if (!actor) {
      return
    }

    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Only notify assignee if different from creator (not all project members)
    if (task.assignee && task.assignee.toString() !== actorId.toString()) {
      const assigneeUser = await this.db.user.findById(task.assignee)
      const assigneeName =
        assigneeUser?.fullName || assigneeUser?.email || 'Unknown User'

      await this.sendNotificationToUser(task.assignee.toString(), {
        type: NotificationType.YOU_WERE_ASSIGNED_TASK,
        actorId: actorId.toString(),
        actorName: actorName,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.name,
          projectId: task.project.toString(),
          spaceId: task.space.toString(),
          assigneeId: task.assignee?.toString(),
          assigneeName: assigneeName,
        },
      })

      console.log(
        `✅ Task creation notification sent only to assignee: ${assigneeName}`,
      )
    } else {
      console.log(
        `ℹ️ No task creation notification sent (assignee is creator or no assignee)`,
      )
    }
  }

  async notifyUpdatedTask(task: any, actor: any, changes: any) {
    if (!actor) {
      return
    }

    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Logic:
    // - If assignee updates → notify owner
    // - If owner updates → notify assignee
    // - If someone else updates → notify both owner and assignee

    const notificationsToSend: Array<{ recipientId: string; reason: string }> =
      []

    // If actor is assignee, notify owner
    if (
      task.assignee &&
      task.assignee.toString() === actorId.toString() &&
      task.owner.toString() !== actorId.toString()
    ) {
      notificationsToSend.push({
        recipientId: task.owner.toString(),
        reason: 'assignee updated task, notifying owner',
      })
    }
    // If actor is owner, notify assignee
    else if (
      task.owner.toString() === actorId.toString() &&
      task.assignee &&
      task.assignee.toString() !== actorId.toString()
    ) {
      notificationsToSend.push({
        recipientId: task.assignee.toString(),
        reason: 'owner updated task, notifying assignee',
      })
    }
    // If actor is neither owner nor assignee, notify both
    else if (
      task.owner.toString() !== actorId.toString() &&
      (!task.assignee || task.assignee.toString() !== actorId.toString())
    ) {
      if (task.owner) {
        notificationsToSend.push({
          recipientId: task.owner.toString(),
          reason: 'third party updated task, notifying owner',
        })
      }
      if (task.assignee && task.assignee.toString() !== task.owner.toString()) {
        notificationsToSend.push({
          recipientId: task.assignee.toString(),
          reason: 'third party updated task, notifying assignee',
        })
      }
    }

    // Send notifications
    for (const notification of notificationsToSend) {
      await this.sendNotificationToUser(notification.recipientId, {
        type: NotificationType.UPDATE_TASK,
        actorId: actorId.toString(),
        actorName: actorName,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.name,
          projectId: task.project.toString(),
          spaceId: task.space.toString(),
          changes: changes,
        },
      })

      console.log(`✅ Task update notification sent: ${notification.reason}`)
    }

    if (notificationsToSend.length === 0) {
      console.log(
        `ℹ️ No task update notifications sent (actor is both owner and assignee, or no owner/assignee)`,
      )
    }
  }

  async notifyDeletedTask(
    taskId: string,
    projectId: string,
    spaceId: string,
    actor: any,
  ) {
    // If actor is undefined or null, skip notifications
    if (!actor) {
      return
    }

    // Get actor user info if actor is AuthPayload (has sub property)
    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const projectMembers = await this.db.projectMember.find({
      project: projectId,
    })

    const actorId = actorUser._id || actorUser.sub

    for (const member of projectMembers) {
      if (member.user.toString() !== actorId.toString()) {
        await this.sendNotificationToUser(member.user.toString(), {
          type: NotificationType.DELETE_TASK,
          actorId: actorId.toString(),
          actorName: actorUser.fullName || actorUser.email || 'Unknown User',
          data: {
            taskId,
            projectId,
            spaceId,
          },
        })
      }
    }
  }

  async notifyTaskStatusChanged(task: any, newStatus: string, actor: any) {
    // If actor is undefined or null, skip notifications
    if (!actor) {
      return
    }

    // Get actor user info if actor is AuthPayload (has sub property)
    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return // Skip if user not found
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Logic:
    // - If assignee changes status → notify owner
    // - If owner changes status → notify assignee
    // - If someone else changes status → notify both owner and assignee

    const notificationsToSend: Array<{ recipientId: string; reason: string }> =
      []

    // If actor is assignee, notify owner
    if (
      task.assignee &&
      task.assignee.toString() === actorId.toString() &&
      task.owner.toString() !== actorId.toString()
    ) {
      notificationsToSend.push({
        recipientId: task.owner.toString(),
        reason: 'assignee changed task status, notifying owner',
      })
    }
    // If actor is owner, notify assignee
    else if (
      task.owner.toString() === actorId.toString() &&
      task.assignee &&
      task.assignee.toString() !== actorId.toString()
    ) {
      notificationsToSend.push({
        recipientId: task.assignee.toString(),
        reason: 'owner changed task status, notifying assignee',
      })
    }
    // If actor is neither owner nor assignee, notify both
    else if (
      task.owner.toString() !== actorId.toString() &&
      (!task.assignee || task.assignee.toString() !== actorId.toString())
    ) {
      if (task.owner) {
        notificationsToSend.push({
          recipientId: task.owner.toString(),
          reason: 'third party changed task status, notifying owner',
        })
      }
      if (task.assignee && task.assignee.toString() !== task.owner.toString()) {
        notificationsToSend.push({
          recipientId: task.assignee.toString(),
          reason: 'third party changed task status, notifying assignee',
        })
      }
    }

    // Send notifications
    for (const notification of notificationsToSend) {
      await this.sendNotificationToUser(notification.recipientId, {
        type: NotificationType.TASK_STATUS_CHANGED,
        actorId: actorId.toString(),
        actorName: actorName,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.name,
          projectId: task.project.toString(),
          spaceId: task.space.toString(),
          newStatus: newStatus,
        },
      })

      console.log(
        `✅ Task status change notification sent: ${notification.reason}`,
      )
    }

    if (notificationsToSend.length === 0) {
      console.log(
        `ℹ️ No task status change notifications sent (actor is both owner and assignee, or no owner/assignee)`,
      )
    }
  }

  async getUnreadNotifications(userId: string) {
    // Always return notifications where user is recipient OR actor
    // This way:
    // - Members see notifications they receive (recipientId)
    // - Owners see notifications they receive (recipientId) + notifications from their actions (actorId)
    return this.db.notification
      .find({
        $or: [
          { recipientId: userId, isRead: false },
          { actorId: userId, isRead: false },
        ],
      })
      .sort({ createdAt: -1 })
  }

  async sendPendingNotifications(userId: string) {
    try {
      console.log(`📤 Sending pending notifications to user ${userId}`)

      // Only send recent unread notifications (last 24 hours) to avoid spam
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const recentUnreadNotifications = await this.db.notification
        .find({
          recipientId: userId,
          isRead: false,
          createdAt: { $gte: oneDayAgo },
        })
        .sort({ createdAt: -1 })
        .limit(10) // Limit to 10 most recent

      console.log(
        `📋 Found ${recentUnreadNotifications.length} pending notifications for user ${userId}`,
      )

      for (const notification of recentUnreadNotifications) {
        // Get actor name if actorId exists
        let actorName = 'Someone'
        if (notification.actorId) {
          try {
            console.log(`🔍 Looking up actor with ID: ${notification.actorId}`)
            const actor = await this.db.user.findById(notification.actorId)
            console.log(`🔍 Found actor:`, {
              id: actor?._id,
              fullName: actor?.fullName,
              email: actor?.email,
            })
            actorName = actor?.fullName || actor?.email || 'Someone'
          } catch (error) {
            console.error('❌ Error fetching actor for notification:', error)
            actorName = 'Someone'
          }
        } else {
          console.log(
            `⚠️ No actorId found for notification ${notification._id}`,
          )
        }

        console.log(`📤 Final actorName for pending notification: ${actorName}`)

        const notificationToSend = {
          ...notification.toObject(),
          actorName: actorName,
        }

        // Check if gateway is available before sending
        if (
          this.gateway &&
          typeof this.gateway.sendNotification === 'function'
        ) {
          this.gateway.sendNotification(userId, notificationToSend)
        } else {
          console.warn('⚠️ Gateway not available for pending notification')
        }
      }

      console.log(
        `✅ Sent ${recentUnreadNotifications.length} pending notifications to user ${userId}`,
      )
    } catch (error) {
      console.error('❌ Error sending pending notifications:', error)
    }
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

  async notifyTaskPendingApproval(task: any, actor: any) {
    if (!actor) {
      return
    }

    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Find all PMs and project owners who can approve this task
    const approvers: string[] = []

    // Get all PMs in the system
    const pms = await this.db.user.find({
      role: SystemRole.PROJECT_MANAGER,
      isActive: true,
    })
    approvers.push(...pms.map((pm) => pm._id.toString()))

    // Get project owners
    const projectOwners = await this.db.projectMember
      .find({
        project: task.project,
        role: ProjectRole.OWNER,
      })
      .populate('user')

    for (const owner of projectOwners) {
      const userId = (owner.user as any)?._id?.toString()
      if (userId && !approvers.includes(userId)) {
        approvers.push(userId)
      }
    }

    // Send notification to all approvers (except the actor)
    for (const approverId of approvers) {
      if (approverId !== actorId.toString()) {
        await this.sendNotificationToUser(approverId, {
          type: NotificationType.TASK_PENDING_APPROVAL,
          actorId: actorId.toString(),
          actorName: actorName,
          data: {
            taskId: task._id.toString(),
            taskTitle: task.name,
            projectId: task.project.toString(),
            spaceId: task.space.toString(),
            assigneeId: task.assignee?.toString(),
            assigneeName: actorName,
          },
        })
      }
    }

    console.log(
      `✅ Task pending approval notifications sent to ${approvers.length} approvers`,
    )
  }

  async notifyTaskApproved(task: any, actor: any) {
    if (!actor || !task.assignee) {
      return
    }

    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Send notification to assignee
    await this.sendNotificationToUser(task.assignee.toString(), {
      type: NotificationType.TASK_APPROVED,
      actorId: actorId.toString(),
      actorName: actorName,
      data: {
        taskId: task._id.toString(),
        taskTitle: task.name,
        projectId: task.project.toString(),
        spaceId: task.space.toString(),
        reviewComment: task.reviewComment,
      },
    })

    console.log(`✅ Task approved notification sent to assignee`)
  }

  async notifyTaskRejected(task: any, actor: any, reason: string) {
    if (!actor || !task.assignee) {
      return
    }

    let actorUser = actor
    if (actor.sub && !actor._id) {
      actorUser = await this.db.user.findById(actor.sub)
      if (!actorUser) {
        return
      }
    }

    const actorId = actorUser._id || actorUser.sub
    const actorName = actorUser.fullName || actorUser.email || 'Unknown User'

    // Send notification to assignee
    await this.sendNotificationToUser(task.assignee.toString(), {
      type: NotificationType.TASK_REJECTED,
      actorId: actorId.toString(),
      actorName: actorName,
      data: {
        taskId: task._id.toString(),
        taskTitle: task.name,
        projectId: task.project.toString(),
        spaceId: task.space.toString(),
        reason: reason,
        reviewComment: task.reviewComment,
      },
    })

    console.log(`✅ Task rejected notification sent to assignee`)
  }
}
