import { Module } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { ProjectService } from './project.service'
import { ProjectMemberService } from './project-member.service'
import { ProjectController } from './project.controller'
import { ProjectMemberController } from './project-member.controller'

@Module({
  imports: [UserModule],
  controllers: [ProjectController, ProjectMemberController],
  providers: [ProjectService, ProjectMemberService],
})
export class ProjectModule {}
