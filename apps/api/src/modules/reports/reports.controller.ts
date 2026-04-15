// apps/api/src/modules/reports/reports.controller.ts
import {
  Controller, Get, Post, Delete, Param, Body, Query,
  HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { ReportsService } from './reports.service';

class GenerateReportDto {
  @IsString()  reportType: string;
  @IsString()  complexId: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() parameters?: Record<string, unknown>;
}

class ReportQueryDto {
  @IsOptional() @IsString() complexId?: string;
  @IsOptional() @IsString() reportType?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() publicOnly?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  // ── 보고서 생성 요청 (비동기 큐 방식) ─────────────────────────
  @Post('generate')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR)
  @ApiOperation({ summary: '보고서 생성 요청 (Bull 큐 비동기 처리)' })
  generate(@Body() dto: GenerateReportDto, @CurrentUser() user: any) {
    return this.svc.generateReport(user.orgId ?? user.organizationId, dto as any, user._id ?? user.sub);
  }

  // ── 보고서 목록 ───────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: '보고서 목록 조회' })
  @ApiQuery({ name: 'complexId',  required: false })
  @ApiQuery({ name: 'reportType', required: false })
  @ApiQuery({ name: 'projectId',  required: false })
  @ApiQuery({ name: 'publicOnly', required: false })
  @ApiQuery({ name: 'page',       required: false })
  @ApiQuery({ name: 'limit',      required: false })
  findAll(@Query() query: ReportQueryDto, @CurrentUser() user: any) {
    return this.svc.findAll(user.orgId ?? user.organizationId, {
      ...query,
      publicOnly: query.publicOnly === 'true',
    });
  }

  // ── 보고서 단건 조회 ──────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: '보고서 상세 조회' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findById(user.orgId ?? user.organizationId, id);
  }

  // ── 다운로드 URL 발급 ─────────────────────────────────────────
  @Get(':id/download-url')
  @ApiOperation({ summary: '보고서 S3 Presigned 다운로드 URL 발급 (15분 유효)' })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getDownloadUrl(user.orgId ?? user.organizationId, id);
  }

  // ── 보고서 삭제 ───────────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '보고서 삭제 (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(user.orgId ?? user.organizationId, id);
  }
}
