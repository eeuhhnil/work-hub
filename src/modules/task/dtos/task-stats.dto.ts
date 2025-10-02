import { ApiProperty } from '@nestjs/swagger'

export class TaskStatsDto {
  @ApiProperty({ description: 'Số lượng task đang chờ xử lý' })
  pending: number

  @ApiProperty({ description: 'Số lượng task đang xử lý' })
  processing: number

  @ApiProperty({ description: 'Số lượng task chờ phê duyệt' })
  pendingApproval: number

  @ApiProperty({ description: 'Số lượng task đã hoàn thành' })
  completed: number

  @ApiProperty({
    description:
      'Số lượng task quá hạn (pending hoặc processing nhưng đã quá dueDate)',
  })
  overdue: number
}
