import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { IdLike } from '../../types'
import { User } from './user.model'
import { Space } from './space.model'
import { Project } from './project.model'
import paginate from 'mongoose-paginate-v2'
import { TaskStatus, TaskPriority } from '../../enums'

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
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.MEDIUM,
    required: false,
  })
  priority?: TaskPriority

  @Prop({
    type: Date,
    required: false,
  })
  completedAt?: Date

  @Prop({
    type: Date,
    required: false,
  })
  startDate?: Date

  @Prop({
    type: Date,
    required: false,
  })
  dueDate?: Date

  @Prop({
    type: String,
    ref: 'User',
    required: false,
  })
  approvedBy?: IdLike<User>

  @Prop({
    type: Date,
    required: false,
  })
  approvedAt?: Date

  @Prop({
    type: String,
    ref: 'User',
    required: false,
  })
  rejectedBy?: IdLike<User>

  @Prop({
    type: Date,
    required: false,
  })
  rejectedAt?: Date

  @Prop({
    type: String,
    required: false,
  })
  reviewComment?: string

  @Prop({
    type: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        mimetype: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    required: false,
    default: [],
  })
  attachments?: Array<{
    filename: string
    originalName: string
    url: string
    size: number
    mimetype: string
    uploadedAt: Date
  }>
}

export const TaskSchema = SchemaFactory.createForClass(Task)
TaskSchema.plugin(paginate)
