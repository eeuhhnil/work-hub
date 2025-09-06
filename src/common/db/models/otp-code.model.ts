import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import paginate from 'mongoose-paginate-v2'

export enum OtpType {
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

@Schema({ timestamps: true })
export class OtpCode {
  _id?: string
  @Prop({ required: true })
  code: string

  @Prop({ required: true, ref: 'User' })
  userId: string

  @Prop({ required: true })
  expiresAt: Date

  @Prop({
    type: String,
    enum: Object.values(OtpType),
    default: OtpType.REGISTRATION,
  })
  type: OtpType
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode)
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
OtpCodeSchema.plugin(paginate)
