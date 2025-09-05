import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dtos/register-local.dto'
import { LocalAuthGuard } from './guards'
import { LoginLocalDto } from './dtos/login-local.dto'
import {Public} from "./decorators";

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
    return this.authService.loginLocal(req.user)
  }
}
