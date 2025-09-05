import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { OtpCode, OtpCodeDocument } from './schemas/otp-code.schema'
import { OtpType } from './enums/otp-types.constant'

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpCode.name)
    private readonly otpModel: Model<OtpCodeDocument>,
  ) {}

  async createOtp(userId: string, type: OtpType = OtpType.REGISTRATION) {
    const code = this.generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await this.otpModel.deleteMany({ userId, type }) // Remove old OTPs

    return this.otpModel.create({
      code,
      userId,
      type,
      expiresAt,
    })
  }

  async verifyOtp(userId: string, code: string, type: OtpType) {
    const otp = await this.otpModel.findOne({
      userId,
      code,
      type,
      expiresAt: { $gt: new Date() },
    })

    if (otp) {
      await this.otpModel.deleteOne({ _id: otp._id })
      return true
    }
    return false
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}
