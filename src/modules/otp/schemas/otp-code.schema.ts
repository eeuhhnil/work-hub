import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type OtpCodeDocument = OtpCode & Document

@Schema({ timestamps: true })
export class OtpCode {
  @Prop({ required: true })
  code: string

  @Prop({ required: true, ref: 'User' })
  userId: string

  @Prop({ required: true })
  expiresAt: Date

  @Prop({
    type: String,
    enum: ['REGISTRATION', 'PASSWORD_RESET'],
    default: 'REGISTRATION',
  })
  type: string
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode)
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
