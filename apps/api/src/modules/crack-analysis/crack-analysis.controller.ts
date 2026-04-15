// apps/api/src/modules/crack-analysis/crack-analysis.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, Headers, UnauthorizedException,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { Roles } from '../../common/decorators/roles.decorator'
import { SkipAuth } from '../../common/decorators/skip-auth.decorator'
import { UserRole } from '@ax/shared'
import { CrackAnalysisService } from './crack-analysis.service'
import {
  TriggerCrackAnalysisDto,
  ReviewCrackAnalysisDto,
  CrackAnalysisQueryDto,
  SaveCrackAnalysisResultDto,
} from './dto/crack-analysis.dto'

@ApiTags('crack-analysis')
@ApiBearerAuth()
@Controller('crack-analysis')
export class CrackAnalysisController {
  constructor(
    private readonly service: CrackAnalysisService,
    private readonly configService: ConfigService,
  ) {}

  // ── 분석 트리거 ─────────────────────────────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: '균열 심층 분석 트리거 (CRACK_ANALYSIS Job 생성)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  async trigger(
    @Request() req: any,
    @Body() dto: TriggerCrackAnalysisDto,
  ) {
    const orgId: string = req.user.orgId
    return this.service.trigger(orgId, dto, req.user.sub)
  }

  // ── 목록 조회 ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '균열 분석 결과 목록' })
  async findAll(
    @Request() req: any,
    @Query() query: CrackAnalysisQueryDto,
  ) {
    return this.service.findAll(req.user.orgId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: '균열 분석 결과 통계' })
  async getStats(
    @Request() req: any,
    @Query('gaugePointId') gaugePointId?: string,
  ) {
    return this.service.getStats(req.user.orgId, gaugePointId)
  }

  @Get(':id')
  @ApiOperation({ summary: '균열 분석 결과 상세' })
  async findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.service.findOne(req.user.orgId, id)
  }

  // ── 검토 ────────────────────────────────────────────────────────────────────

  @Patch(':id/review')
  @ApiOperation({ summary: '균열 분석 결과 검토 (수용/보정/기각)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  async review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewCrackAnalysisDto,
  ) {
    return this.service.review(req.user.orgId, id, dto, req.user.sub)
  }

  // ── 워커 내부 엔드포인트 ──────────────────────────────────────────────────────

  @Post('internal/result')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Internal] AI 워커 → 분석 결과 저장' })
  async saveResult(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: SaveCrackAnalysisResultDto,
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET')
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid worker secret')
    }
    await this.service.saveWorkerResult(dto)
  }
}
