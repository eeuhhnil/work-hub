import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common'
import { FilterQuery, PaginateOptions } from 'mongoose'
import { DbService } from '../../common/db/db.service'
import { QueryProjectMemberDto } from './dtos/dtos'
import { IdLike } from '../../common/types'
import { ProjectMember } from '../../common/db/models'
import { ProjectRole, SpaceRole } from '../../common/enums'
import { NotificationService } from '../notification/notification.service'
import { SpaceMemberService } from '../spaces/space-member.service'

@Injectable()
export class ProjectMemberService {
  constructor(
    private readonly db: DbService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => SpaceMemberService))
    private readonly spaceMemberService: SpaceMemberService,
  ) {}

  async findOne(projectMemberId: IdLike<string>) {
    return this.db.projectMember.findOne({ _id: projectMemberId })
  }

  async findMany(query: QueryProjectMemberDto) {
    const filter: FilterQuery<ProjectMember> = {
      project: query.project,
    }

    const { page = 1, limit = 10 } = query
    const sort = query.getSortObject()

    const options: PaginateOptions = {
      page,
      limit,
      sort,
      populate: 'user', // populate user info
    }

    return this.db.projectMember.paginate(filter, options)
  }

  async addMemberToProject(
    projectId: string,
    memberId: IdLike<string>,
    ownerId: string,
  ) {
    const [project, member, existing] = await Promise.all([
      this.db.project.findById(projectId),
      this.db.user.exists({ _id: memberId }),
      this.db.projectMember.exists({ user: memberId, project: projectId }),
    ])

    if (!project) throw new NotFoundException('Project not found')
    if (!member) throw new NotFoundException('Member not found')
    if (existing) throw new ConflictException('User already project member')

    // Validate that user is a member of the space before adding to project
    await this.spaceMemberService.checkMembership(project.space.toString(), memberId.toString())

    const newMember = await this.db.projectMember.create({
      user: memberId,
      project: projectId,
      role: ProjectRole.MEMBER,
    })

    await this.notificationService.notifyMemberAddedToProject(
      projectId.toString(),
      memberId.toString(),
      ownerId.toString(),
    )

    return newMember
  }

  async deleteOne(projectMemberId: IdLike<string>, actor?: any) {
    const projectMember = await this.db.projectMember.findById(projectMemberId)
    if (!projectMember) return null

    // Send notification before deletion if actor is provided
    await this.notificationService.notifyMemberRemovedFromProject(
      projectMember.project.toString(),
      projectMember.user.toString(),
      actor,
    )

    return this.db.projectMember.deleteOne({ _id: projectMemberId })
  }

  async checkMembership(projectId: IdLike<string>, memberId: IdLike<string>) {
    const membership = await this.db.projectMember.findOne({
      project: projectId,
      user: memberId,
    })
    if (!membership)
      throw new ForbiddenException(`Permission denied project membership`)
    return membership
  }

  async checkOwnership(projectId: IdLike<string>, ownerId: IdLike<string>) {
    const ownership = await this.db.projectMember.findOne({
      project: projectId,
      user: ownerId,
      role: ProjectRole.OWNER,
    })
    if (!ownership)
      throw new ForbiddenException(`Permission denied project ownership`)

    return ownership
  }
}
