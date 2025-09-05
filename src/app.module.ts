import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StorageModule } from './modules/storage/storage.module'
import {UserModule} from "./modules/user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StorageModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
