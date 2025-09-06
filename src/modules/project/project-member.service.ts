import { ForbiddenException, Injectable } from '@nestjs/common'
import { FilterQuery, PaginateOptions } from 'mongoose'
import { DbService } from '../../common/db/db.service'
import { QueryProjectMemberDto } from './dtos/dtos'
import { IdLike } from '../../common/types'
import { ProjectMember } from '../../common/db/models'
import { ProjectRole } from '../../common/enums'

@Injectable()
export class ProjectMemberService {
  constructor(private readonly db: DbService) {}

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

  async addMemberToProject(payload: Omit<ProjectMember, '_id'>) {
    return this.db.projectMember.create(payload)
  }

  async deleteOne(projectMemberId: IdLike<string>) {
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
