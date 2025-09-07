import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { IdLike } from '../../types'
import { User } from './user.model'
import { Space } from './space.model'
import { Project } from './project.model'
import paginate from 'mongoose-paginate-v2'
import { TaskStatus } from '../../enums'

@Schema({
  timestamps: true,
})
export class Task {
  @Prop({
    type: String,
    ref: 'Space',
  })
  space: IdLike<Space>

  @Prop({
    type: String,
    ref: 'Project',
  })
  project: IdLike<Project>

  @Prop({
    type: String,
    ref: 'User',
  })
  owner: IdLike<User>

  @Prop({
    type: String,
    ref: 'User',
  })
  assignee: IdLike<User>

  @Prop({
    type: String,
  })
  name: string

  @Prop({
    type: String,
    required: false,
  })
  description?: string

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    required: false,
  })
  status?: TaskStatus

  @Prop({
    type: Date,
    required: false,
  })
  completedAt?: Date

  @Prop({
    type: Date,
    required: false,
  })
  dueDate?: Date
}

export const TaskSchema = SchemaFactory.createForClass(Task)
TaskSchema.plugin(paginate)
