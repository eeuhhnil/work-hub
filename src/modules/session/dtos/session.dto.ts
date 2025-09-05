import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsMongoId } from 'class-validator'
import { PaginationDTO } from '../../../common/dtos'

export class CreateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId({ each: true })
  userId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  browser: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  os: string
}

export class QuerySessionDto extends PaginationDTO {}
