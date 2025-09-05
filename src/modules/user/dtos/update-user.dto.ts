import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationDTO } from '../../../common/dtos'

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
  fullName?: string

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean
}

export class QueryUserDto extends PaginationDTO {}
