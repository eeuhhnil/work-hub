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
import { NotificationService } from '../notification/notification.service'
import { PaginationMetadata } from '../../common/interceptors'

@Injectable()
export class ProjectService {
  constructor(
    private readonly db: DbService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOne(ownerId: IdLike<string>, payload: CreateProjectDto) {
    const project = await this.db.project.create(payload)

    await this.db.projectMember.create({
      user: ownerId,
      project: project._id.toString(),
      role: ProjectRole.OWNER,
    })

    await this.notificationService.notifyCreateProject(
      ownerId.toString(),
      project,
    )

    return project
  }

  async findMany(
    query: QueryProjectDto,
  ): Promise<{ data: Project[]; meta: PaginationMetadata }> {
    const filter: FilterQuery<Project> = {}
    const { page = 1, limit = 10, search } = query

    const where: any = {}
    if (search) {
      where.$or = [{ name: { $regex: search, $options: 'i' } }]
    }

    // lấy dữ liệu và tổng số
    const [data, total] = await Promise.all([
      this.db.project
        .find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.db.project.countDocuments(where),
    ])

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data, meta }
  }

  async findOne(projectId: IdLike<string>) {
    return this.db.project.findById(projectId)
  }

  async updateOne(
    projectId: IdLike<string>,
    payload: UpdateProjectDto,
    actorId: string,
  ) {
    const updated = await this.db.project.findOneAndUpdate(
      { _id: projectId },
      {
        ...payload,
      },
      { new: true },
    )

    // Send notification if actor is provided
    if (updated) {
      await this.notificationService.notifyUpdatedProject(
        projectId.toString(),
        actorId,
      )
    }

    return updated
  }

  async deleteOne(projectId: IdLike<string>, actor: any) {
    const project = await this.db.project.findById(projectId)
    if (!project)
      throw new NotFoundException(`Project with id ${projectId} not found`)

    // Send notification before deletion if actor is provided
    await this.notificationService.notifyDeletedProject(
      projectId.toString(),
      actor,
      project.name,
    )

    return this.db.project.deleteOne({ _id: projectId })
  }

  async checkExistingProject(projectId: IdLike<string>) {
    const project = await this.db.project.exists({ _id: projectId })
    if (!project) throw new NotFoundException(`Project not found`)

    return project
  }
}
