import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { UserModule } from '../user/user.module'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from './strategies'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory(config: ConfigService) {
        return {
          secret: config.get('JWT_SECRET'),
          signOptions: { expiresIn: '1d' },
        }
      },
      inject: [ConfigService],
    }),
    UserModule,
    PassportModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy],
})
export class AuthModule {}
