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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  CreateNotificationDto,
  QueryNotificationDto,
} from './dtos/create-notification'

@Controller('notification')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly nodeMailer: MailerService,
    private readonly notificationService: NotificationService,
  ) {}

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

  @Get()
  @ApiOperation({ summary: 'Get all notifications with pagination' })
  @UseGuards(JwtAuthGuard)
  async getAllNotifications(
    @AuthUser() payload: AuthPayload,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findMany(query, payload.sub)
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications for current user' })
  @UseGuards(JwtAuthGuard)
  async getUnreadNotifications(@AuthUser() payload: AuthPayload) {
    return await this.notificationService.getUnreadNotifications(payload.sub)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('id') notificationId: string,
    @AuthUser() payload: AuthPayload,
  ) {
    return await this.notificationService.markNotificationAsRead(notificationId)
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@AuthUser() payload: AuthPayload) {
    await this.notificationService.markAllNotificationsAsRead(payload.sub)
    return {
      message: 'All notifications marked as read',
    }
  }

  @Get('debug')
  @ApiOperation({ summary: 'Debug: Get all notifications with data structure' })
  @UseGuards(JwtAuthGuard)
  async debugNotifications(@AuthUser() payload: AuthPayload) {
    return await this.notificationService.getDebugNotifications(payload.sub)
  }
}
