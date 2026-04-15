// apps/ai-worker/src/adapters/mock-llm-diagnosis.adapter.ts
// Mock LLM 어댑터 — 실제 LLM 없이 결정론적 진단 의견 반환
// 프로덕션 교체 시: { provide: LLM_DIAGNOSIS_ADAPTER, useClass: OpenAiDiagnosisAdapter }
//                   { provide: LLM_DIAGNOSIS_ADAPTER, useClass: ClaudeDiagnosisAdapter }
import { Injectable } from '@nestjs/common'
import { LlmDiagnosisAdapter, LlmDiagnosisInput, LlmDiagnosisOutput } from './llm-diagnosis.adapter'
import { DiagnosisUrgency, RepairRecommendationDraft } from '@ax/shared'

/** targetId 기반 결정론적 해시 */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

interface MockScenario {
  urgency: DiagnosisUrgency
  priorityScore: number
  confidence: number
  summary: string
  technicalOpinionDraft: string
  recommendations: RepairRecommendationDraft[]
}

const MOCK_SCENARIOS: MockScenario[] = [
  // 0 — CRITICAL: 즉시 조치 (균열 임계치 초과 + 민원 다수)
  {
    urgency: DiagnosisUrgency.IMMEDIATE,
    priorityScore: 95,
    confidence: 0.88,
    summary: '구조 균열 확대 및 복합 결함 발생 — 즉시 안전 점검 필요',
    technicalOpinionDraft:
      `## 진단 의견 초안\n\n현장 점검 데이터를 종합 분석한 결과, **균열 폭이 기준치(0.3mm)를 초과**하고 있으며 ` +
      `누수 결함이 복합적으로 발생하고 있습니다.\n\n### 주요 소견\n- 외벽 균열 폭 측정값이 KCS 41 55 02 기준치를 초과함\n` +
      `- 균열 진행 방향이 하중 전달 경로와 교차하여 구조 안전성 우려\n- 누수로 인한 철근 부식 가능성 존재\n\n` +
      `### 조치 필요 사항\n1. 즉시 안전 전문가 현장 점검 실시\n2. 균열 진행 모니터링 강화 (주 1회 이상)\n` +
      `3. 임시 방수 조치 선행 후 구조 보강 공사 계획 수립\n\n> ⚠️ 본 의견은 AI 초안으로 전문 검토자 승인 전 공식 사용 불가`,
    recommendations: [
      {
        recommendedAction: '긴급 구조 안전 점검 실시',
        actionDetail: '전문 구조기술사 현장 방문 및 상세 안전 점검 실시. 필요시 접근 통제 조치.',
        recommendedTimeline: 'IMMEDIATE',
        priorityRank: 1,
        kcsStandardRef: 'KCS 41 55 02',
        kcsComplianceNote: '균열 폭 0.3mm 초과 시 구조 안전 점검 의무 (KCS 기준)',
      },
      {
        recommendedAction: '균열 주입 공법 적용 (에폭시/폴리우레탄)',
        actionDetail: '균열 세정 후 에폭시 수지 저압 주입, 표면 방수 마감 처리',
        recommendedTimeline: 'WITHIN_1_WEEK',
        priorityRank: 2,
        kcsStandardRef: 'KCS 41 55 02',
        estimatedCostRange: { min: 500000, max: 2000000, currency: 'KRW' },
      },
    ],
  },

  // 1 — HIGH: 긴급 조치 (누수 복합)
  {
    urgency: DiagnosisUrgency.URGENT,
    priorityScore: 78,
    confidence: 0.82,
    summary: '누수 및 박리 복합 발생 — 1주 이내 보수 필요',
    technicalOpinionDraft:
      `## 진단 의견 초안\n\n외벽 누수와 마감재 박리가 복합적으로 확인됩니다.\n\n### 주요 소견\n` +
      `- 창호 주변 실링재 노화에 의한 누수 경로 형성\n- 마감재 박리로 인해 구조체 직접 노출\n` +
      `- 민원 접수 다수 — 입주민 생활 불편 지속\n\n### 권고 사항\n긴급 방수 처리 후 원인 규명 및 항구적 보수 계획 수립 필요.\n\n` +
      `> ⚠️ 본 의견은 AI 초안으로 전문 검토자 승인 전 공식 사용 불가`,
    recommendations: [
      {
        recommendedAction: '창호 주변 실링재 재충전 및 방수 처리',
        actionDetail: '기존 열화된 실링재 제거 후 성능인증 방수 실링재 재시공',
        recommendedTimeline: 'WITHIN_1_WEEK',
        priorityRank: 1,
        estimatedCostRange: { min: 200000, max: 800000, currency: 'KRW' },
      },
      {
        recommendedAction: '마감재 박리 부위 철거 및 재시공',
        actionDetail: '박리된 마감재 전면 철거 후 구조체 건조 확인, 새 마감재 시공',
        recommendedTimeline: 'WITHIN_1_MONTH',
        priorityRank: 2,
        kcsStandardRef: 'KCS 41 40 06',
        estimatedCostRange: { min: 1000000, max: 5000000, currency: 'KRW' },
      },
    ],
  },

  // 2 — MEDIUM: 일반 보수 (경미한 균열)
  {
    urgency: DiagnosisUrgency.ROUTINE,
    priorityScore: 52,
    confidence: 0.75,
    summary: '경미한 표면 균열 — 일상 유지관리 수준 보수 권고',
    technicalOpinionDraft:
      `## 진단 의견 초안\n\n표면 마감재에 경미한 균열이 확인되나 구조 안전성에는 영향이 없는 수준입니다.\n\n` +
      `### 주요 소견\n- 균열 폭이 KCS 허용 기준(0.3mm) 이내\n- 건물 하중 전달과 무관한 비구조 균열로 판단\n` +
      `- 정기 관찰 및 유지관리 프로그램 적용 적합\n\n### 권고 사항\n` +
      `다음 정기 점검 주기에 보수 계획 포함 권고. 진행 중지 확인 후 표면 코팅 처리.\n\n` +
      `> ⚠️ 본 의견은 AI 초안으로 전문 검토자 승인 전 공식 사용 불가`,
    recommendations: [
      {
        recommendedAction: '표면 균열 V-컷 후 탄성 실링재 충전',
        actionDetail: '균열부 V형 홈 파기(깊이 10mm) 후 탄성 폴리우레탄 실링재 충전 및 표면 마감',
        recommendedTimeline: 'WITHIN_1_MONTH',
        priorityRank: 1,
        kcsStandardRef: 'KCS 41 55 02',
        estimatedCostRange: { min: 100000, max: 500000, currency: 'KRW' },
      },
    ],
  },

  // 3 — LOW: 계획 보수 (예방적 유지관리)
  {
    urgency: DiagnosisUrgency.PLANNED,
    priorityScore: 30,
    confidence: 0.68,
    summary: '노후화 진행 — 연간 예방 유지관리 계획 수립 권고',
    technicalOpinionDraft:
      `## 진단 의견 초안\n\n전반적인 노후화가 진행되고 있으나 즉각적인 안전 위협은 없습니다.\n\n` +
      `### 주요 소견\n- 준공 후 15년 이상 경과로 마감재 전반 노후화\n- 현시점에서 안전성 위협 요인 없음\n` +
      `- 예방 차원 유지관리 필요\n\n### 권고 사항\n` +
      `연간 유지관리 계획에 포함하여 정기적인 방수 도막 재도포 및 마감재 교체 검토.\n\n` +
      `> ⚠️ 본 의견은 AI 초안으로 전문 검토자 승인 전 공식 사용 불가`,
    recommendations: [
      {
        recommendedAction: '외벽 방수 도막 재도포',
        actionDetail: '기존 방수층 점검 후 부분 또는 전면 재도포. 탄성 도막 방수재 사용.',
        recommendedTimeline: 'ANNUAL_PLAN',
        priorityRank: 1,
        estimatedCostRange: { min: 3000000, max: 15000000, currency: 'KRW' },
      },
    ],
  },

  // 4 — URGENT: 부식 진행
  {
    urgency: DiagnosisUrgency.URGENT,
    priorityScore: 70,
    confidence: 0.79,
    summary: '철재 구조물 부식 진행 — 내식성 처리 긴급 필요',
    technicalOpinionDraft:
      `## 진단 의견 초안\n\n철재 구조물에 부식이 진행 중이며 방치 시 단면 감소로 이어질 수 있습니다.\n\n` +
      `### 주요 소견\n- 표면 녹 발생 단계 확인됨\n- 누수 경로와 인접하여 부식 가속 가능성\n` +
      `- 구조 내력 저하 전 선제적 조치 필요\n\n### 권고 사항\n` +
      `녹 제거 후 방청 처리 및 방수 마감 우선 적용, 중기적으로 구조체 점검 실시.\n\n` +
      `> ⚠️ 본 의견은 AI 초안으로 전문 검토자 승인 전 공식 사용 불가`,
    recommendations: [
      {
        recommendedAction: '블라스팅(샌드/쇼트) 후 에폭시 방청 도장',
        actionDetail: '표면 녹 완전 제거(Sa 2.5 등급) 후 에폭시 방청 하도+중도+우레탄 상도 3회 도장',
        recommendedTimeline: 'WITHIN_1_WEEK',
        priorityRank: 1,
        kcsStandardRef: 'KCS 41 40 06',
        estimatedCostRange: { min: 800000, max: 3000000, currency: 'KRW' },
      },
      {
        recommendedAction: '인접 방수층 점검 및 보수',
        actionDetail: '부식 원인이 되는 누수 경로 차단을 위해 인접 방수층 상태 점검 및 필요 시 보수',
        recommendedTimeline: 'WITHIN_1_MONTH',
        priorityRank: 2,
      },
    ],
  },
]

