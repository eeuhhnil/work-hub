import { ApiPropertyOptional } from '@nestjs/swagger'
import { SpaceRole } from '../../../common/enums'
import { IsEnum, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'
import { PaginationDTO } from '../../../common/dtos'

export class QuerySpacesDto extends PaginationDTO {
  @ApiPropertyOptional({ enum: SpaceRole })
  @IsEnum(SpaceRole)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase()
    }
    return value
  })
  role?: SpaceRole
}
