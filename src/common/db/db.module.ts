import { Global, Module } from '@nestjs/common'
import { DbService } from './db.service'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import {
  Space,
  SpaceMember,
  SpaceMemberSchema,
  SpaceSchema,
  User,
  UserSchema,
  Session,
  SessionSchema,
  OtpCode,
  OtpCodeSchema,
} from './models'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Global()
@Module({
  imports: [
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
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Space.name,
        schema: SpaceSchema,
      },
      {
        name: SpaceMember.name,
        schema: SpaceMemberSchema,
      },
      {
        name: Session.name,
        schema: SessionSchema,
      },
      {
        name: OtpCode.name,
        schema: OtpCodeSchema,
      },
    ]),
  ],
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
