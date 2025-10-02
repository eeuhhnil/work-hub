import { Injectable } from '@nestjs/common'
import { DbService } from '../../common/db/db.service'
import { TaskStatus, ProjectRole, SpaceRole } from '../../common/enums'
import {
  ProjectStatusOverviewDto,
  SystemProgressDto,
  SpacePerformanceDto,
  PMPerformanceDto,
  RiskProjectDto,
  KPIMetricsDto,
  WeeklyProgressDto,
  BOMDashboardResponseDto,
} from './dtos/bom-dashboard.dto'

@Injectable()
export class BOMService {
  constructor(private readonly db: DbService) {}

  async getDashboardData(): Promise<BOMDashboardResponseDto> {
    const [
      overview,
      systemProgress,
      spacePerformance,
      pmPerformance,
      riskProjects,
      weeklyProgress,
    ] = await Promise.all([
      this.getProjectStatusOverview(),
      this.getSystemProgress(),
      this.getSpacePerformance(),
      this.getPMPerformance(),
      this.getRiskProjects(),
      this.getWeeklyProgress(),
    ])

    return {
      overview,
      systemProgress,
      spacePerformance,
      pmPerformance,
      riskProjects,
      weeklyProgress,
    }
  }

  async getProjectStatusOverview(): Promise<ProjectStatusOverviewDto> {
    try {
      console.log('=== Getting Project Status Overview ===')

      // Get all projects from database
      const allProjects = await this.db.project.find()
      const totalProjects = allProjects.length
      console.log('Total projects:', totalProjects)

      // Classify projects based on task completion and due dates (same logic as getSpacePerformance)
      const projectsWithStatus = await Promise.all(
        allProjects.map(async (project) => {
          const totalTasks = await this.db.task.countDocuments({
            project: project._id,
          })
          const completedTasks = await this.db.task.countDocuments({
            project: project._id,
            status: TaskStatus.COMPLETED,
          })

          // Check if project has overdue tasks (incomplete tasks past due date)
          const overdueTasksCount = await this.db.task.countDocuments({
            project: project._id,
            status: { $ne: TaskStatus.COMPLETED },
            dueDate: { $lt: new Date() },
          })

          // Project classification:
          // 1. Completed: All tasks are done
          const isCompleted = totalTasks > 0 && completedTasks === totalTasks

          // 2. Overdue: Has incomplete tasks that are past due date
          const isOverdue = !isCompleted && overdueTasksCount > 0

          // 3. In-progress: Has incomplete tasks but none are overdue
          const isInProgress = !isCompleted && !isOverdue

          return {
            ...project,
            isCompleted,
            isOverdue,
            isInProgress,
            totalTasks,
            completedTasks,
            overdueTasksCount,
          }
        }),
      )

      // Count projects by status
      const completedProjects = projectsWithStatus.filter(
        (p) => p.isCompleted,
      ).length
      const overdueProjects = projectsWithStatus.filter(
        (p) => p.isOverdue,
      ).length
      const inProgressProjects = projectsWithStatus.filter(
        (p) => p.isInProgress,
      ).length

      console.log('Completed projects:', completedProjects)
      console.log('Overdue projects:', overdueProjects)
      console.log('In-progress projects:', inProgressProjects)

      // Calculate percentages
      const completedPercentage =
        totalProjects > 0
          ? Math.round((completedProjects / totalProjects) * 100)
          : 0

      const overduePercentage =
        totalProjects > 0
          ? Math.round((overdueProjects / totalProjects) * 100)
          : 0
      const inProgressPercentage =
        totalProjects > 0
          ? Math.round((inProgressProjects / totalProjects) * 100)
          : 0

      // % Completed On-time = completed projects / total projects
      const completedOnTimeProjects = completedProjects
      const onTimeCompletionRate =
        totalProjects > 0
          ? Math.round((completedProjects / totalProjects) * 100)
          : 0
      console.log('Completed on time projects:', completedOnTimeProjects)
      console.log('On-time completion rate:', onTimeCompletionRate, '%')

      const result = {
        totalProjects,
        inProgressProjects,
        inProgressPercentage,
        completedOnTimeProjects,
        completedPercentage,
        overdueProjects,
        overduePercentage,
        onTimeCompletionRate,
      }

      console.log('Project overview result:', result)
      return result
    } catch (error) {
      console.error('Error getting project overview:', error)
      // Fallback to empty data if database query fails
      return {
        totalProjects: 0,
        inProgressProjects: 0,
        inProgressPercentage: 0,
        completedOnTimeProjects: 0,
        completedPercentage: 0,
        overdueProjects: 0,
        overduePercentage: 0,
        onTimeCompletionRate: 0,
      }
    }
  }

