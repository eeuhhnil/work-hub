import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { User, UserDocument } from './schemas/user.schema'
import type { PaginateModel } from 'mongoose'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<UserDocument>,
  ) {}
  async create(user: Omit<User, '_id'>) {
    return this.userModel.create(user)
  }
}
