import { Injectable } from '@nestjs/common'
import { DbService } from '../../common/db/db.service'
import { OtpCode, OtpType } from '../../common/db/models'

@Injectable()
export class OtpService {
  constructor(private readonly db: DbService) {}

  async createOtp(userId: string, type: OtpType = OtpType.REGISTRATION) {
    const code = this.generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await this.db.otpCode.deleteMany({ userId, type }) // Remove old OTPs

    return this.db.otpCode.create({
      code,
      userId,
      type,
      expiresAt,
    })
  }

  async verifyOtp(userId: string, code: string, type: OtpType) {
    const otp = await this.db.otpCode.findOne({
      userId,
      code,
      type,
      expiresAt: { $gt: new Date() },
    })

    if (otp) {
      await this.db.otpCode.deleteOne({ _id: otp._id })
      return true
    }
    return false
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}