  async getSystemProgress(): Promise<SystemProgressDto> {
    try {
      console.log('=== Getting System Progress ===')

      // Get real task data from database
      const totalTasks = await this.db.task.countDocuments()
      console.log('Total tasks:', totalTasks)

      const pendingTasks = await this.db.task.countDocuments({
        status: TaskStatus.PENDING,
      })
      console.log('Pending tasks:', pendingTasks)

      const processingTasks = await this.db.task.countDocuments({
        status: TaskStatus.PROCESSING,
      })
      console.log('Processing tasks:', processingTasks)

      const pendingApprovalTasks = await this.db.task.countDocuments({
        status: TaskStatus.PENDING_APPROVAL,
      })
      console.log('Pending approval tasks:', pendingApprovalTasks)

      const completedTasks = await this.db.task.countDocuments({
        status: TaskStatus.COMPLETED,
      })
      console.log('Completed tasks (approved by PM):', completedTasks)

      // Calculate overdue tasks (tasks that are not completed and past due date)
      const overdueTasks = await this.db.task.countDocuments({
        status: { $ne: TaskStatus.COMPLETED },
        dueDate: { $lt: new Date() },
      })
      console.log('Overdue tasks:', overdueTasks)

      // Calculate percentages
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      const overduePercentage =
        totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0

      const result = {
        totalTasks,
        pendingTasks,
        processingTasks,
        pendingApprovalTasks,
        completedTasks,
        overdueTasks,
        completionPercentage,
        overduePercentage,
      }

      console.log('System progress result:', result)
      return result
    } catch (error) {
      console.error('Error getting system progress:', error)
      // Fallback to empty data if database query fails
      return {
        totalTasks: 0,
        pendingTasks: 0,
        processingTasks: 0,
        pendingApprovalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        completionPercentage: 0,
        overduePercentage: 0,
      }
    }
  }

