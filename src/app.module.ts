import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { StorageModule } from './modules/storage/storage.module'
import { UserModule } from './modules/user/user.module'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from './modules/auth/auth.module'
import {JwtAuthGuard} from "./modules/auth/guards/jwt-auth.guard";
import {APP_GUARD} from "@nestjs/core";

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
    StorageModule,
    UserModule,
    AuthModule,
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
