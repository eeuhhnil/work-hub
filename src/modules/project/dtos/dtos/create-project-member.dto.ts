import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
} from 'class-validator'
import { ProjectRole } from '../../../../common/enums'

export class CreateProjectMemberDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  projectId: string

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiPropertyOptional({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole
}
