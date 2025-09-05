import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class RegisterDto {
  @ApiProperty({
    type: String,
    example: 'user@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    type: String,
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiProperty({
    type: String,
    example: 'Joe Doe',
  })
  @IsString()
  @IsNotEmpty()
  fullName: string
}
