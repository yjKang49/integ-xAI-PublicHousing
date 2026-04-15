// apps/api/src/modules/ai-inspection/ai-inspection.module.ts
// AX-SPRINT — AI 현장점검 10단계 자동화 모듈
//
// 10단계 자동화 파이프라인:
//   1단계  도면 기반 위치 자동매핑 (GPS + 도면 교차 참조)
//   2단계  작업 유형별 체크리스트 자동 로딩 (건설기술진흥법 시행령 기준)
//   3단계  실시간 결함 탐지 (Y-MaskNet / Mask R-CNN — 균열·누수·재료분리·철근노출)
//   4단계  AI 신뢰도 점수 부여 (≥90% AUTO, 80~89% REVIEW, <80% MANUAL)
//   5단계  KCS 전문용어 기반 자동 캡셔닝
//   6단계  법적 기준·KCS 즉시 대조 (허용 기준 초과 여부 자동 판정)
//   7단계  위험 등급 자동 분류 (국토관리청 기준 우선순위 점수화)
//   8단계  반자동 보고서 초안 생성 (80%+ 완성, 엔지니어 저확률 항목 검토)
//   9단계  피드백 학습 (엔지니어 오분류 수정 → AI 모델 강화학습)
//  10단계  안전관리계획 연동 및 법정 제출 자동화

import { Module } from '@nestjs/common';
import { AiInspectionService } from './ai-inspection.service';
import { AiInspectionController } from './ai-inspection.controller';

@Module({
  controllers: [AiInspectionController],
  providers: [AiInspectionService],
  exports: [AiInspectionService],
})
export class AiInspectionModule {}
