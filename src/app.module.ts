import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { StorageModule } from './modules/storage/storage.module'
import { UserModule } from './modules/user/user.module'
import { OtpModule } from './modules/otp/otp.module'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from './modules/auth/auth.module'
import { NotificationModule } from './modules/notification/notification.module'
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'
import { APP_GUARD } from '@nestjs/core'
import { MailerModule } from '@nestjs-modules/mailer'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => {
        return {
          uri: configService.get<string>('MONGO_URI'),
        }
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: configService.get<number>('MAIL_PORT'),
          secure: true,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@localhost>',
        },
        preview: false,
      }),
    }),
    StorageModule,
    UserModule,
    AuthModule,
    OtpModule,
    NotificationModule,
  ],
  controllers: [],

  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
