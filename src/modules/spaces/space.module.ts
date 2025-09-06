import { Module } from '@nestjs/common'
import { SpaceService } from './space.service'
import { SpaceController } from './space.controller'
import { UserModule } from '../user/user.module'
import { SpaceMemberService } from './space-member.service'
import { SpaceMemberController } from './space-member.controller'

@Module({
  imports: [UserModule],
  controllers: [SpaceController, SpaceMemberController],
  providers: [SpaceService, SpaceMemberService],
})
export class SpaceModule {}
