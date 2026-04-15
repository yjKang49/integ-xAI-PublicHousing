// apps/api/src/modules/risk-scoring/risk-scoring.controller.ts
// Phase 2-9: 위험도 스코어 REST 컨트롤러

import {
  Controller, Get, Post, Body, Param, Query,
  Request, Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { UserRole, RiskTargetType } from '@ax/shared';
import { RiskScoringService } from './risk-scoring.service';
import { TriggerRiskCalculationDto, RiskScoreQueryDto } from './dto/risk-scoring.dto';

@ApiTags('risk-scoring')
@ApiBearerAuth()
@Controller('risk-scoring')
export class RiskScoringController {
  constructor(
    private readonly service: RiskScoringService,
    private readonly configService: ConfigService,
  ) {}

  // ── 계산 트리거 (비동기, Bull 큐) ─────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: '위험도 계산 트리거 (비동기 Bull Job)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async trigger(@Request() req: any, @Body() dto: TriggerRiskCalculationDto) {
    return this.service.triggerCalculation(req.user.organizationId, dto, req.user._id);
  }

  // ── 즉시 계산 (동기) ────────────────────────────────────────────────────

  @Post('calculate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '위험도 즉시 계산 및 저장 (동기)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async calculateNow(@Request() req: any, @Body() dto: TriggerRiskCalculationDto) {
    return this.service.calculateNow(req.user.organizationId, dto, req.user._id);
  }

  // ── 목록 조회 ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '위험도 스코어 목록 조회 (isLatest=true)' })
  async findAll(@Request() req: any, @Query() query: RiskScoreQueryDto) {
    return this.service.findAll(req.user.organizationId, query);
  }

  // ── 단건 조회 ────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: '위험도 스코어 단건 조회' })
  async findById(@Request() req: any, @Param('id') id: string) {
    return this.service.findById(req.user.organizationId, id);
  }

  // ── 워커 내부 엔드포인트 ─────────────────────────────────────────────────

  @Post('internal/compute')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Internal] 위험도 계산 실행 (워커 호출)' })
  async internalCompute(
    @Headers('x-worker-secret') secret: string,
    @Headers('x-org-id') orgId: string,
    @Body() body: { complexId: string; targetType: string; targetId: string; targetName: string },
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid worker secret');
    return this.service.computeRiskScore(
      orgId, body.complexId, body.targetType as RiskTargetType, body.targetId, body.targetName,
    );
  }

  @Post('internal/save')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Internal] 위험도 계산 결과 저장 (워커 호출)' })
  async internalSave(
    @Headers('x-worker-secret') secret: string,
    @Headers('x-org-id') orgId: string,
    @Body() body: any,
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid worker secret');
    await this.service.saveWorkerResult(orgId, body);
  }
}