  async getSpacePerformance(): Promise<SpacePerformanceDto[]> {
    try {
      console.log('=== Getting Space Performance ===')

      // Get all spaces from database
      const spaces = await this.db.space.find()
      console.log('Found spaces:', spaces.length)

      const spacePerformance = await Promise.all(
        spaces.map(async (space) => {
          console.log(`Processing space: ${space.name}`)

          // Get all projects in this space (using 'space' field, not 'spaceId')
          const allProjects = await this.db.project.find({ space: space._id })
          const totalProjects = allProjects.length
          console.log(`${space.name} - Total projects:`, totalProjects)

          // Classify projects based on task completion and due dates
          const projectsWithStatus = await Promise.all(
            allProjects.map(async (project) => {
              const totalTasks = await this.db.task.countDocuments({
                project: project._id,
              })
              const completedTasks = await this.db.task.countDocuments({
                project: project._id,
                status: TaskStatus.COMPLETED,
              })

              // Check if project has overdue tasks (incomplete tasks past due date)
              const overdueTasksCount = await this.db.task.countDocuments({
                project: project._id,
                status: { $ne: TaskStatus.COMPLETED },
                dueDate: { $lt: new Date() },
              })

              // Project classification:
              // 1. Completed: All tasks are done
              const isCompleted =
                totalTasks > 0 && completedTasks === totalTasks

              // 2. Overdue: Has incomplete tasks that are past due date
              const isOverdue = !isCompleted && overdueTasksCount > 0

              // 3. In-progress: Has incomplete tasks but none are overdue
              const isInProgress = !isCompleted && !isOverdue

              return {
                ...project,
                isCompleted,
                isOverdue,
                isInProgress,
                totalTasks,
                completedTasks,
                overdueTasksCount,
              }
            }),
          )

          // Count projects by status
          const completedProjects = projectsWithStatus.filter(
            (p) => p.isCompleted,
          ).length
          const overdueProjects = projectsWithStatus.filter(
            (p) => p.isOverdue,
          ).length
          const inProgressProjects = projectsWithStatus.filter(
            (p) => p.isInProgress,
          ).length

          console.log(`${space.name} - Completed projects:`, completedProjects)
          console.log(`${space.name} - Overdue projects:`, overdueProjects)
          console.log(
            `${space.name} - In-progress projects:`,
            inProgressProjects,
          )

          // Calculate projects completed on-time (completed projects that finished before their deadline)
          // For now, we'll assume all completed projects are on-time since we don't have project deadline field
          // TODO: Add project deadline field to properly calculate on-time completion
          const completedOnTimeProjects = completedProjects // Assuming all completed are on-time for now

          // Calculate % Completed On-time = (Projects completed on-time / Total projects) * 100
          const completedOnTimePercentage =
            totalProjects > 0
              ? Math.round((completedOnTimeProjects / totalProjects) * 100)
              : 0

          const result = {
            spaceId: space._id!.toString(),
            spaceName: space.name,
            totalProjects,
            completedProjects,
            overdueProjects,
            inProgressProjects,
            completedOnTimePercentage,
            // Keep old fields for backward compatibility
            onTimeCompletionRate: completedOnTimePercentage,
            overdueTasksCount: overdueProjects,
            activeProjectsCount: inProgressProjects,
          }

          console.log(`${space.name} result:`, result)
          return result
        }),
      )

      return spacePerformance
    } catch (error) {
      console.error('Error getting space performance:', error)
      // Return empty array if database query fails
      return []
    }
  }

  async getPMPerformance(): Promise<PMPerformanceDto[]> {
    try {
      console.log('=== Getting PM Performance ===')

      // Get space owners (PMs who own spaces) from SpaceMember with OWNER role
      const spaceOwners = await this.db.spaceMember
        .find({
          role: 'owner', // SpaceRole.OWNER
        })
        .populate('space')
        .populate('user')

      console.log('Found space owners:', spaceOwners.length)

      const pmPerformance = await Promise.all(
        spaceOwners.map(async (spaceMember) => {
          if (!spaceMember.user || !spaceMember.space) {
            console.log('SpaceMember missing user or space, skipping')
            return null
          }

          const pm = spaceMember.user as any
          const space = spaceMember.space as any
          console.log(
            `Processing PM (Space Owner): ${pm.fullName} for space ${space.name}`,
          )

          // Get all projects in this PM's space (using 'space' field, not 'spaceId')
          const allProjects = await this.db.project.find({ space: space._id })
          const totalProjects = allProjects.length
          console.log(`${pm.fullName} - Total projects:`, totalProjects)

          // Classify projects based on task completion and due dates
          const projectsWithStatus = await Promise.all(
            allProjects.map(async (project) => {
              const totalTasks = await this.db.task.countDocuments({
                project: project._id,
              })
              const completedTasks = await this.db.task.countDocuments({
                project: project._id,
                status: TaskStatus.COMPLETED,
              })

              // Check if project has overdue tasks (incomplete tasks past due date)
              const overdueTasksCount = await this.db.task.countDocuments({
                project: project._id,
                status: { $ne: TaskStatus.COMPLETED },
                dueDate: { $lt: new Date() },
              })

              // Project classification:
              // 1. Completed: All tasks are done
              const isCompleted =
                totalTasks > 0 && completedTasks === totalTasks

              // 2. Overdue: Has incomplete tasks that are past due date
              const isOverdue = !isCompleted && overdueTasksCount > 0

              // 3. In-progress: Has incomplete tasks but none are overdue
              const isInProgress = !isCompleted && !isOverdue

              return {
                ...project,
                isCompleted,
                isOverdue,
                isInProgress,
                totalTasks,
                completedTasks,
                overdueTasksCount,
              }
            }),
          )

          // Count projects by status
          const completedProjects = projectsWithStatus.filter(
            (p) => p.isCompleted,
          ).length
          const overdueProjects = projectsWithStatus.filter(
            (p) => p.isOverdue,
          ).length
          const inProgressProjects = projectsWithStatus.filter(
            (p) => p.isInProgress,
          ).length

          console.log(`${pm.fullName} - Completed projects:`, completedProjects)
          console.log(`${pm.fullName} - Overdue projects:`, overdueProjects)
          console.log(
            `${pm.fullName} - In-progress projects:`,
            inProgressProjects,
          )

          // Calculate projects completed on-time (completed projects that finished before their deadline)
          // For now, we'll assume all completed projects are on-time since we don't have project deadline field
          // TODO: Add project deadline field to properly calculate on-time completion
          const completedOnTimeProjects = completedProjects // Assuming all completed are on-time for now

          // Calculate % Completed On-time = (Projects completed on-time / Total projects) * 100
          const completedOnTimePercentage =
            totalProjects > 0
              ? Math.round((completedOnTimeProjects / totalProjects) * 100)
              : 0

          const result = {
            pmId: pm._id!.toString(),
            pmName: pm.fullName,
            spaceName: space.name,
            totalProjects,
            completedProjects,
            overdueProjects,
            inProgressProjects,
            completedOnTimePercentage,
            // Keep old fields for backward compatibility
            onTimeCompletionRate: completedOnTimePercentage,
            overdueProjectsCount: overdueProjects,
            activeProjectsCount: inProgressProjects,
          }

          console.log(`${pm.fullName} result:`, result)
          return result
        }),
      )

      // Filter out null results
      return pmPerformance.filter((pm) => pm !== null)
    } catch (error) {
      console.error('Error getting PM performance:', error)
      // Return empty array if database query fails
      return []
    }
  }

