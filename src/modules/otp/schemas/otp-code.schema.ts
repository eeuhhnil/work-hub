import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { OtpType } from '../enums'

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
    enum: Object.values(OtpType),
    default: OtpType.REGISTRATION,
  })
  type: OtpType
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode)
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
