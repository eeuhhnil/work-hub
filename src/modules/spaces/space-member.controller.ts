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

@Controller('space-members')
@ApiTags('Space Members')
@ApiBearerAuth()
export class SpaceMemberController {
  constructor(private readonly spaceMember: SpaceMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Add member to space' })
  async addMemberToSpace(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateSpaceMemberDto,
  ) {
    const { spaceId, userId } = payload
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    const spaceMember = await this.spaceMember.createOne(spaceId, userId)

    return {
      message: `Added member to space`,
      data: spaceMember.toJSON(),
    }
  }

  @Get('/space/:spaceId')
  @ApiOperation({ summary: 'Find many space members' })
  async findSpaceMembers(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Query() query: QuerySpacesDto,
  ) {
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    const pagination = await this.spaceMember.findManyBySpaceId(spaceId, query)

    return {
      message: 'Find many space members successfully',
      data: pagination.docs.map((doc) => doc.toJSON()),
      _pagination: pagination,
    }
  }

  @Delete(':spaceMemberId')
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

    return {
      message: `Removed member from space`,
      data: await this.spaceMember.deleteOne(spaceMemberId),
    }
  }
}
