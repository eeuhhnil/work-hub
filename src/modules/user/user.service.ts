import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { User, UserDocument } from './schemas/user.schema'
import type { FilterQuery, PaginateModel } from 'mongoose'
import { UpdateProfileDto } from './dtos'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<UserDocument>,
  ) {}
  async create(user: Omit<User, '_id'>) {
    return this.userModel.create(user)
  }

  async checkUserExists(filter: FilterQuery<UserDocument>) {
    return this.userModel.exists(filter)
  }

  async findOne(
    filter: FilterQuery<User>,
    options: {
      select?: string | string[]
    } = {},
  ) {
    return this.userModel.findOne(filter).select(options.select || {})
  }

  async updateProfile(userId: string, payload: UpdateProfileDto) {
    const existingUser = await this.checkUserExists({ _id: userId })
    if (!existingUser) throw new NotFoundException('User not found')

    return this.userModel.findOneAndUpdate(
      { _id: userId },
      {
        ...payload,
      },
      { new: true },
    )
  }
}
