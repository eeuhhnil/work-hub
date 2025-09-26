import { ApiProperty } from '@nestjs/swagger'

export class ProjectProgressDto {
  @ApiProperty({ description: 'Tên của project' })
  projectName: string

  @ApiProperty({ description: 'Phần trăm hoàn thành (0-100)' })
  progress: number
}

export class UserProjectsProgressResponseDto {
  @ApiProperty({
    type: [ProjectProgressDto],
    description:
      'Danh sách tất cả project mà user thuộc về cùng với phần trăm hoàn thành',
  })
  data: ProjectProgressDto[]
}
