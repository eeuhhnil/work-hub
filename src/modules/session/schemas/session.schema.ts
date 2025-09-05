import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import paginate from 'mongoose-paginate-v2'

export type SessionDocument = HydratedDocument<Session>

@Schema({
  timestamps: true,
})
export class Session {
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
