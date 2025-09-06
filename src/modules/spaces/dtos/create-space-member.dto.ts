import { ApiProperty } from '@nestjs/swagger'
import { IsMongoId, IsNotEmpty } from 'class-validator'

export class CreateSpaceMemberDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  spaceId: string

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  userId: string
}
