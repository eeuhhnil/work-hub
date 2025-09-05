import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OtpCode, OtpCodeSchema } from './schemas/otp-code.schema'
import { OtpService } from './otp.service'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OtpCode.name, schema: OtpCodeSchema }]),
  ],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
