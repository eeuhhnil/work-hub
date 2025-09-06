import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { FilterQuery, PaginateModel } from 'mongoose'
import { UpdateProfileDto } from './dtos'
import { QueryUserDto } from './dtos'
import { PaginationMetadata } from '../../common/interceptors'
import { DbService } from '../../common/db/db.service'
import { User } from '../../common/db/models'

@Injectable()
export class UserService {
  constructor(private readonly db: DbService) {}
  async create(user: Omit<User, '_id'>) {
    return this.db.user.create(user)
  }

  async getProfile(userId: string) {
    return this.db.user.findById(userId)
  }

  async checkUserExists(filter: FilterQuery<User>) {
    return this.db.user.exists(filter)
  }

  async findOne(
    filter: FilterQuery<User>,
    options: {
      select?: string | string[]
    } = {},
  ) {
    return this.db.user.findOne(filter).select(options.select || {})
  }

  async findMany(
    query: QueryUserDto,
  ): Promise<{ data: User[]; meta: PaginationMetadata }> {
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
      this.db.user
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.db.user.countDocuments(where),
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
    const existingUser = await this.db.user.exists({ _id: userId })
    if (!existingUser) throw new NotFoundException('User not found')

    return this.db.user.findOneAndUpdate(
      { _id: userId },
      {
        ...payload,
      },
      { new: true },
    )
  }

  async deleteOne(userId: string) {
    return this.db.user.deleteOne({ _id: userId })
  }
}
