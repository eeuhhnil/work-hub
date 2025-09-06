import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'
import { ProjectRole, SpaceRole } from '../../../../common/enums'
import { PaginationDTO } from '../../../../common/dtos'

export class QueryProjectDto extends PaginationDTO {
  @ApiPropertyOptional({ description: 'Search by project name' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({
    enum: ProjectRole,
    description: 'Filter by user role in project',
  })
  @IsEnum(SpaceRole)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase()
    }
    return value
  })
  role?: ProjectRole
}
