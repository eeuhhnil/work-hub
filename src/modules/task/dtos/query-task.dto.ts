import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsMongoId, IsNotEmpty } from 'class-validator'
import { PaginationDTO } from '../../../common/dtos'

export class QueryTaskDto extends PaginationDTO {
  // @ApiProperty()
  // @IsMongoId()
  // @IsNotEmpty()
  // space: string

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  project: string
}
