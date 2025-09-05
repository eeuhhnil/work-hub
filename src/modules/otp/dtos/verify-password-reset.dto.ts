import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class VerifyPasswordResetDto {
  @ApiProperty({
    type: String,
    example: 'user@gmail.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    type: String,
    example: '123456',
    description: 'OTP code received via email',
  })
  @IsString()
  @IsNotEmpty()
  otp: string

  @ApiProperty({
    type: String,
    example: 'newPassword123',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string
}
