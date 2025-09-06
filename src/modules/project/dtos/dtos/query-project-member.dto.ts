import { ApiProperty } from '@nestjs/swagger'
import { IsMongoId, IsNotEmpty } from 'class-validator'
import { PaginationDTO } from '../../../../common/dtos'

export class QueryProjectMemberDto extends PaginationDTO {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  project: string
}
