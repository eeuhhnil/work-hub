import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsNotEmpty } from 'class-validator'
import { PaginationDTO } from '../../../common/dtos'

export class ApproveTaskDto {
  @ApiPropertyOptional({
    description: 'Comment khi approve task',
    example: 'Task đã hoàn thành tốt, chất lượng cao',
  })
  @IsOptional()
  @IsString()
  comment?: string
}

export class RejectTaskDto {
  @ApiProperty({
    description: 'Lý do reject task',
    example: 'Cần bổ sung thêm documentation và test cases',
  })
  @IsString()
  @IsNotEmpty()
  reason: string
}

export class QueryPendingApprovalTasksDto extends PaginationDTO {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: '64ff1b2c3d4e5f6789ab0cde',
  })
  @IsOptional()
  @IsString()
  project?: string

  @ApiPropertyOptional({
    description: 'Filter by space ID',
    example: '64ff1b2c3d4e5f6789ab0cde',
  })
  @IsOptional()
  @IsString()
  space?: string
}