@Injectable()
export class MockLlmDiagnosisAdapter implements LlmDiagnosisAdapter {
  async generate(input: LlmDiagnosisInput): Promise<LlmDiagnosisOutput> {
    // 결정론적 시나리오 선택 (targetId 해시)
    const h = hashCode(input.context.targetId)
    const scenario = MOCK_SCENARIOS[h % MOCK_SCENARIOS.length]

    // 모의 처리 지연 (400~900ms)
    const delay = 400 + (h % 500)
    await new Promise(r => setTimeout(r, delay))

    // 컨텍스트에 따라 신뢰도 미세 조정
    const defectCount = input.context.defects.length
    const hasCritical = input.context.defects.some(d => d.severity === 'CRITICAL')
    const confidenceAdjust = hasCritical ? 0.05 : defectCount > 3 ? 0.02 : 0

    return {
      summary: scenario.summary,
      technicalOpinionDraft: scenario.technicalOpinionDraft,
      urgency: scenario.urgency,
      estimatedPriorityScore: scenario.priorityScore,
      confidence: Math.min(1, scenario.confidence + confidenceAdjust),
      recommendations: scenario.recommendations,
      modelVersion: 'mock-llm-1.0.0',
      tokensUsed: 800 + (h % 400),
      rawResponse: JSON.stringify({
        summary: scenario.summary,
        technicalOpinionDraft: scenario.technicalOpinionDraft,
        urgency: scenario.urgency,
        estimatedPriorityScore: scenario.priorityScore,
        confidence: scenario.confidence,
        recommendations: scenario.recommendations,
      }),
    }
  }
}
