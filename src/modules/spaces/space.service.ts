import { Injectable, NotFoundException } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { CreateSpaceDto, UpdateSpaceDto } from './dtos'
import { SpaceRole } from '../../common/enums'
import { DbService } from '../../common/db/db.service'

@Injectable()
export class SpaceService {
  constructor(
    private readonly db: DbService,
    private readonly userService: UserService,
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

  async updateOne(spaceId: string, payload: UpdateSpaceDto) {
    return this.db.space.findOneAndUpdate(
      { _id: spaceId.toString() },
      {
        ...payload,
      },
      { new: true },
    )
  }

  async deleteOne(spaceId: string) {
    await this.db.spaceMember.deleteMany({ space: spaceId })

    return this.db.space.deleteOne({ _id: spaceId })
  }

  async checkExistingSpace(spaceId: string) {
    const space = await this.db.space.exists({ _id: spaceId })
    if (!space) throw new NotFoundException(`Space not found`)

    return space
  }
}
