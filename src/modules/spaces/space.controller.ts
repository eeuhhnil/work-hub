import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SpaceService } from './space.service'
import { SpaceMemberService } from './space-member.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { CreateSpaceDto, QuerySpacesDto, UpdateSpaceDto } from './dtos'

@Controller('spaces')
@ApiTags('Spaces')
@ApiBearerAuth()
export class SpaceController {
  constructor(
    private readonly space: SpaceService,
    private readonly spaceMember: SpaceMemberService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  async createOne(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateSpaceDto,
  ) {
    return await this.space.createOne(authPayload.sub, payload)
  }

  @Get(':spaceId')
  @ApiOperation({ summary: 'Find one space' })
  async findOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
  ) {
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    const space = await this.space.findOne(spaceId)
    if (!space)
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    return space
  }

  @Put(':spaceId')
  @ApiOperation({ summary: 'Update one space' })
  async updateOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Body() payload: UpdateSpaceDto,
  ) {
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    return await this.space.updateOne(spaceId, payload, authPayload.sub)
  }

  @Delete(':spaceId')
  @ApiOperation({ summary: 'Delete one space' })
  async deleteOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
  ) {
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    return await this.space.deleteOne(spaceId, authPayload.sub)
  }
}
