import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateTaskDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  space: string

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  project: string

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  assignee?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  dueDate?: Date
}
