import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import paginate from 'mongoose-paginate-v2'

@Schema({
  timestamps: true,
})
export class Space {
  _id?: string
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

export const SpaceSchema = SchemaFactory.createForClass(Space)
SpaceSchema.plugin(paginate)
