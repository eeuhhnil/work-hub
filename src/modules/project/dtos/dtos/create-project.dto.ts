import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import {PaginationDTO} from "../../../../common/dtos";

export class CreateProjectDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  space: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}

export class QueryProjectDto extends PaginationDTO {
}

