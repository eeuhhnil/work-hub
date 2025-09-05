import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { FilterQuery, PaginateModel } from 'mongoose'
import { Session, SessionDocument } from './schemas/session.schema'
import { CreateSessionDto, QuerySessionDto } from './dtos'
import { PaginationMetadata } from '../../common/interceptors'

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: PaginateModel<SessionDocument>,
  ) {}
  async create(session: CreateSessionDto) {
    return this.sessionModel.create(session)
  }

  async findOne(filter: FilterQuery<SessionDocument>) {
    return this.sessionModel.findOne(filter)
  }

  async findMany(
    query: QuerySessionDto,
  ): Promise<{ data: SessionDocument[]; meta: PaginationMetadata }> {
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
      this.sessionModel
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId') // giống relations: ['user']
        .exec(),
      this.sessionModel.countDocuments(where),
    ])

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
  }

  async deleteOne(filter: FilterQuery<SessionDocument>) {
    return this.sessionModel.deleteOne(filter)
  }

  async deleteMany(filter: FilterQuery<SessionDocument>) {
    return this.sessionModel.deleteMany(filter)
  }
}
