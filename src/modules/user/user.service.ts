import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { User, UserDocument } from './schemas/user.schema'
import type { FilterQuery, PaginateModel } from 'mongoose'
import { UpdateProfileDto } from './dtos'
import { QueryUserDto } from './dtos'
import { PaginationMetadata } from '../../common/interceptors'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<UserDocument>,
  ) {}
  async create(user: Omit<User, '_id'>) {
    return this.userModel.create(user)
  }

  async getProfile(userId: string) {
    return this.userModel.findById(userId)
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

  async findMany(
    query: QueryUserDto,
  ): Promise<{ data: UserDocument[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search } = query

    const where: any = {}
    if (search) {
      where.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    // lấy dữ liệu và tổng số
    const [data, total] = await Promise.all([
      this.userModel
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(where),
    ])

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
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

  async deleteOne(userId: string) {
    return this.userModel.deleteOne({ _id: userId })
  }
}
