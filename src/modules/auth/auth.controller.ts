import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dtos/register-local.dto'
import { LocalAuthGuard } from './guards'
import { LoginLocalDto } from './dtos/login-local.dto'
import { AuthUser, Public } from './decorators'
import type { AuthPayload } from './types'
import { AuthGuard } from '@nestjs/passport'
import { VerifyOtpDto, VerifyPasswordResetDto } from '../otp/dtos'
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto'
import { ChangePasswordDto } from './dtos/change-password.dto'

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register user local' })
  async handleRegister(@Body() payload: RegisterDto) {
    return this.authService.registerLocal(payload)
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login user local' })
  async handleLogin(@Body() payload: LoginLocalDto, @Req() req) {
    return this.authService.loginLocal(req.user, req)
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async auth() {}

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req) {
    if (!req.user)
      throw new UnauthorizedException('Google authentication failed')

    return req.user
  }

  @Post('verify-otp')
  @Public()
  @ApiOperation({ summary: 'Verify otp' })
  @ApiOkResponse({ description: 'Verify otp successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyRegistrationOtp(verifyOtpDto)
  }

  @Post('/logout')
  @ApiOperation({ summary: 'Logout' })
  @ApiOkResponse({ description: 'Logout successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async logout(@Req() req) {
    const authHeader = req.headers.authorization
    const accessToken: string | undefined = authHeader?.split(' ')[1]
    if (!accessToken) {
      throw new NotFoundException('No access token found in request')
    }

    await this.authService.logout(accessToken)

    return { message: 'Logout successfully' }
  }

  @Post('logout-device')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Logout-device' })
  @ApiOkResponse({ description: 'Logout successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async logoutDevice(
    @AuthUser() payload: AuthPayload,
    @Body('sessionId') sessionId: string,
  ) {
    await this.authService.logoutDevice(payload.sub, sessionId)
    return { message: 'Logout successfully' }
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Logout-all' })
  @ApiOkResponse({ description: 'Logout successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async logoutAll(@AuthUser() payload: AuthPayload) {
    await this.authService.logoutAll(payload.sub)
    return { message: 'Logout successfully' }
  }

  @Public()
  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiOkResponse({ description: 'Password reset OTP sent successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async requestPasswordReset(
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return this.authService.requestPasswordReset(requestPasswordResetDto)
  }

  @Post('verify-otp-password-reset')
  @Public()
  @ApiOperation({ summary: 'Verify otp' })
  @ApiOkResponse({ description: 'Verify otp successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async verifyOtpPasswordReset(@Body() dto: VerifyPasswordResetDto) {
    return this.authService.verifyPasswordReset(dto)
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password with OTP' })
  @ApiOkResponse({ description: 'Password changed successfully.' })
  @ApiConflictResponse({ description: 'Internal Server Error.' })
  async changePassword(
    @AuthUser() payload: AuthPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(payload.sub, changePasswordDto)
  }
}
