// apps/api/src/modules/defect-candidates/defect-candidates.controller.ts
import {
  Controller, Get, Post, Patch,
  Param, Body, Query, HttpCode, HttpStatus,
  UnauthorizedException, Headers,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiHeader,
} from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SkipAuth } from '../../common/decorators/skip-auth.decorator'
import { UserRole, CandidateDefectType, CandidateSourceType, CandidateReviewStatus } from '@ax/shared'
import { DefectCandidatesService } from './defect-candidates.service'
import {
  ReviewCandidateDto, PromoteCandidateDto,
  CandidateQueryDto, BatchCreateCandidatesDto,
} from './dto/defect-candidate.dto'

@ApiTags('Defect Candidates — 결함 후보 (AI 탐지)')
@ApiBearerAuth()
@Controller({ path: 'defect-candidates', version: '1' })
export class DefectCandidatesController {
  constructor(private readonly svc: DefectCandidatesService) {}

  // ── 목록 조회 ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결함 후보 목록 조회 (필터 + 페이지네이션)' })
  @ApiQuery({ name: 'complexId',       required: false })
  @ApiQuery({ name: 'buildingId',      required: false })
  @ApiQuery({ name: 'sourceType',      required: false, enum: CandidateSourceType })
  @ApiQuery({ name: 'sourceMissionId', required: false })
  @ApiQuery({ name: 'defectType',      required: false, enum: CandidateDefectType })
  @ApiQuery({ name: 'reviewStatus',    required: false, enum: CandidateReviewStatus })
  @ApiQuery({ name: 'confidenceLevel', required: false, enum: ['AUTO_ACCEPT', 'REQUIRES_REVIEW', 'MANUAL_REQUIRED'] })
  @ApiQuery({ name: 'page',            required: false, type: Number })
  @ApiQuery({ name: 'limit',           required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query() query: CandidateQueryDto,
  ) {
    return this.svc.findAll(user.organizationId, query)
  }

  // ── 단건 조회 ─────────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결함 후보 단건 조회' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.findById(user.organizationId, id)
  }

  // ── 검토 (승인/기각) ──────────────────────────────────────────────────────────

  @Patch(':id/review')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '결함 후보 검토 (APPROVED / REJECTED)',
    description: '검토 후 APPROVED 상태에서 /promote 로 Defect 승격 가능',
  })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewCandidateDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.review(user.organizationId, id, dto, user._id)
  }

  // ── Defect 승격 ───────────────────────────────────────────────────────────────

  @Post(':id/promote')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '결함 후보 → Defect 승격',
    description: 'PENDING 또는 APPROVED 상태의 후보를 공식 결함 문서로 변환합니다.',
  })
  promote(
    @Param('id') id: string,
    @Body() dto: PromoteCandidateDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.promoteToDefect(user.organizationId, id, dto, user._id)
  }

  // ── [내부] 워커 배치 생성 ─────────────────────────────────────────────────────

  @Post('internal/batch')
  @SkipAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[내부] ai-worker 탐지 결과 배치 저장 — X-Worker-Secret 헤더 필수',
    description: 'JWT 인증 없음. ai-worker가 DEFECT_DETECTION 처리 후 후보를 일괄 저장합니다.',
  })
  @ApiHeader({ name: 'X-Worker-Secret', required: true })
  batchCreate(
    @Headers('x-worker-secret') workerSecret: string,
    @Body() dto: BatchCreateCandidatesDto,
  ) {
    const expected = process.env.WORKER_SECRET
    if (!expected || workerSecret !== expected) {
      throw new UnauthorizedException('Invalid worker secret')
    }
    return this.svc.batchCreate(dto as any)
  }
}
