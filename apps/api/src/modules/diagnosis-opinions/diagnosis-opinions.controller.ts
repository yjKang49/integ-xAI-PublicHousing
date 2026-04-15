// apps/api/src/modules/diagnosis-opinions/diagnosis-opinions.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  Request, Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { Roles } from '../../common/decorators/roles.decorator'
import { SkipAuth } from '../../common/decorators/skip-auth.decorator'
import { UserRole } from '@ax/shared'
import { DiagnosisOpinionsService } from './diagnosis-opinions.service'
import {
  TriggerDiagnosisOpinionDto,
  UpdateDiagnosisOpinionDto,
  ReviewDiagnosisOpinionDto,
  DiagnosisOpinionQueryDto,
  SaveDiagnosisOpinionResultDto,
} from './dto/diagnosis-opinion.dto'

@ApiTags('diagnosis-opinions')
@ApiBearerAuth()
@Controller('diagnosis-opinions')
export class DiagnosisOpinionsController {
  constructor(
    private readonly service: DiagnosisOpinionsService,
    private readonly configService: ConfigService,
  ) {}

  // ── 분석 트리거 ─────────────────────────────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: 'AI 진단 의견 생성 트리거 (DIAGNOSIS_OPINION Job)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  async trigger(@Request() req: any, @Body() dto: TriggerDiagnosisOpinionDto) {
    return this.service.trigger(req.user.orgId, dto, req.user.sub)
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '진단 의견 목록 조회' })
  async findAll(@Request() req: any, @Query() query: DiagnosisOpinionQueryDto) {
    return this.service.findAll(req.user.orgId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: '진단 의견 통계' })
  async getStats(@Request() req: any, @Query('complexId') complexId?: string) {
    return this.service.getStats(req.user.orgId, complexId)
  }

  @Get(':id')
  @ApiOperation({ summary: '진단 의견 단건 조회' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.orgId, id)
  }

  // ── 수정 및 검토 ─────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: '진단 의견 내용 수정 (검토자)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDiagnosisOpinionDto,
  ) {
    return this.service.update(req.user.orgId, id, dto, req.user.sub)
  }

  @Post(':id/review')
  @ApiOperation({ summary: '진단 의견 검토 (승인/기각/재검토 요청)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewDiagnosisOpinionDto,
  ) {
    return this.service.review(req.user.orgId, id, dto, req.user.sub)
  }

  // ── 워커 내부 엔드포인트 ──────────────────────────────────────────────────────

  @Post('internal/result')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Internal] AI 워커 → 진단 결과 저장' })
  async saveResult(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: SaveDiagnosisOpinionResultDto & { recommendationDrafts?: any[] },
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET')
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid worker secret')
    }

    await this.service.saveWorkerResult(dto)

    // 추천 초안이 있으면 별도 저장
    if (dto.recommendationDrafts?.length) {
      await this.service.saveRecommendationDrafts(dto.orgId, dto.diagnosisId, dto.recommendationDrafts)
    }
  }
}
