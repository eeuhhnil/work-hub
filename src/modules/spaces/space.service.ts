import { Injectable, NotFoundException } from '@nestjs/common'
import { UserService } from '../user/user.service'
import { CreateSpaceDto, UpdateSpaceDto } from './dtos'
import { SpaceRole } from '../../common/enums'
import { DbService } from '../../common/db/db.service'
import { NotificationGateway } from '../notification/notification.gateway'
import { NotificationType } from '../notification/types'
import { NotificationService } from '../notification/notification.service'

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

    await this.notificationService.notifyCreateSpace(ownerId, space)

    return space
  }

  async findOne(spaceId: string) {
    return this.db.space.findById(spaceId)
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

    await this.notificationService.notifyDeletedSpace(
      spaceId,
      actor,
      space.name,
    )

    await this.db.spaceMember.deleteMany({ space: spaceId })

    return this.db.space.deleteOne({ _id: spaceId })
  }

  async checkExistingSpace(spaceId: string) {
    const space = await this.db.space.exists({ _id: spaceId })
    if (!space) throw new NotFoundException(`Space not found`)

    return space
  }
}
