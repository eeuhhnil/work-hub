import { Injectable } from '@nestjs/common'
import type { FilterQuery } from 'mongoose'
import { CreateSessionDto, QuerySessionDto } from './dtos'
import { PaginationMetadata } from '../../common/interceptors'
import { DbService } from '../../common/db/db.service'
import { Session } from '../../common/db/models'

@Injectable()
export class SessionService {
  constructor(private readonly db: DbService) {}
  async create(session: CreateSessionDto) {
    return this.db.session.create(session)
  }

  async findOne(filter: FilterQuery<Session>) {
    return this.db.session.findOne(filter)
  }

  async findMany(
    query: QuerySessionDto,
  ): Promise<{ data: Session[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search } = query

    const where: any = {}
    if (search) {
      where.$or = [
        { ip: { $regex: search, $options: 'i' } },
        { deviceName: { $regex: search, $options: 'i' } },
        { browser: { $regex: search, $options: 'i' } },
        { os: { $regex: search, $options: 'i' } },
      ]
    }

    // lấy dữ liệu và tổng số
    const [data, total] = await Promise.all([
      this.db.session
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId') // giống relations: ['user']
        .exec(),
      this.db.session.countDocuments(where),
    ])

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
  }

  async deleteOne(filter: FilterQuery<Session>) {
    return this.db.session.deleteOne(filter)
  }

  async deleteMany(filter: FilterQuery<Session>) {
    return this.db.session.deleteMany(filter)
  }
}
