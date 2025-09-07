import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { ProjectService } from './project.service'
import { ProjectMemberService } from './project-member.service'
import { ProjectController } from './project.controller'
import { ProjectMemberController } from './project-member.controller'
import { SpaceModule } from '../spaces/space.module'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [UserModule, SpaceModule, NotificationModule],
  controllers: [ProjectController, ProjectMemberController],
  providers: [ProjectService, ProjectMemberService],
  exports: [ProjectService, ProjectMemberService],
})
export class ProjectModule {}
