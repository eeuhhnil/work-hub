import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { TaskPriority } from '../../../common/enums'
import { Type } from 'class-transformer'

export class TaskAttachmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filename: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  originalName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  url: string

  @ApiProperty()
  @IsNotEmpty()
  size: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimetype: string

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  uploadedAt: Date
}

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

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date
}
