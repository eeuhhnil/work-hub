import { Injectable, NotFoundException } from '@nestjs/common'
import { FilterQuery, PaginateOptions, PipelineStage } from 'mongoose'
import { DbService } from '../../common/db/db.service'
import { IdLike } from '../../common/types'
import {
  CreateProjectDto,
  QueryProjectDto,
  UpdateProjectDto,
} from './dtos/dtos'
import { ProjectRole, TaskStatus } from '../../common/enums'
import { Project } from '../../common/db/models'
import { NotificationService } from '../notification/notification.service'
import { PaginationMetadata } from '../../common/interceptors'

@Injectable()
export class ProjectService {
  constructor(
    private readonly db: DbService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOne(
    ownerId: IdLike<string>,
    payload: CreateProjectDto,
    actor?: any,
  ) {
    const project = await this.db.project.create(payload)

    await this.db.projectMember.create({
      user: ownerId,
      project: project._id.toString(),
      role: ProjectRole.OWNER,
    })

    return project
  }

  async findMany(
    query: QueryProjectDto,
    userId?: string,
  ): Promise<{ data: Project[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search, space } = query

    // Nếu có userId, chỉ trả về projects mà user là member
    if (userId) {
      return this.findUserProjectsWithPagination(userId, query)
    }

    // Fallback cho trường hợp không có userId (backward compatibility)
    const where: any = {}
    if (search) {
      where.$or = [{ name: { $regex: search, $options: 'i' } }]
    }
    if (space) {
      where.space = space
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

  async findUserProjectsWithProgress(userId: string) {
    const projectMemberships = await this.db.projectMember
      .find({ user: userId })
      .populate('project')

    const projects = await Promise.all(
      projectMemberships.map(async (membership) => {
        const projectDoc = membership.project as unknown as Project & {
          _id: string
          toObject: () => any
        }

        if (!projectDoc) return null

        // đếm số member
        const memberCount = await this.db.projectMember.countDocuments({
          project: projectDoc._id,
        })

        // đếm task & task completed (chỉ tính task đã được PM approve)
        const totalTasks = await this.db.task.countDocuments({
          project: projectDoc._id,
        })
        const completedTasks = await this.db.task.countDocuments({
          project: projectDoc._id,
          status: TaskStatus.COMPLETED, // Chỉ tính task đã được PM approve
        })

        const progress =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          ...projectDoc.toObject(),
          members: memberCount,
          totalTasks,
          completedTasks,
          progress: `${progress}%`,
        }
      }),
    )

    return {
      data: projects.filter(Boolean),
      total: projects.length,
    }
  }

  async findUserProjectsWithPagination(
    userId: string,
    query: QueryProjectDto,
  ): Promise<{ data: Project[]; meta: PaginationMetadata }> {
    const { page = 1, limit = 10, search, space } = query

    // Tìm tất cả project memberships của user
    const membershipQuery: any = { user: userId }
    const projectMemberships = await this.db.projectMember
      .find(membershipQuery)
      .populate('project')

    // Filter projects theo search và space
    let projects = await Promise.all(
      projectMemberships.map(async (membership) => {
        const projectDoc = membership.project as unknown as Project & {
          _id: string
          toObject: () => any
        }

        if (!projectDoc) return null

        // Filter theo space nếu có
        if (space && projectDoc.space.toString() !== space) {
          return null
        }

        // Filter theo search nếu có
        if (
          search &&
          !projectDoc.name.toLowerCase().includes(search.toLowerCase())
        ) {
          return null
        }

        const memberCount = await this.db.projectMember.countDocuments({
          project: projectDoc._id,
        })

        return {
          ...projectDoc.toObject(),
          members: memberCount,
        }
      }),
    )

    // Loại bỏ null values
    projects = projects.filter(Boolean)

    // Sort theo createdAt
    projects.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    // Pagination
    const total = projects.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProjects = projects.slice(startIndex, endIndex)

    const meta: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }

    return { data: paginatedProjects, meta }
  }

  async findUserProjects(userId: string) {
    const projectMemberships = await this.db.projectMember
      .find({ user: userId })
      .populate('project')

    const projects = await Promise.all(
      projectMemberships.map(async (membership) => {
        const projectDoc = membership.project as unknown as Project & {
          _id: string
          toObject: () => any
        }

        if (!projectDoc) return null

        const memberCount = await this.db.projectMember.countDocuments({
          project: projectDoc._id,
        })

        return {
          ...projectDoc.toObject(),
          members: memberCount,
        }
      }),
    )

    return {
      data: projects.filter(Boolean),
      total: projects.length,
    }
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

    // Cascade delete: Delete all tasks in this project
    await this.db.task.deleteMany({ project: projectId })

    // Delete all project members
    await this.db.projectMember.deleteMany({ project: projectId })

    return this.db.project.deleteOne({ _id: projectId })
  }

  async findUserProjectsInSpace(userId: string, spaceId: string) {
    // Tìm tất cả project memberships của user trong space cụ thể
    const projectMemberships = await this.db.projectMember
      .find({ user: userId })
      .populate('project')

    const projects = await Promise.all(
      projectMemberships.map(async (membership) => {
        const projectDoc = membership.project as unknown as Project & {
          _id: string
          toObject: () => any
        }

        if (!projectDoc || projectDoc.space.toString() !== spaceId) {
          return null
        }

        const memberCount = await this.db.projectMember.countDocuments({
          project: projectDoc._id,
        })

        return {
          ...projectDoc.toObject(),
          memberCount,
        }
      }),
    )

    return {
      data: projects
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      total: projects.filter(Boolean).length,
    }
  }

  async findProjectsWithMemberCount(spaceId: string, userId?: string) {
    // Nếu có userId, chỉ trả về projects mà user là member
    if (userId) {
      return this.findUserProjectsInSpace(userId, spaceId)
    }

    const pipeline: PipelineStage[] = [
      // Match projects in the specified space
      {
        $match: {
          space: spaceId,
        },
      },
      // Lookup to get member count for each project
      {
        $lookup: {
          from: this.db.projectMember.collection.name, // Use actual collection name
          let: { projectId: { $toString: '$_id' } }, // Convert ObjectId to string
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$project', '$$projectId'] },
              },
            },
          ],
          as: 'members',
        },
      },
      // Add memberCount field
      {
        $addFields: {
          memberCount: { $size: '$members' },
        },
      },
      // Keep members array for debugging
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          avatar: 1,
          space: 1,
          memberCount: 1,
          members: 1, // Keep for debugging
          createdAt: 1,
          updatedAt: 1,
        },
      },
      // Sort by creation date (newest first)
      {
        $sort: { createdAt: -1 },
      },
    ]

    return await this.db.project.aggregate(pipeline).exec()
  }
}