  async getRiskProjects(): Promise<RiskProjectDto[]> {
    try {
      // Get all active projects
      const activeProjects = await this.db.project
        .find({
          status: { $in: ['active', 'in_progress'] },
        })
        .populate('spaceId')

      const riskProjects = await Promise.all(
        activeProjects.map(async (project) => {
          // Count total tasks in this project
          const totalTasks = await this.db.task.countDocuments({
            project: project._id,
          })

          // Count overdue tasks in this project
          const overdueTasksCount = await this.db.task.countDocuments({
            project: project._id,
            status: { $ne: TaskStatus.COMPLETED },
            dueDate: { $lt: new Date() },
          })

          // Calculate overdue percentage
          const overduePercentage =
            totalTasks > 0
              ? Math.round((overdueTasksCount / totalTasks) * 100)
              : 0

          // Determine risk level based on overdue percentage
          let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
          if (overduePercentage >= 50) {
            riskLevel = 'HIGH'
          } else if (overduePercentage >= 25) {
            riskLevel = 'MEDIUM'
          }

          // Get project manager name (use OWNER role since PROJECT_MANAGER doesn't exist)
          const projectManager = await this.db.projectMember
            .findOne({
              project: project._id,
              role: ProjectRole.OWNER,
            })
            .populate('user')

          const pmName =
            (projectManager?.user as any)?.fullName || 'Chưa phân công'
          const spaceName = (project.space as any)?.name || 'Unknown Space'

          return {
            projectId: project._id!.toString(),
            projectName: project.name,
            spaceName,
            pmName,
            totalTasks,
            overdueTasksCount,
            overduePercentage,
            riskLevel,
          }
        }),
      )

      // Filter and sort by risk level (only show projects with some risk)
      return riskProjects
        .filter((project) => project.overduePercentage > 0)
        .sort((a, b) => b.overduePercentage - a.overduePercentage)
        .slice(0, 10) // Limit to top 10 risk projects
    } catch (error) {
      console.error('Error getting risk projects:', error)
      // Return empty array if database query fails
      return []
    }
  }

