import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { KpiService } from './kpi.service';

class ComputeKpiDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsDateString() periodStart: string;
  @ApiProperty() @IsDateString() periodEnd: string;
}

@ApiTags('KPI')
@ApiBearerAuth()
@Controller({ path: 'kpi', version: '1' })
export class KpiController {
  constructor(private readonly svc: KpiService) {}

  @Get()
  @ApiOperation({ summary: 'KPI 레코드 목록 (저장된 기간별 집계)' })
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'limit',     required: false })
  findAll(
    @Query('complexId') complexId: string,
    @Query('limit')     limit:     string,
    @CurrentUser() user: any,
  ) {
    return this.svc.findAll(user.organizationId, complexId, limit ? +limit : 12);
  }

  @Get('summary')
  @ApiOperation({ summary: '대시보드용 KPI 요약 (이력 + 현재 월 실시간)' })
  @ApiQuery({ name: 'complexId', required: true })
  getSummary(@Query('complexId') complexId: string, @CurrentUser() user: any) {
    return this.svc.getSummary(user.organizationId, complexId);
  }

  @Post('compute')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'KPI 수동 계산 및 저장 (기간 지정)' })
  compute(@Body() dto: ComputeKpiDto, @CurrentUser() user: any) {
    return this.svc.compute(user.organizationId, dto.complexId, dto.periodStart, dto.periodEnd);
  }

  @Post('compute/current-month')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '현재 월 KPI 자동 계산 및 저장' })
  computeCurrentMonth(@Query('complexId') complexId: string, @CurrentUser() user: any) {
    return this.svc.computeCurrentMonth(user.organizationId, complexId);
  }
}
