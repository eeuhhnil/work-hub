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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { SpaceService } from './space.service'
import { SpaceMemberService } from './space-member.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { CreateSpaceDto, QuerySpacesDto, UpdateSpaceDto } from './dtos'
import { ProjectService } from '../project/project.service'
import {
  QueryProjectDto,
  ProjectsWithMemberCountResponseDto,
} from '../project/dtos/dtos'
import { UserRoles } from '../auth/decorators/system-role.decorator'
import { SystemRole } from '../../common/enums'

@Controller('spaces')
@ApiTags('Spaces')
@ApiBearerAuth()
export class SpaceController {
  constructor(
    private readonly space: SpaceService,
    private readonly spaceMember: SpaceMemberService,
    private readonly project: ProjectService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Find user spaces' })
  async findUserSpaces(
    @AuthUser() authPayload: AuthPayload,
    @Query() query: QuerySpacesDto,
  ) {
    return await this.space.findUserSpaces(authPayload.sub, query)
  }

  @UserRoles(SystemRole.PROJECT_MANAGER)
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

  @UserRoles(SystemRole.PROJECT_MANAGER)
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

  @Get(':spaceId/projects')
  @ApiOperation({ summary: 'Get projects in space that user has access to' })
  async getSpaceProjects(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
    @Query() query: QueryProjectDto,
  ) {
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    // Set spaceId in query to filter projects by space
    query.space = spaceId
    // Chỉ trả về projects mà user có quyền truy cập trong space này
    return await this.project.findMany(query, authPayload.sub)
  }

  @Get(':spaceId/projects-with-member-count')
  @ApiOperation({
    summary: 'Get projects in space with member count that user has access to',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved projects with member count',
    type: ProjectsWithMemberCountResponseDto,
  })
  async getSpaceProjectsWithMemberCount(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
  ) {
    // Check if user is a member of the space
    await this.spaceMember.checkMembership(spaceId, authPayload.sub)

    // Get projects with member count - chỉ trả về projects mà user có quyền truy cập
    const projects = await this.project.findProjectsWithMemberCount(
      spaceId,
      authPayload.sub,
    )

    // Handle both array and object return types
    if (Array.isArray(projects)) {
      return {
        data: projects,
        total: projects.length,
      }
    } else {
      return {
        data: projects.data,
        total: projects.total,
      }
    }
  }

  @UserRoles(SystemRole.PROJECT_MANAGER)
  @Delete(':spaceId')
  @ApiOperation({ summary: 'Delete one space' })
  async deleteOne(
    @AuthUser() authPayload: AuthPayload,
    @Param('spaceId') spaceId: string,
  ) {
    await this.spaceMember.checkOwnership(spaceId, authPayload.sub)

    return await this.space.deleteOne(spaceId, authPayload)
  }
}
