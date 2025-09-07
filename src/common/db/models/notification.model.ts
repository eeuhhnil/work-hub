import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { User } from './user.model'
import type { IdLike } from '../../types'
import { NotificationType } from '../../../modules/notification/types'
import paginate from 'mongoose-paginate-v2'

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: String, required: true, ref: 'User' })
  recipientId: IdLike<User>

  @Prop({ type: Boolean, default: false })
  isRead: boolean

  @Prop({ type: Date, required: false })
  readAt?: Date

  @Prop({ type: Object })
  data: any

  @Prop({ type: String, required: true })
  type: NotificationType
}
export const NotificationSchema = SchemaFactory.createForClass(Notification)
NotificationSchema.plugin(paginate)
