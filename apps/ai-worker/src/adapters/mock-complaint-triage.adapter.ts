// apps/ai-worker/src/adapters/mock-complaint-triage.adapter.ts
// Mock 분류 어댑터 — 실제 LLM 없이 결정론적 결과 반환
// 프로덕션 교체 시:
//   { provide: COMPLAINT_TRIAGE_ADAPTER, useClass: ClaudeComplaintTriageAdapter }
//   { provide: COMPLAINT_TRIAGE_ADAPTER, useClass: OpenAiComplaintTriageAdapter }
import { Injectable } from '@nestjs/common'
import {
  ComplaintTriageAdapter,
  ComplaintTriageInput,
  ComplaintTriageOutput,
} from './complaint-triage.adapter'
import { TriagePromptResult } from '../prompts/complaint-triage.prompt'

/** 입력 문자열 기반 결정론적 해시 */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// ── Rule-based 키워드 분류 ────────────────────────────────────────────────────

interface KeywordRule {
  keywords: string[]
  category: string
  severity: string
  urgencyBase: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  sla: string
  teamId: string
  teamName: string
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords: ['누수', '물', '천장', '방수', '습기', '곰팡이'],
    category: 'FACILITY', severity: 'HIGH', urgencyBase: 70,
    priority: 'HIGH', sla: '48h',
    teamId: 'waterproof-team', teamName: '방수·누수 처리팀',
  },
  {
    keywords: ['균열', '크랙', '갈라짐', '구조'],
    category: 'FACILITY', severity: 'HIGH', urgencyBase: 75,
    priority: 'HIGH', sla: '48h',
    teamId: 'structural-team', teamName: '구조물 점검팀',
  },
  {
    keywords: ['안전', '위험', '위해', '사고', '추락', '넘어짐'],
    category: 'SAFETY', severity: 'CRITICAL', urgencyBase: 90,
    priority: 'URGENT', sla: '24h',
    teamId: 'safety-team', teamName: '안전관리팀',
  },
  {
    keywords: ['엘리베이터', '승강기', '리프트'],
    category: 'ELEVATOR', severity: 'HIGH', urgencyBase: 80,
    priority: 'HIGH', sla: '24h',
    teamId: 'elevator-team', teamName: '엘리베이터 유지보수팀',
  },
  {
    keywords: ['소음', '층간', '소리', '진동', '시끄'],
    category: 'NOISE', severity: 'MEDIUM', urgencyBase: 50,
    priority: 'MEDIUM', sla: '72h',
    teamId: 'noise-team', teamName: '층간소음 민원팀',
  },
  {
    keywords: ['주차', '차량', '불법주차', '주차장'],
    category: 'PARKING', severity: 'LOW', urgencyBase: 30,
    priority: 'LOW', sla: '7d',
    teamId: 'parking-team', teamName: '주차관리팀',
  },
  {
    keywords: ['위생', '청소', '쓰레기', '해충', '벌레'],
    category: 'SANITATION', severity: 'MEDIUM', urgencyBase: 55,
    priority: 'MEDIUM', sla: '48h',
    teamId: 'sanitation-team', teamName: '위생관리팀',
  },
]

/** 텍스트에서 키워드 규칙 매칭 */
function matchKeywordRule(text: string): { rule: KeywordRule; matches: string[] } | null {
  const lower = text.toLowerCase()
  for (const rule of KEYWORD_RULES) {
    const hits = rule.keywords.filter(k => lower.includes(k))
    if (hits.length > 0) return { rule, matches: hits }
  }
  return null
}

// ── Mock 시나리오 ─────────────────────────────────────────────────────────────

