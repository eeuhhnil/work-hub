import { ConflictException, Injectable } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { RegisterDto } from './dtos/register-local.dto'
import * as bcrypt from 'bcrypt'
import { AuthPayload } from './types/auth-payload.type'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { UserDocument } from '../user/schemas/user.schema'
import { SystemRole } from '../../common/enums/system-role'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerLocal(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto
    const user = await this.userService.checkUserExists({ email })
    if (user) throw new ConflictException('USER_EXISTS')

    return this.userService.create({
      email,
      username: await this.generateUniqueUsername(fullName),
      password: bcrypt.hashSync(password, 10),
      fullName,
    })
  }

  async loginLocal(user: UserDocument) {
    const payload: AuthPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role || SystemRole.USER,
    }

    return this.generateToken(payload)
  }

  async generateToken(payload: AuthPayload) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: payload.sub.toString(),
          email: payload.email,
          role: payload.role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      ),
      this.jwt.signAsync(
        {
          sub: payload.sub,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ])

    return { access_token, refresh_token }
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
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }
}
