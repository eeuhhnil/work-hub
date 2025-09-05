import { Controller } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'
import { EventPattern, Payload } from '@nestjs/microservices'

@Controller('notification')
export class NotificationController {
  constructor(private readonly nodeMailer: MailerService) {}

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
}
