import { Injectable, NotFoundException } from '@nestjs/common'
import { FilterQuery, PaginateOptions, PipelineStage } from 'mongoose'
import { DbService } from '../../common/db/db.service'
import { IdLike } from '../../common/types'
import {
  CreateProjectDto,
  QueryProjectDto,
  UpdateProjectDto,
} from './dtos/dtos'
import { ProjectRole } from '../../common/enums'
import { Project } from '../../common/db/models'

@Injectable()
export class ProjectService {
  constructor(private readonly db: DbService) {}

  async createOne(ownerId: IdLike<string>, payload: CreateProjectDto) {
    const project = await this.db.project.create(payload)

    await this.db.projectMember.create({
      user: ownerId,
      project: project._id.toString(),
      role: ProjectRole.OWNER,
    })

    return project
  }

  async findMany(userId: IdLike<string>, query: QueryProjectDto) {
    const filter: FilterQuery<Project> = { user: userId }

    const projectMembers = await this.db.projectMember.find({ user: userId })
    const projectIds = projectMembers.map((pm) => pm.project)
    filter._id = { $in: projectIds }

    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' }
    }

    if (query.role) {
      const membersByRole = await this.db.projectMember.find({
        user: userId,
        role: query.role,
      })
      const idsByRole = membersByRole.map((pm) => pm.project)
      filter._id = { $in: idsByRole }
    }

    const { page = 1, limit = 10 } = query
    const sort = query.getSortObject()

    const options: PaginateOptions = {
      page,
      limit,
      sort,
    }

    return this.db.project.paginate(filter, options)
  }

  async findOne(projectId: IdLike<string>) {
    return this.db.project.findById(projectId)
  }

  async updateOne(projectId: IdLike<string>, payload: UpdateProjectDto) {
    return this.db.project.findOneAndUpdate(
      { _id: projectId },
      {
        ...payload,
      },
      { new: true },
    )
  }

  async deleteOne(projectId: IdLike<string>) {
    return this.db.project.deleteOne({ _id: projectId })
  }

  async checkExistingProject(projectId: IdLike<string>) {
    const project = await this.db.project.exists({ _id: projectId })
    if (!project) throw new NotFoundException(`Project not found`)

    return project
  }
}