const MOCK_SCENARIOS: TriagePromptResult[] = [
  // 0 — SAFETY: 긴급
  {
    category: 'SAFETY',
    severity: 'CRITICAL',
    urgencyScore: 92,
    suggestedPriority: 'URGENT',
    suggestedSla: '24h',
    routingSuggestions: [
      { type: 'TEAM', targetId: 'safety-team', targetName: '안전관리팀', reason: '안전 위해 요소가 확인되어 즉시 현장 점검 필요', confidence: 0.91 },
      { type: 'TEAM', targetId: 'facility-team', targetName: '시설관리팀', reason: '시설물 결함이 안전사고 원인일 수 있어 동반 점검 권장', confidence: 0.72 },
    ],
    classificationReason: '민원 내용에 "위험", "추락" 키워드가 포함되어 있으며 즉각적인 안전 위협으로 판단됩니다. 공용구역 내 안전 위해 시설은 24시간 내 현장 조치가 필요합니다.',
    keywordMatches: ['위험', '안전'],
    confidence: 0.91,
  },
  // 1 — ELEVATOR: 높은 긴급도
  {
    category: 'ELEVATOR',
    severity: 'HIGH',
    urgencyScore: 82,
    suggestedPriority: 'HIGH',
    suggestedSla: '24h',
    routingSuggestions: [
      { type: 'TEAM', targetId: 'elevator-team', targetName: '엘리베이터 유지보수팀', reason: '승강기 고장은 노약자·장애인 이동권 침해로 즉시 점검 필요', confidence: 0.88 },
    ],
    classificationReason: '엘리베이터 관련 민원으로 승강기 유지보수 전문팀의 신속한 대응이 필요합니다. 운행 중단 또는 이상 소음은 24시간 내 조치가 원칙입니다.',
    keywordMatches: ['엘리베이터'],
    confidence: 0.88,
  },
  // 2 — FACILITY/LEAK: 보통 긴급도
  {
    category: 'FACILITY',
    severity: 'HIGH',
    urgencyScore: 68,
    suggestedPriority: 'HIGH',
    suggestedSla: '48h',
    routingSuggestions: [
      { type: 'TEAM', targetId: 'waterproof-team', targetName: '방수·누수 처리팀', reason: '누수는 곰팡이·구조 손상으로 확대될 수 있어 신속한 대응 필요', confidence: 0.84 },
      { type: 'TEAM', targetId: 'facility-team', targetName: '시설관리팀', reason: '배관 점검 등 시설물 전반 확인 병행 권장', confidence: 0.65 },
    ],
    classificationReason: '누수 관련 민원으로 방수·누수 전문팀의 현장 확인이 필요합니다. 방치 시 구조물 손상 및 주거환경 악화가 우려됩니다.',
    keywordMatches: ['누수', '물'],
    confidence: 0.84,
  },
  // 3 — NOISE: 낮은 긴급도
  {
    category: 'NOISE',
    severity: 'MEDIUM',
    urgencyScore: 45,
    suggestedPriority: 'MEDIUM',
    suggestedSla: '72h',
    routingSuggestions: [
      { type: 'TEAM', targetId: 'noise-team', targetName: '층간소음 민원팀', reason: '층간소음 분쟁은 중재 전문팀의 조정 절차 진행이 효과적', confidence: 0.79 },
    ],
    classificationReason: '층간 소음 민원입니다. 관련 법령(공동주택관리법)에 따른 중재 절차를 안내하고 72시간 내 초기 접촉 및 조정 절차를 진행합니다.',
    keywordMatches: ['소음'],
    confidence: 0.79,
  },
  // 4 — OTHER: 일반
  {
    category: 'OTHER',
    severity: 'LOW',
    urgencyScore: 28,
    suggestedPriority: 'LOW',
    suggestedSla: '7d',
    routingSuggestions: [
      { type: 'TEAM', targetId: 'general-team', targetName: '일반민원팀', reason: '특정 전문팀 배정이 불필요한 일반 민원', confidence: 0.62 },
    ],
    classificationReason: '특정 카테고리에 명확히 해당하지 않는 일반 민원입니다. 담당자가 내용을 직접 확인하여 적절한 부서에 배정하는 것을 권장합니다.',
    keywordMatches: [],
    confidence: 0.62,
  },
]

@Injectable()
export class MockComplaintTriageAdapter implements ComplaintTriageAdapter {
  async classify(input: ComplaintTriageInput): Promise<ComplaintTriageOutput> {
    const startMs = Date.now()
    const text = `${input.context.title} ${input.context.description} ${input.context.classificationHint ?? ''}`

    // 모의 처리 지연 (300~700ms)
    const h = hashCode(text)
    await new Promise(r => setTimeout(r, 300 + (h % 400)))

    // 1순위: 키워드 매칭 rule-based 분류 시도
    const matched = matchKeywordRule(text)
    if (matched) {
      const { rule, matches } = matched
      // urgencyScore 조정: 이미지 있으면 +5
      const urgencyScore = Math.min(100, rule.urgencyBase + (input.context.hasImage ? 5 : 0))
      const result: TriagePromptResult = {
        category:         rule.category,
        severity:         rule.severity,
        urgencyScore,
        suggestedPriority: rule.priority,
        suggestedSla:      rule.sla,
        routingSuggestions: [
          {
            type:       'TEAM',
            targetId:   rule.teamId,
            targetName: rule.teamName,
            reason:     `'${matches.join(', ')}' 키워드 기반 분류 — 해당 전문팀 신속 배정`,
            confidence: 0.80,
          },
        ],
        classificationReason: `키워드 '${matches.join(', ')}' 탐지. ${rule.teamName}으로 라우팅을 권장합니다. SLA: ${rule.sla} 이내 처리.`,
        keywordMatches: matches,
        confidence: 0.80,
      }
      return {
        result,
        modelVersion: 'mock-rule-1.0.0',
        processingTimeMs: Date.now() - startMs,
        rawResponse: JSON.stringify(result),
      }
    }

    // 2순위: 해시 기반 시나리오 선택
    const scenario = MOCK_SCENARIOS[h % MOCK_SCENARIOS.length]
    return {
      result: {
        ...scenario,
        urgencyScore: scenario.urgencyScore + (input.context.hasImage ? 3 : 0),
      },
      modelVersion: 'mock-llm-triage-1.0.0',
      tokensUsed: 500 + (h % 300),
      processingTimeMs: Date.now() - startMs,
      rawResponse: JSON.stringify(scenario),
    }
  }
}
