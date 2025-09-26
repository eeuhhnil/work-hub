import { TaskService } from './task.service'
import { Module } from '@nestjs/common'
import { TaskController } from './task.controller'
import { SpaceModule } from '../spaces/space.module'
import { ProjectModule } from '../project/project.module'
import { NotificationModule } from '../notification/notification.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [SpaceModule, ProjectModule, NotificationModule, StorageModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
