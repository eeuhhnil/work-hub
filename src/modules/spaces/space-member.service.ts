import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { FilterQuery, PaginateOptions } from 'mongoose'
import { DbService } from '../../common/db/db.service'
import { IdLike } from '../../common/types'
import { SpaceRole } from '../../common/enums'
import { SpaceMember } from '../../common/db/models'
import { PaginationDTO } from '../../common/dtos'
import { QuerySpacesDto } from './dtos'

@Injectable()
export class SpaceMemberService {
  constructor(private readonly db: DbService) {}

  async createOne(
    spaceId: IdLike<string>,
    memberId: IdLike<string>,
    role?: SpaceRole,
  ) {
    const [space, member, existing] = await Promise.all([
      this.db.space.exists({ _id: spaceId }),
      this.db.user.exists({ _id: memberId }),
      this.db.spaceMember.exists({ user: memberId, space: spaceId }),
    ])
    if (!space) throw new NotFoundException('Space not found')
    if (!member) throw new NotFoundException('Member not found')
    if (existing) throw new ConflictException('User already space member')

    return this.db.spaceMember.create({
      user: memberId,
      space: spaceId,
      role: role ? role : SpaceRole.MEMBER,
    })
  }

  async findOne(spaceMemberId: IdLike<string>) {
    return this.db.spaceMember.findById(spaceMemberId)
  }

  async findManyBySpaceId(spaceId: string, query: QuerySpacesDto) {
    const filter: FilterQuery<SpaceMember> = { space: spaceId }

    if (query.role) {
      filter.role = query.role
    }

    const { page = 1, limit = 10 } = query

    const sort = query.getSortObject()

    const options: PaginateOptions = {
      page,
      limit,
      sort,
      populate: 'user',
    }

    return this.db.spaceMember.paginate(filter, options)
  }

  async deleteOne(spaceMemberId: IdLike<string>) {
    return this.db.spaceMember.deleteOne({ _id: spaceMemberId })
  }

  async checkMembership(spaceId: IdLike<string>, memberId: IdLike<string>) {
    const membership = await this.db.spaceMember.findOne({
      space: spaceId,
      user: memberId,
    })
    if (!membership)
      throw new ForbiddenException(`Permission denied space membership`)

    return membership
  }

  async checkOwnership(spaceId: IdLike<string>, ownerId: IdLike<string>) {
    const ownership = await this.db.spaceMember.findOne({
      space: spaceId,
      user: ownerId,
      role: SpaceRole.OWNER,
    })
    if (!ownership)
      throw new ForbiddenException(`Permission denied space ownership`)

    return ownership
  }
}
