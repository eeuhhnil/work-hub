import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class LoginLocalDto {
  @ApiProperty({
    type: String,
    required: true,
    example: 'user@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    type: String,
    required: true,
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  password: string
}
