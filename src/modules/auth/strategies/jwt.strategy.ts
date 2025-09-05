import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthPayload } from '../types/auth-payload.type'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'
import { SessionService } from '../../session/session.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {
    const secret = configService.get<string>('JWT_SECRET')!
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: AuthPayload) {
    if (!payload.sub || !payload.jti)
      throw new UnauthorizedException('Invalid JWT payload')

    const session = await this.sessionService.findOne({ _id: payload.jti })
    if (!session) throw new UnauthorizedException('Session expired or revoked')
    return payload
  }
}
