// apps/api/src/modules/maintenance-recommendations/maintenance-recommendations.controller.ts
// Phase 2-9: 장기수선 권장 컨트롤러

import {
  Controller, Get, Post, Patch, Body, Param, Query,
  Request, Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { UserRole } from '@ax/shared';
import { MaintenanceRecommendationsService } from './maintenance-recommendations.service';
import {
  MaintenanceRecommendationQueryDto,
  UpdateRecommendationStatusDto,
} from './dto/maintenance-recommendation.dto';

@ApiTags('maintenance-recommendations')
@ApiBearerAuth()
@Controller('maintenance-recommendations')
export class MaintenanceRecommendationsController {
  constructor(
    private readonly service: MaintenanceRecommendationsService,
    private readonly configService: ConfigService,
  ) {}

  // ── 위험도 기반 권장 생성 ─────────────────────────────────────────────────

  @Post('from-risk-score/:riskScoreId')
  @ApiOperation({ summary: '위험도 스코어 기반 장기수선 권장 생성' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async generate(
    @Request() req: any,
    @Param('riskScoreId') riskScoreId: string,
  ) {
    return this.service.generateFromRiskScore(
      req.user.organizationId, riskScoreId, req.user._id,
    );
  }

  // ── 목록 조회 ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '장기수선 권장 목록 조회' })
  async findAll(@Request() req: any, @Query() query: MaintenanceRecommendationQueryDto) {
    return this.service.findAll(req.user.organizationId, query);
  }

  // ── 단건 조회 ────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '장기수선 권장 단건 조회' })
  async findById(@Request() req: any, @Param('id') id: string) {
    return this.service.findById(req.user.organizationId, id);
  }

  // ── 상태 변경 (승인 / 연기 / 반려) ──────────────────────────────────────

  @Patch(':id/status')
  @ApiOperation({ summary: '권장 상태 변경 (APPROVED / DEFERRED / REJECTED 등)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecommendationStatusDto,
  ) {
    return this.service.updateStatus(req.user.organizationId, id, dto, req.user._id);
  }

  // ── 워커 내부 엔드포인트 ─────────────────────────────────────────────────

  @Post('internal/from-risk-score')
  @SkipAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Internal] 워커 → 위험도 기반 권장 생성' })
  async internalGenerate(
    @Headers('x-worker-secret') secret: string,
    @Headers('x-org-id') orgId: string,
    @Body() body: { riskScoreId: string },
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid worker secret');
    return this.service.createFromWorker(orgId, body.riskScoreId);
  }
}
