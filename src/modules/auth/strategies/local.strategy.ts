import { Strategy } from 'passport-local'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UserService } from '../../user/user.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService) {
    super({ usernameField: 'email' })
  }

  async validate(email: string, password: string) {
    const user = await this.userService.findOne(
      { email },
      { select: '+password' },
    )
    if (!user) throw new UnauthorizedException('Invalid credentials')
    if (!user.isActive)
      throw new UnauthorizedException(
        'Account is not activated. Please verify your email.',
      )

    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      const { password, ...safeUser } = user.toJSON()
      return safeUser
    }

    throw new UnauthorizedException('Invalid credentials')
  }
}