  async getKPIMetrics(): Promise<KPIMetricsDto> {
    try {
      console.log('=== Getting KPI Metrics ===')

      // Get project metrics
      const totalProjects = await this.db.project.countDocuments()
      const totalActiveProjects = await this.db.project.countDocuments({
        status: { $ne: 'completed' },
      })
      const totalCompletedProjects = await this.db.project.countDocuments({
        status: 'completed',
      })

      // Count projects with overdue tasks (not based on project end date)
      const projectsWithOverdueTasks = await this.db.task.aggregate([
        {
          $match: {
            status: { $ne: TaskStatus.COMPLETED },
            dueDate: { $lt: new Date() },
          },
        },
        {
          $group: {
            _id: '$project',
          },
        },
      ])
      const totalOverdueProjects = projectsWithOverdueTasks.length

      // Calculate project on-time completion rate
      // Projects on time = completed projects (assuming completed = on time)
      const projectOnTimeCompletionRate =
        totalProjects > 0
          ? Math.round((totalCompletedProjects / totalProjects) * 100)
          : 0

      // Get task metrics
      const totalTasks = await this.db.task.countDocuments()
      const completedTasks = await this.db.task.countDocuments({
        status: TaskStatus.COMPLETED,
      })
      const overdueTasks = await this.db.task.countDocuments({
        status: { $ne: TaskStatus.COMPLETED },
        dueDate: { $lt: new Date() },
      })

      // Calculate task on-time completion rate
      // Tasks on time = completed tasks / total tasks
      const taskOnTimeCompletionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Calculate average project duration (simplified - using days between created and updated date for completed projects)
      const completedProjectsWithDates = await this.db.project.find({
        status: 'completed',
        createdAt: { $exists: true },
        updatedAt: { $exists: true },
      })

      let averageProjectDuration = 0
      if (completedProjectsWithDates.length > 0) {
        const totalDuration = completedProjectsWithDates.reduce(
          (sum, project) => {
            const projectWithTimestamps = project as any
            const duration = Math.ceil(
              (projectWithTimestamps.updatedAt.getTime() -
                projectWithTimestamps.createdAt.getTime()) /
                (1000 * 60 * 60 * 24),
            )
            return sum + Math.max(1, duration) // At least 1 day
          },
          0,
        )
        averageProjectDuration = Math.round(
          totalDuration / completedProjectsWithDates.length,
        )
      }

      const result = {
        projectOnTimeCompletionRate: Math.max(0, projectOnTimeCompletionRate),
        taskOnTimeCompletionRate: Math.max(0, taskOnTimeCompletionRate),
        totalOverdueProjects,
        averageProjectDuration,
        totalActiveProjects,
        totalCompletedProjects,
      }

      console.log('KPI metrics result:', result)
      return result
    } catch (error) {
      console.error('Error getting KPI metrics:', error)
      // Return default values if database query fails
      return {
        projectOnTimeCompletionRate: 0,
        taskOnTimeCompletionRate: 0,
        totalOverdueProjects: 0,
        averageProjectDuration: 0,
        totalActiveProjects: 0,
        totalCompletedProjects: 0,
      }
    }
  }

  async getWeeklyProgress(): Promise<WeeklyProgressDto[]> {
    try {
      const weeklyProgress: WeeklyProgressDto[] = []
      const now = new Date()

      // Get data for the last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - i * 7)
        weekStart.setHours(0, 0, 0, 0)

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        // Get week number (simplified format)
        const year = weekStart.getFullYear()
        const weekNumber = Math.ceil(
          ((weekStart.getTime() - new Date(year, 0, 1).getTime()) / 86400000 +
            1) /
            7,
        )
        const weekLabel = `${year}-W${weekNumber.toString().padStart(2, '0')}`

        // Count tasks completed in this week
        const completedTasks = await this.db.task.countDocuments({
          status: TaskStatus.COMPLETED,
          updatedAt: { $gte: weekStart, $lte: weekEnd },
        })

        // Count total tasks that existed in this week (created before week end)
        const totalTasks = await this.db.task.countDocuments({
          createdAt: { $lte: weekEnd },
        })

        weeklyProgress.push({
          week: weekLabel,
          completedTasks,
          totalTasks,
        })
      }

      return weeklyProgress
    } catch (error) {
      console.error('Error getting weekly progress:', error)
      // Return empty array if database query fails
      return []
    }
  }
}
