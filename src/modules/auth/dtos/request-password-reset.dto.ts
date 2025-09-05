import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class RequestPasswordResetDto {
  @ApiProperty({
    type: String,
    example: 'user@gmail.com',
    description: 'Email address to send password reset OTP',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string
}
