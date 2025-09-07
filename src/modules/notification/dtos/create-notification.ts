import { ApiProperty } from '@nestjs/swagger'
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator'
import { NotificationType } from '../types'
import { PaginationDTO } from '../../../common/dtos'

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID của người nhận thông báo',
    example: '64ff1b2c3d4e5f6789ab0cde',
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string

  // @ApiProperty({
  //   description: 'ID của người gửi thông báo (có thể null với system notification)',
  //   example: '64ff1b2c3d4e5f6789ab0fff',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // senderId?: string;

  @ApiProperty({
    description: 'Loại thông báo',
    enum: NotificationType,
    example: NotificationType.CREATE_PROJECT,
  })
  @IsEnum(NotificationType)
  type: NotificationType

  @ApiProperty({
    description:
      'Dữ liệu bổ sung cho thông báo (taskId, projectId, message,...)',
    example: {
      taskId: 'task123',
      taskName: 'Viết tài liệu API',
      projectId: 'proj456',
    },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>
}

export class QueryNotificationDto extends PaginationDTO {}
