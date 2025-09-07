import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator'
import { ProjectRole } from '../../../../common/enums'

export class CreateProjectMemberDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  project: string

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  user: string

  @ApiPropertyOptional({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole
}
