import { PartialType } from '@nestjs/swagger'
import { CreateProjectDto } from './create-project.dto'
import { IsOptional, IsString } from 'class-validator'

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsString()
  @IsOptional()
  avatar?: string
}
