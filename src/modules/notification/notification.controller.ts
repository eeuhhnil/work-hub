import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { EventPattern, Payload } from '@nestjs/microservices'
import { NotificationService } from './notification.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger'
import {
  CreateNotificationDto,
  QueryNotificationDto,
} from './dtos/create-notification'

@Controller('notification')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly nodeMailer: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

  @EventPattern('user_registration')
  async handleUserRegistration(@Payload() data: any) {
    await this.nodeMailer.sendMail({
      to: data.email,
      subject: 'Verify Your Account - WorkHub',
      html: `
        <h2>Welcome to WorkHub, ${data.fullName}!</h2>
        <p>Your verification code is: <strong>${data.otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    })
  }

  @EventPattern('password_reset')
  async handlePasswordReset(@Payload() data: any) {
    await this.nodeMailer.sendMail({
      to: data.email,
      subject: 'Password Reset - WorkHub',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${data.fullName},</p>
        <p>You have requested to reset your password. Your verification code is: <strong>${data.otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this password reset, please ignore this email.</p>
      `,
    })
  }

  // Lấy tất cả thông báo (có phân trang)
  @Get()
  async getAllNotifications(
    @AuthUser() payload: AuthPayload,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findMany(query)
  }

  // Lấy danh sách thông báo chưa đọc
  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadNotifications(@AuthUser() payload: AuthPayload) {
    const notifications = await this.notificationService.getUnreadNotifications(
      payload.sub,
    )
    return {
      success: true,
      data: notifications,
      count: notifications.length,
    }
  }

  // Đánh dấu thông báo đã đọc
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id') notificationId: string,
    @AuthUser() payload: AuthPayload,
  ) {
    const notification =
      await this.notificationService.markNotificationAsRead(notificationId)
    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    }
  }

  // Đánh dấu tất cả thông báo đã đọc
  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@AuthUser() payload: AuthPayload) {
    await this.notificationService.markAllNotificationsAsRead(payload.sub)
    return {
      success: true,
      message: 'All notifications marked as read',
    }
  }

  // Tạo thông báo mới
  @Post('create')
  async createNotification(@Body() body: CreateNotificationDto) {
    const notification = await this.notificationService.createNotification(body)
    return {
      statusCode: 201,
      message: 'SUCCESS',
      data: notification, // ✅ trả về document đầy đủ
    }
  }

  // Test endpoint để trigger notification
  // @Post('test')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       userId: { type: 'string', description: 'ID của user nhận notification' },
  //       message: { type: 'string', description: 'Nội dung thông báo' },
  //       type: { type: 'string', description: 'Loại notification (optional)', example: 'TEST' }
  //     },
  //     required: ['userId', 'message']
  //   }
  // })
  // async sendTestNotification(@Body() body: { userId: string; message: string; type?: string }) {
  //   const { userId, message, type = 'TEST' } = body
  //
  //   // Sử dụng method mới để tạo và gửi notification
  //   const notification = await this.notificationService.createNotification(userId, type, {
  //     message: message,
  //     timestamp: new Date().toISOString(),
  //     test: true
  //   })
  //
  //   return {
  //     success: true,
  //     message: `Test notification created and sent to user ${userId}`,
  //     data: { userId, message, type, notification }
  //   }
  // }
}
