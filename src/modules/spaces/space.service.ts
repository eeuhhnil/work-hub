import { Injectable, NotFoundException } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { CreateSpaceDto, UpdateSpaceDto, QuerySpacesDto } from './dtos'
import { SpaceRole } from '../../common/enums'
import { DbService } from '../../common/db/db.service'
import { NotificationGateway } from '../notification/notification.gateway'
import { NotificationType } from '../notification/types'
import { NotificationService } from '../notification/notification.service'
import { QueryProjectDto } from '../project/dtos/dtos'
import { Project, Space } from '../../common/db/models'
import { PaginationMetadata } from '../../common/interceptors'
import { FilterQuery } from 'mongoose'

@Injectable()
export class SpaceService {
  constructor(
    private readonly db: DbService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOne(ownerId: string, payload: CreateSpaceDto) {
    const existingUser = await this.db.user.exists({ _id: ownerId })
    if (!existingUser)
      throw new NotFoundException(`User with id ${ownerId} does not exist`)

    const space = await this.db.space.create(payload)
    await this.db.spaceMember.create({
      space: space._id.toString(),
      user: ownerId,
      role: SpaceRole.OWNER,
    })

    return space
  }

  async findOne(spaceId: string) {
    return this.db.space.findById(spaceId)
  }

  async findUserSpaces(userId: string, query: QuerySpacesDto) {
    // Find all space memberships for the user
    const memberships = await this.db.spaceMember
      .find({ user: userId })
      .populate('space')

    // Extract spaces from memberships and filter out null spaces
    const spaces = memberships
      .map((membership) => membership.space)
      .filter((space) => space != null) // Filter out null/undefined spaces

    return {
      data: spaces,
      total: spaces.length,
    }
  }

  async findMany(
    query: QuerySpacesDto,
  ): Promise<{ data: Space[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search, role } = query

    const where: any = {}
    if (search) {
      where.$or = [{ name: { $regex: search, $options: 'i' } }]
    }
    if (role) {
      where.role = role
    }

    const [data, total] = await Promise.all([
      this.db.space
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.db.space.countDocuments(where),
    ])

    // Chuyển ObjectId sang string và lọc null
    const spaces: Space[] = data
      .filter((item) => item != null)
      .map((item) => ({
        id: item._id.toString(), // chuyển ObjectId -> string
        name: item.name,
        // các field khác của Space nếu có
      }))

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data: spaces, meta }
  }

  async updateOne(spaceId: string, payload: UpdateSpaceDto, ownerId: string) {
    const updated = await this.db.space.findOneAndUpdate(
      { _id: spaceId.toString() },
      { $set: payload },
      { new: true },
    )

    if (!updated) {
      throw new NotFoundException(`Space with id ${spaceId} not found`)
    }

    await this.notificationService.notifyUpdatedSpace(spaceId, ownerId)

    return updated
  }

  async deleteOne(spaceId: string, actor: any) {
    const space = await this.db.space.findById(spaceId)
    if (!space)
      throw new NotFoundException(`Space with id ${spaceId} not found`)

    await this.db.spaceMember.deleteMany({ space: spaceId })

    return this.db.space.deleteOne({ _id: spaceId })
  }
}
