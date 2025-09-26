import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator'

export class CreateSpaceMemberDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  spaceId: string

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string
}
