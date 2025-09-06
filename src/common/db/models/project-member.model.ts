import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { IdLike } from '../../types'
import { Project } from './project.model'
import { User } from './user.model'
import paginate from 'mongoose-paginate-v2'
import { ProjectRole } from '../../enums'

@Schema({
  timestamps: true,
})
export class ProjectMember {
  @Prop({
    type: String,
    ref: 'Project',
  })
  project: IdLike<Project>

  @Prop({
    type: String,
    ref: 'User',
  })
  user: IdLike<User>

  @Prop({
    type: String,
    enum: Object.values(ProjectRole),
    default: ProjectRole.MEMBER,
  })
  role: ProjectRole
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember)
ProjectMemberSchema.plugin(paginate)
