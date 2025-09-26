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
import { UserService } from '../user/user.service'

@Controller('project')
@ApiBearerAuth()
@ApiTags('Project Members')
export class ProjectMemberController {
  constructor(
    private readonly projectMember: ProjectMemberService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add member to project' })
  async addProjectMember(
    @AuthUser() authPayload: AuthPayload,
    @Body() payload: CreateProjectMemberDto,
  ) {
    const { projectId, email } = payload
    await this.projectMember.checkOwnership(projectId, authPayload.sub)

    const user = await this.userService.findOne({ email: email })
    if (!user) throw new NotFoundException('User not found')

    return await this.projectMember.addMemberToProject(
      projectId,
      user._id,
      authPayload.sub,
    )
  }

  @Get()
  @ApiOperation({ summary: 'Get member from project' })
  async findMany(@Query() query: QueryProjectMemberDto) {
    return await this.projectMember.findMany(query)
  }

  @Delete(':projectMemberId')
  @ApiOperation({ summary: 'Remove member from project' })
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
