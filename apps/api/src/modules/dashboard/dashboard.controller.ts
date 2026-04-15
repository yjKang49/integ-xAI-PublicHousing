import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { UserRole } from '@ax/shared';
import { IsOptional, IsString } from 'class-validator';

class DashboardQueryDto {
  @IsOptional() @IsString() complexId?: string;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(
    UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER,
    UserRole.COMPLAINT_MGR, UserRole.VIEWER,
  )
  @ApiOperation({ summary: '대시보드 KPI 조회 (Redis 60s 캐시)' })
  getDashboard(@Query() query: DashboardQueryDto, @CurrentUser() user: any) {
    return this.dashboardService.getDashboard(user.organizationId, query.complexId);
  }
}
