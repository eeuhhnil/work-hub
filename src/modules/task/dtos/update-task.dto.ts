import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { CreateTaskDto, TaskAttachmentDto } from './create-task.dto'
import { TaskStatus, TaskPriority } from '../../../common/enums'
import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
} from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['space', 'project'] as const),
) {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority

  @ApiPropertyOptional({
    oneOf: [
      {
        type: 'array',
        items: { $ref: '#/components/schemas/TaskAttachmentDto' },
      },
      { type: 'string', description: 'JSON string of attachments array' },
    ],
  })
  @IsOptional()
  attachments?: TaskAttachmentDto[] | string
}
