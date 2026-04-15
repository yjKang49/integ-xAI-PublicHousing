// apps/api/src/modules/ai-inspection/ai-inspection.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, AiDetectionMethod } from '@ax/shared';
import {
  AiInspectionService,
  AnalyzeImageRequest,
} from './ai-inspection.service';

@ApiTags('AI 현장점검 — 10단계 자동화')
@ApiBearerAuth()
@Controller('ai-inspection')
export class AiInspectionController {
  constructor(private readonly aiInspectionService: AiInspectionService) {}

  /**
   * 3~7단계: 이미지 업로드 후 결함 자동 탐지
   * - 3단계: Y-MaskNet / Mask R-CNN 실시간 탐지
   * - 4단계: AI 신뢰도 점수 부여
   * - 5단계: KCS 전문용어 자동 캡셔닝
   * - 6단계: KCS 허용 기준 초과 여부 판정
   * - 7단계: 위험 등급 자동 분류
   */
  @Post('analyze')
  @Roles(UserRole.INSPECTOR, UserRole.REVIEWER, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI 결함 자동 탐지 (3~7단계)',
    description: `현장 사진을 분석하여 결함을 자동 탐지하고 신뢰도 점수, KCS 기준 대조, 위험 등급을 반환합니다.
    - Y-MaskNet: 드론 촬영 이미지 분석 (0.2~0.5mm 균열 해상도)
    - Mask R-CNN: 인스턴스 세그멘테이션
    - OpenCV WASM: 모바일 클라이언트 사이드 처리 결과 수신`,
  })
  async analyzeImage(
    @CurrentUser() user: { orgId: string; userId: string },
    @Body() body: AnalyzeImageRequest,
  ) {
    return this.aiInspectionService.detectDefects(body);
  }

  /**
   * 9단계: 엔지니어 피드백 학습 기록
   * AI 오분류 수정 시 호출 → Phase 2 강화학습 모델 업데이트
   */
  @Post('feedback')
  @Roles(UserRole.INSPECTOR, UserRole.REVIEWER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'AI 피드백 기록 (9단계)',
    description: '엔지니어가 AI 오분류를 수정할 때 호출합니다. Phase 2 강화학습에 반영됩니다.',
  })
  async recordFeedback(
    @CurrentUser() user: { userId: string },
    @Body() body: {
      defectId: string;
      originalPrediction: string;
      correctedValue: string;
    },
  ) {
    await this.aiInspectionService.recordFeedback({
      defectId: body.defectId,
      originalPrediction: body.originalPrediction as any,
      correctedValue: body.correctedValue as any,
      engineerId: user.userId,
    });
  }
}
