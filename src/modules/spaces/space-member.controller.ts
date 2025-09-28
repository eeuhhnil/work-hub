import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SpaceMemberService } from './space-member.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { CreateSpaceMemberDto, QuerySpacesDto } from './dtos'
import { UserService } from '../user/user.service'

@Controller('space-members')
@ApiTags('Space Members')
@ApiBearerAuth()
export class SpaceMemberController {
  constructor(
    private readonly spaceMember: SpaceMemberService,
    private readonly userService: UserService,
  ) {}


  @Post()
  @ApiOperation({ summary: 'Add member to space' })
  async addMemberToSpace(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateSpaceMemberDto,
  ) {
    const { spaceId, email } = payload
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    const user = await this.userService.findOne({ email: email })
    if (!user) throw new NotFoundException('User not found')

    return await this.spaceMember.createOne(
      spaceId,
      user._id.toString(),
      authPayload.sub,
    )
  }

  @Get('/space/:spaceId')
  @ApiOperation({ summary: 'Find many space members' })
  async findSpaceMembers(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Query() query: QuerySpacesDto,
  ) {
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    return await this.spaceMember.findManyBySpaceId(spaceId, query)
  }

  @Delete(':spaceMemberId')
  @ApiOperation({ summary: 'Remove member from space' })
  async removeMemberFromSpace(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceMemberId') spaceMemberId: string,
  ) {
    const spaceMember = await this.spaceMember.findOne(spaceMemberId)
    if (!spaceMember)
      throw new NotFoundException(
        `Space member with id ${spaceMemberId} not found`,
      )

    const ownership = await this.spaceMember.checkOwnership(
      spaceMember.space.toString(),
      authPayload.sub,
    )
    if (ownership.user.toString() === spaceMember.user.toString())
      throw new ForbiddenException('Owner cannot be removed from space')

    return await this.spaceMember.deleteOne(spaceMemberId, authPayload.sub)
  }
}
