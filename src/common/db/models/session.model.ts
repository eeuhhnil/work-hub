import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import paginate from 'mongoose-paginate-v2'

@Schema({
  timestamps: true,
})
export class Session {
  _id?: string
  @Prop({
    type: String,
    ref: 'User',
    required: true,
  })
  userId: string

  @Prop({
    type: String,
    required: false,
  })
  ip: string

  @Prop({
    type: String,
    required: false,
  })
  deviceName: string

  @Prop({
    type: String,
    required: false,
  })
  browser: string

  @Prop({
    type: String,
    required: false,
  })
  os: string
}

export const SessionSchema = SchemaFactory.createForClass(Session)
SessionSchema.plugin(paginate)
