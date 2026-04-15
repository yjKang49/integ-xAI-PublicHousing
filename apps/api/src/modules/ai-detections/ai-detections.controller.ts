// apps/api/src/modules/ai-detections/ai-detections.controller.ts
import {
  Controller, Get, Post, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '@ax/shared'
import { AiDetectionsService } from './ai-detections.service'
import { TriggerDetectionDto, TriggerMissionDetectionDto } from './dto/ai-detection.dto'

@ApiTags('AI Detections — 결함 자동 탐지')
@ApiBearerAuth()
@Controller({ path: 'ai-detections', version: '1' })
export class AiDetectionsController {
  constructor(private readonly svc: AiDetectionsService) {}

  // ── 단일 이미지 탐지 트리거 ────────────────────────────────────────────────────

  @Post('trigger')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '단일 이미지 결함 탐지 Job 생성',
    description:
      'Feature flag ai.defect_detection 이 활성화된 경우에만 실행됩니다. ' +
      'ai-worker가 처리 후 /defect-candidates/internal/batch 를 통해 결과를 저장합니다.',
  })
  trigger(@Body() dto: TriggerDetectionDto, @CurrentUser() user: any) {
    return this.svc.triggerDetection(user.organizationId, dto, user._id)
  }

  // ── 드론 미션 전체 일괄 탐지 트리거 ──────────────────────────────────────────

  @Post('missions/:missionId/trigger')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '드론 미션 전체 미디어 결함 탐지 일괄 Job 생성',
    description: '미션 내 DONE 상태 미디어 항목 각각에 대해 DEFECT_DETECTION Job을 생성합니다.',
  })
  triggerMission(
    @Param('missionId') missionId: string,
    @Body() dto: TriggerMissionDetectionDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.triggerMissionDetection(user.organizationId, missionId, dto, user._id)
  }

  // ── 미션별 후보 목록 ──────────────────────────────────────────────────────────

  @Get('missions/:missionId/candidates')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: '드론 미션의 탐지 결함 후보 목록' })
  @ApiQuery({ name: 'defectType',   required: false })
  @ApiQuery({ name: 'reviewStatus', required: false })
  @ApiQuery({ name: 'page',         required: false, type: Number })
  @ApiQuery({ name: 'limit',        required: false, type: Number })
  listMissionCandidates(
    @Param('missionId') missionId: string,
    @Query('defectType')   defectType?: string,
    @Query('reviewStatus') reviewStatus?: string,
    @Query('page')         page?: number,
    @Query('limit')        limit?: number,
    @CurrentUser() user?: any,
  ) {
    return this.svc.listMissionCandidates(user!.organizationId, missionId, {
      defectType, reviewStatus, page, limit,
    })
  }

  // ── 탐지 통계 ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN, UserRole.VIEWER)
  @ApiOperation({ summary: '결함 후보 검토 현황 통계 (org 전체 또는 단지별)' })
  @ApiQuery({ name: 'complexId', required: false })
  getStats(
    @Query('complexId') complexId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.svc.getDetectionStats(user!.organizationId, complexId)
  }
}
