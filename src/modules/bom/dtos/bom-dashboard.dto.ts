import { ApiProperty } from '@nestjs/swagger'

export class ProjectStatusOverviewDto {
  @ApiProperty()
  totalProjects: number

  @ApiProperty()
  inProgressProjects: number

  @ApiProperty()
  completedOnTimeProjects: number

  @ApiProperty()
  overdueProjects: number

  @ApiProperty()
  inProgressPercentage: number

  @ApiProperty()
  completedPercentage: number

  @ApiProperty()
  overduePercentage: number

  @ApiProperty()
  onTimeCompletionRate: number
}

export class SystemProgressDto {
  @ApiProperty()
  totalTasks: number

  @ApiProperty()
  pendingTasks: number

  @ApiProperty()
  processingTasks: number

  @ApiProperty()
  pendingApprovalTasks: number

  @ApiProperty()
  completedTasks: number

  @ApiProperty()
  overdueTasks: number

  @ApiProperty()
  completionPercentage: number

  @ApiProperty()
  overduePercentage: number
}

export class SpacePerformanceDto {
  @ApiProperty()
  spaceId: string

  @ApiProperty()
  spaceName: string

  @ApiProperty()
  totalProjects: number

  @ApiProperty()
  completedProjects: number

  @ApiProperty()
  overdueProjects: number

  @ApiProperty()
  inProgressProjects: number

  @ApiProperty()
  completedOnTimePercentage: number

  // Keep old fields for backward compatibility
  @ApiProperty()
  onTimeCompletionRate: number

  @ApiProperty()
  overdueTasksCount: number

  @ApiProperty()
  activeProjectsCount: number
}

export class PMPerformanceDto {
  @ApiProperty()
  pmId: string

  @ApiProperty()
  pmName: string

  @ApiProperty()
  spaceName: string

  @ApiProperty()
  totalProjects: number

  @ApiProperty()
  completedProjects: number

  @ApiProperty()
  overdueProjects: number

  @ApiProperty()
  inProgressProjects: number

  @ApiProperty()
  completedOnTimePercentage: number

  // Keep old fields for backward compatibility
  @ApiProperty()
  onTimeCompletionRate: number

  @ApiProperty()
  overdueProjectsCount: number

  @ApiProperty()
  activeProjectsCount: number
}

export class RiskProjectDto {
  @ApiProperty()
  projectId: string

  @ApiProperty()
  projectName: string

  @ApiProperty()
  spaceName: string

  @ApiProperty()
  pmName: string

  @ApiProperty()
  totalTasks: number

  @ApiProperty()
  overdueTasksCount: number

  @ApiProperty()
  overduePercentage: number

  @ApiProperty()
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
}

export class KPIMetricsDto {
  @ApiProperty()
  projectOnTimeCompletionRate: number

  @ApiProperty()
  taskOnTimeCompletionRate: number

  @ApiProperty()
  totalOverdueProjects: number

  @ApiProperty()
  averageProjectDuration: number

  @ApiProperty()
  totalActiveProjects: number

  @ApiProperty()
  totalCompletedProjects: number
}

export class WeeklyProgressDto {
  @ApiProperty()
  week: string

  @ApiProperty()
  completedTasks: number

  @ApiProperty()
  totalTasks: number
}

export class BOMDashboardResponseDto {
  @ApiProperty()
  overview: ProjectStatusOverviewDto

  @ApiProperty()
  systemProgress: SystemProgressDto

  @ApiProperty()
  spacePerformance: SpacePerformanceDto[]

  @ApiProperty()
  pmPerformance: PMPerformanceDto[]

  @ApiProperty()
  riskProjects: RiskProjectDto[]

  @ApiProperty()
  weeklyProgress: WeeklyProgressDto[]
}
