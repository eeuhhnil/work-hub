import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Space } from './space.model'
import paginate from 'mongoose-paginate-v2'
import type { IdLike } from '../../types'

@Schema({
  timestamps: true,
})
export class Project {
  @Prop({
    type: String,
    ref: 'Space',
  })
  space: IdLike<Space>

  @Prop({
    type: String,
  })
  name: string

  @Prop({
    type: String,
    required: false,
  })
  avatar?: string

  @Prop({
    type: String,
    required: false,
  })
  description?: string
}

export const ProjectSchema = SchemaFactory.createForClass(Project)
ProjectSchema.plugin(paginate)
