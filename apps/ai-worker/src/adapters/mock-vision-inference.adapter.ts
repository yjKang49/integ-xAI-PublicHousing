// apps/ai-worker/src/adapters/mock-vision-inference.adapter.ts
// Mock Vision 추론 어댑터 — 개발/테스트용. 실제 모델 없이 그럴듯한 결과 생성

import { Injectable, Logger } from '@nestjs/common'
import {
  VisionInferenceAdapter,
  VisionInferenceInput,
  VisionInferenceResult,
  VisionCandidateResult,
} from './vision-inference.adapter'

// ── 결함 유형별 Mock 시나리오 ──────────────────────────────────────────────────

interface MockScenario {
  defectType: string
  confidence: number
  bbox: [number, number, number, number]
  suggestedSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  aiCaption: string
  kcsStandardRef: string
  kcsExceedsLimit: boolean
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    defectType:       'CRACK',
    confidence:       0.94,
    bbox:             [0.12, 0.25, 0.18, 0.08],
    suggestedSeverity: 'MEDIUM',
    aiCaption:        'RC 외벽 수직 건조수축 균열 — 폭 0.4mm, 길이 약 35cm',
    kcsStandardRef:   'KCS 41 55 02',
    kcsExceedsLimit:  true,
  },
  {
    defectType:       'CRACK',
    confidence:       0.87,
    bbox:             [0.55, 0.40, 0.22, 0.05],
    suggestedSeverity: 'LOW',
    aiCaption:        'RC 슬래브 하면 사선 균열 — 폭 0.2mm 미만',
    kcsStandardRef:   'KCS 41 55 02',
    kcsExceedsLimit:  false,
  },
  {
    defectType:       'LEAK',
    confidence:       0.91,
    bbox:             [0.30, 0.10, 0.25, 0.30],
    suggestedSeverity: 'HIGH',
    aiCaption:        '외벽 누수 흔적 — 철근 부식 위험 동반 가능성',
    kcsStandardRef:   'KCS 41 40 06',
    kcsExceedsLimit:  true,
  },
  {
    defectType:       'DELAMINATION',
    confidence:       0.82,
    bbox:             [0.60, 0.55, 0.20, 0.20],
    suggestedSeverity: 'HIGH',
    aiCaption:        '마감 모르타르 박락 — 면적 약 0.6㎡',
    kcsStandardRef:   'KCS 41 55 02',
    kcsExceedsLimit:  true,
  },
  {
    defectType:       'CORROSION',
    confidence:       0.88,
    bbox:             [0.08, 0.60, 0.15, 0.12],
    suggestedSeverity: 'CRITICAL',
    aiCaption:        '철근 노출 및 부식 — 단면 손실 동반, 즉시 조치 필요',
    kcsStandardRef:   'KCS 14 20 22',
    kcsExceedsLimit:  true,
  },
  {
    defectType:       'EFFLORESCENCE',
    confidence:       0.79,
    bbox:             [0.40, 0.70, 0.30, 0.15],
    suggestedSeverity: 'LOW',
    aiCaption:        '외벽 백태 — 누수 경로 추적 점검 권장',
    kcsStandardRef:   'KCS 41 55 04',
    kcsExceedsLimit:  false,
  },
  {
    defectType:       'SPOILING',
    confidence:       0.76,
    bbox:             [0.20, 0.45, 0.35, 0.20],
    suggestedSeverity: 'LOW',
    aiCaption:        '외벽 오손 — 미관 결함, 청소 또는 도장 필요',
    kcsStandardRef:   'KCS 41 55 03',
    kcsExceedsLimit:  false,
  },
  {
    defectType:       'FIRE_RISK_CLADDING',
    confidence:       0.93,
    bbox:             [0.10, 0.05, 0.80, 0.40],
    suggestedSeverity: 'CRITICAL',
    aiCaption:        '화재위험 외장 패널 의심 — 전문가 현장 점검 즉시 필요',
    kcsStandardRef:   'KCS 41 55 08',
    kcsExceedsLimit:  true,
  },
]

// ── Mock 어댑터 구현 ─────────────────────────────────────────────────────────

@Injectable()
export class MockVisionInferenceAdapter implements VisionInferenceAdapter {
  private readonly logger = new Logger(MockVisionInferenceAdapter.name)

  async detect(input: VisionInferenceInput): Promise<VisionInferenceResult> {
    const startTime = Date.now()

    // storageKey를 시드로 결정론적 선택 (같은 이미지는 항상 같은 결과)
    const seed = this.hashCode(input.storageKey)

    // confidenceThreshold 이상인 시나리오만 선택
    const eligible = MOCK_SCENARIOS.filter(
      (s) => s.confidence >= input.confidenceThreshold,
    )

    // seed 기반으로 1~3개 선택
    const count = Math.min(
      1 + (Math.abs(seed) % 3),
      eligible.length,
      input.maxDetections,
    )

    const selected: MockScenario[] = []
    const used = new Set<number>()
    for (let i = 0; i < count; i++) {
      const idx = Math.abs(seed + i * 7) % eligible.length
      if (!used.has(idx)) {
        used.add(idx)
        selected.push(eligible[idx])
      }
    }

    // 추론 시뮬레이션 딜레이 (200~500ms)
    await new Promise((r) => setTimeout(r, 200 + (Math.abs(seed) % 300)))

    const candidates: VisionCandidateResult[] = selected.map((s) => ({
      defectType:       s.defectType as any,
      confidence:       s.confidence,
      confidenceLevel:  this.toConfidenceLevel(s.confidence),
      bbox:             s.bbox,
      suggestedSeverity: s.suggestedSeverity,
      aiCaption:        s.aiCaption,
      kcsStandardRef:   s.kcsStandardRef,
      kcsExceedsLimit:  s.kcsExceedsLimit,
    }))

    this.logger.debug(
      `MockInference: storageKey=${input.storageKey} detected=${candidates.length} threshold=${input.confidenceThreshold}`,
    )

    return {
      candidates,
      modelVersion: 'mock-v0.1',
      processedAt:  new Date().toISOString(),
      inferenceTimeMs: Date.now() - startTime,
    }
  }

  private toConfidenceLevel(
    confidence: number,
  ): 'AUTO_ACCEPT' | 'REQUIRES_REVIEW' | 'MANUAL_REQUIRED' {
    if (confidence >= 0.9) return 'AUTO_ACCEPT'
    if (confidence >= 0.8) return 'REQUIRES_REVIEW'
    return 'MANUAL_REQUIRED'
  }

  /** djb2 hash — 결정론적 seed 생성 */
  private hashCode(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i)
    }
    return hash
  }
}
