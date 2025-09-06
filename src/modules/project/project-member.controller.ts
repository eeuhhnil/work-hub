import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ProjectMemberService } from './project-member.service'
import { ProjectService } from './project.service'
import { AuthUser } from '../auth/decorators'
import type { AuthPayload } from '../auth/types'
import { CreateProjectMemberDto, QueryProjectMemberDto } from './dtos/dtos'
import { ProjectRole } from '../../common/enums'

@Controller('project')
@ApiBearerAuth()
@ApiTags('Project Members')
export class ProjectMemberController {
  constructor(
    private readonly projectMember: ProjectMemberService,
    private readonly project: ProjectService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add member to project' })
  async addProjectMember(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateProjectMemberDto,
  ) {
    await this.projectMember.checkOwnership(payload.project, authPayload.sub)
    const { role, ...projectMemberData } = payload
    await this.projectMember.addMemberToProject({
      role: role ? role : ProjectRole.MEMBER,
      ...projectMemberData,
    })

    return {
      message: 'Added member to project',
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get member from project' })
  async findMany(
    @AuthUser() authPayload: AuthPayload,
    @Query() query: QueryProjectMemberDto,
  ) {
    await this.projectMember.checkOwnership(query.project, authPayload.sub)
    return await this.projectMember.findMany(query)
  }

  @Delete(':projectMemberId')
  async removeMemberFromProject(
    @AuthUser() authPayload: AuthPayload,
    @Param('projectMemberId') projectMemberId: string,
  ) {
    const projectMember = await this.projectMember.findOne(projectMemberId)
    if (!projectMember) throw new NotFoundException(`Project member not found`)
    await this.projectMember.checkOwnership(
      projectMember.project as string,
      authPayload.sub,
    )

    await this.projectMember.deleteOne(projectMemberId)

    return {
      message: 'Removed member from project',
    }
  }
}
