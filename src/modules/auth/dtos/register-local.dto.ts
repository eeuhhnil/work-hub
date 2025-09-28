import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString} from 'class-validator'
import {SystemRole} from "../../../common/enums";

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

  @ApiPropertyOptional({ enum: SystemRole })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;
}
