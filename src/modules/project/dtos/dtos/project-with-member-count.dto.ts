import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ProjectWithMemberCountDto {
  @ApiProperty()
  _id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional()
  description?: string

  @ApiPropertyOptional()
  avatar?: string

  @ApiProperty()
  space: string

  @ApiProperty()
  memberCount: number

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class ProjectsWithMemberCountResponseDto {
  @ApiProperty({ type: [ProjectWithMemberCountDto] })
  data: ProjectWithMemberCountDto[]

  @ApiProperty()
  total: number
}
