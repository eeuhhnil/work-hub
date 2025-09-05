import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { UserService } from '../user/user.service'
import { RegisterDto } from './dtos/register-local.dto'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserDocument } from '../user/schemas/user.schema'
import { SessionDocument } from '../session/schemas/session.schema'
import { SessionService } from '../session/session.service'
import { UAParser } from 'ua-parser-js'
import { ClientProxy } from '@nestjs/microservices'
import { OtpService } from '../otp/otp.service'
import { OtpType } from '../otp/enums/otp-types.constant'
import { VerifyOtpDto } from '../otp/dtos'
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto'
import { ChangePasswordDto } from './dtos/change-password.dto'
import { VerifyPasswordResetDto } from '../otp/dtos'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  async registerLocal(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto
    const user = await this.userService.checkUserExists({ email })
    if (user) throw new ConflictException('USER_EXISTS')

    const newUser = await this.userService.create({
      email,
      username: await this.generateUniqueUsername(fullName),
      password: bcrypt.hashSync(password, 10),
      fullName,
      isActive: false,
    })

    const otpRecord = await this.otpService.createOtp(newUser._id.toString())

    this.notificationClient.emit('user_registration', {
      email: newUser.email,
      fullName: newUser.fullName,
      otp: otpRecord.code,
    })

    return {
      message: 'Registration successful. Please check your email for OTP.',
    }
  }

  async verifyRegistrationOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp: code } = verifyOtpDto
    const user = await this.userService.findOne({ email })
    if (!user) throw new UnauthorizedException('User not found')

    const isValid = await this.otpService.verifyOtp(user._id.toString(), code, OtpType.REGISTRATION)
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP')

    // Activate user
    await this.userService.updateProfile(user._id.toString(), {
      isActive: true,
    })

    return { message: 'Account activated successfully' }
  }

  async loginLocal(user: UserDocument, req: any) {
    const clientInfo = this.getLoginInfo(req)

    const session = await this.sessionService.create({
      ...clientInfo,
      userId: user._id.toString(),
    })

    return this.generateToken(user, session)
  }

  async logout(token: string) {
    const payload: any = this.jwt.decode(token)

    const session = await this.sessionService.findOne({ _id: payload.jti })

    if (!session) {
      throw new UnauthorizedException('Invalid token')
    }

    await this.sessionService.deleteOne({ _id: session._id })
  }

  async logoutDevice(userId: string, sessionId: string) {
    const session = await this.sessionService.findOne({
      _id: sessionId,
      userId: userId,
    })

    if (!session) {
      throw new UnauthorizedException('Invalid token')
    }

    await this.sessionService.deleteOne({ _id: session._id })
  }

  async logoutAll(userId: string) {
    await this.sessionService.deleteMany({ userId: userId })
  }

  async generateToken(user: UserDocument, session: SessionDocument) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(
        {
          jti: session._id.toString(),
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      ),
      this.jwt.signAsync(
        {
          sub: user._id.toString(),
          jti: session._id.toString(),
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ])

    return { access_token, refresh_token }
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
    const { email } = requestPasswordResetDto
    const user = await this.userService.findOne({ email })
    if (!user) throw new UnauthorizedException('User not found')

    const otpRecord = await this.otpService.createOtp(
      user._id.toString(),
      OtpType.PASSWORD_RESET,
    )

    this.notificationClient.emit('password_reset', {
      email: user.email,
      fullName: user.fullName,
      otp: otpRecord.code,
    })

    return {
      message:
        'Password reset OTP sent to your email. Please check your inbox.',
    }
  }

  async verifyPasswordReset(dto: VerifyPasswordResetDto) {
    const { email, otp, newPassword } = dto

    const user = await this.userService.findOne({ email })
    if (!user) throw new UnauthorizedException('User not found')

    const isValid = await this.otpService.verifyOtp(user._id.toString(), otp, OtpType.PASSWORD_RESET)
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP')

    user.password = bcrypt.hashSync(newPassword, 10)

    await user.save()

    return { message: 'Password reset successfully' }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userService.findOne(
      { _id: userId },
      { select: '+password' },
    )

    if (!user || !user.password)
      throw new UnauthorizedException('User not found')

    if (!bcrypt.compareSync(changePasswordDto.currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect')
    }

    user.password = bcrypt.hashSync(changePasswordDto.newPassword, 10)

    await user.save()

    return { message: 'Password changed successfully' }
  }
  private async generateUniqueUsername(fullName: string): Promise<string> {
    let username: string
    while (true) {
      username = await this.generateRandomName(fullName)
      const existingUser = await this.userService.checkUserExists({ username })
      if (!existingUser) break
    }

    return username
  }

  private async generateRandomName(baseName: string): Promise<string> {
    const sanitizedBaseName = this.slugify(baseName)
    const randomSuffix = this.generateRandomSuffix(6)
    return `${sanitizedBaseName}-${randomSuffix}`
  }

  private generateRandomSuffix(length: number): string {
    const charset =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length)
      result += charset[randomIndex]
    }
    return result
  }

  private slugify(text: string): string {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  private getLoginInfo(req: any) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      ''

    const userAgent = req.headers['user-agent'] || ''
    const parser = new UAParser(userAgent)
    const result = parser.getResult()

    return {
      ip,
      deviceName: result.device.model || 'Desktop',
      browser: result.browser.name || 'Unknown',
      os: result.os.name || 'Unknown',
      // userAgent,
    }
  }

  async validateGoogleUser(
    payload: {
      googleId: string
      email: string
      fullName: string
      avatar?: string
    },
    req: any,
  ) {
    let user = await this.userService.findOne({ email: payload.email })

    if (!user) {
      user = await this.userService.create({
        email: payload.email,
        fullName: payload.fullName,
        avatar: payload.avatar,
        googleId: payload.googleId,
        username: await this.generateUniqueUsername(payload.fullName),
      })
    } else if (!user.googleId) {
      user.googleId = payload.googleId
      await user.save()
    }

    const clientInfo = this.getLoginInfo(req)

    const session = await this.sessionService.create({
      ...clientInfo,
      userId: user._id.toString(),
    })

    return this.generateToken(user, session)
  }
}
