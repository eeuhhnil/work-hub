import { Module, forwardRef } from '@nestjs/common'
import { SpaceService } from './space.service'
import { SpaceController } from './space.controller'
import { UserModule } from '../user/user.module'
import { SpaceMemberService } from './space-member.service'
import { SpaceMemberController } from './space-member.controller'
import { NotificationModule } from '../notification/notification.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [UserModule, NotificationModule, forwardRef(() => ProjectModule)],
  controllers: [SpaceController, SpaceMemberController],
  providers: [SpaceService, SpaceMemberService],
  exports: [SpaceService, SpaceMemberService],
})
export class SpaceModule {}
