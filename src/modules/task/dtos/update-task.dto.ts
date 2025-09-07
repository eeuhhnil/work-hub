import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { CreateTaskDto } from './create-task.dto'
import { TaskStatus } from '../../../common/enums'
import { IsEnum, IsOptional } from 'class-validator'

export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['space', 'project'] as const),
) {
  @ApiPropertyOptional()
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus
}
