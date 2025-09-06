import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import paginate from 'mongoose-paginate-v2'
import { SystemRole } from '../../enums'

@Schema({
  timestamps: true,
})
export class User {
  _id?: string
  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  username: string

  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  email: string

  @Prop({
    type: String,
    required: false,
  })
  googleId?: string

  @Prop({
    type: String,
    required: false,
    select: false,
  })
  password?: string

  @Prop({
    type: String,
    required: true,
  })
  fullName: string

  @Prop({
    type: String,
    required: false,
  })
  avatar?: string

  @Prop({
    type: String,
    enum: Object.values(SystemRole),
    required: false,
    default: SystemRole.USER,
  })
  role?: SystemRole

  @Prop({
    type: Boolean,
    required: false,
    default: true,
  })
  isActive?: boolean
}

export const UserSchema = SchemaFactory.createForClass(User)
UserSchema.index({ username: 1, email: 1 })
UserSchema.plugin(paginate)
