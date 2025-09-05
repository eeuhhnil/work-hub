import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  username?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar?: string

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean
}
