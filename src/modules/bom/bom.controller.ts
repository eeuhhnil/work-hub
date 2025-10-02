import { Controller, Get } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { BOMService } from './bom.service'
import { AuthUser, Public } from '../auth/decorators'
import { UserRoles } from '../auth/decorators/system-role.decorator'
import { SystemRole } from '../../common/enums'
import type { AuthPayload } from '../auth/types'
import {
  BOMDashboardResponseDto,
  ProjectStatusOverviewDto,
  SystemProgressDto,
  SpacePerformanceDto,
  PMPerformanceDto,
  RiskProjectDto,
  KPIMetricsDto,
  WeeklyProgressDto,
} from './dtos/bom-dashboard.dto'

@Controller('bom')
@ApiTags('BOM Dashboard')
@ApiBearerAuth()
@UserRoles(SystemRole.BOM)
export class BOMController {
  constructor(private readonly bomService: BOMService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get complete BOM dashboard data',
    description:
      'Returns all dashboard data for BOM role including overview, progress, performance metrics, and risk analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'BOM dashboard data retrieved successfully',
    type: BOMDashboardResponseDto,
  })
  async getDashboard(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<BOMDashboardResponseDto> {
    return await this.bomService.getDashboardData()
  }

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Get project status overview',
    description:
      'Returns total projects count and breakdown by status (Active, Completed On-time, Overdue)',
  })
  @ApiResponse({
    status: 200,
    description: 'Project overview retrieved successfully',
    type: ProjectStatusOverviewDto,
  })
  async getProjectOverview(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<ProjectStatusOverviewDto> {
    return await this.bomService.getProjectStatusOverview()
  }

  @Get('dashboard/system-progress')
  @ApiOperation({
    summary: 'Get system-wide task progress',
    description:
      'Returns task statistics across the entire system including pending, processing, completed, and overdue tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'System progress retrieved successfully',
    type: SystemProgressDto,
  })
  async getSystemProgress(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<SystemProgressDto> {
    return await this.bomService.getSystemProgress()
  }

  @Get('dashboard/space-performance')
  @ApiOperation({
    summary: 'Get performance metrics by space',
    description:
      'Returns performance metrics for each space including project counts, completion rates, and overdue tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'Space performance metrics retrieved successfully',
    type: [SpacePerformanceDto],
  })
  async getSpacePerformance(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<SpacePerformanceDto[]> {
    return await this.bomService.getSpacePerformance()
  }

  @Get('dashboard/pm-performance')
  @ApiOperation({
    summary: 'Get performance metrics by Project Manager',
    description:
      'Returns performance metrics for each PM including project counts, completion rates, and overdue projects',
  })
  @ApiResponse({
    status: 200,
    description: 'PM performance metrics retrieved successfully',
    type: [PMPerformanceDto],
  })
  async getPMPerformance(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<PMPerformanceDto[]> {
    return await this.bomService.getPMPerformance()
  }

  @Get('dashboard/risk-projects')
  @ApiOperation({
    summary: 'Get high-risk projects',
    description:
      'Returns projects with high percentage of overdue tasks, sorted by risk level',
  })
  @ApiResponse({
    status: 200,
    description: 'Risk projects retrieved successfully',
    type: [RiskProjectDto],
  })
  async getRiskProjects(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<RiskProjectDto[]> {
    return await this.bomService.getRiskProjects()
  }

  @Get('dashboard/kpi-metrics')
  @ApiOperation({
    summary: 'Get key performance indicators',
    description:
      'Returns main KPIs including completion rates, overdue counts, and average project duration',
  })
  @ApiResponse({
    status: 200,
    description: 'KPI metrics retrieved successfully',
    type: KPIMetricsDto,
  })
  async getKPIMetrics(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<KPIMetricsDto> {
    return await this.bomService.getKPIMetrics()
  }

  @Get('dashboard/weekly-progress')
  @ApiOperation({
    summary: 'Get weekly task completion progress',
    description: 'Returns task completion trends over the last 12 weeks',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly progress retrieved successfully',
    type: [WeeklyProgressDto],
  })
  async getWeeklyProgress(
    @AuthUser() authPayload: AuthPayload,
  ): Promise<WeeklyProgressDto[]> {
    return await this.bomService.getWeeklyProgress()
  }
}
