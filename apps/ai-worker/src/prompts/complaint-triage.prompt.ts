// apps/ai-worker/src/prompts/complaint-triage.prompt.ts
// 민원 AI 분류 프롬프트 템플릿 v1.0
// 민원 텍스트/이미지 기반 카테고리·심각도·긴급도·담당자 추천 생성

export const TRIAGE_PROMPT_VERSION = 'complaint-triage-v1.0'

// ── 컨텍스트 타입 ────────────────────────────────────────────────────────────

export interface ComplaintTriageContext {
  /** 민원 제목 */
  title: string
  /** 민원 내용 */
  description: string
  /** 접수자 입력 카테고리 힌트 (선택) */
  classificationHint?: string
  /** 이미지 포함 여부 */
  hasImage: boolean
  /** 이미지 URL 또는 base64 (선택, 이미지 모델용) */
  imageUrl?: string
  /** 건물 ID (선택) */
  buildingId?: string
  /** 호실 (선택) */
  unitNumber?: string
  /** 접수자 메타데이터 */
  submittedBy: string
  submittedPhone?: string
  /** 단지명 */
  complexName: string
  /** 단지 ID */
  complexId: string
}

export interface TriagePromptResult {
  category: string
  severity: string
  urgencyScore: number
  suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  suggestedSla: string
  routingSuggestions: Array<{
    type: 'USER' | 'TEAM'
    targetId: string
    targetName: string
    reason: string
    confidence: number
  }>
  classificationReason: string
  keywordMatches: string[]
  confidence: number
}

// ── 프롬프트 렌더링 ──────────────────────────────────────────────────────────

export function buildTriageSystemPrompt(): string {
  return `당신은 공공임대주택 민원 분류 전문 AI입니다.
접수된 민원의 내용을 분석하여 카테고리·심각도·긴급도·담당팀을 자동으로 분류합니다.

분류 기준:
- 카테고리: FACILITY(시설물 결함), SAFETY(안전), NOISE(소음), SANITATION(위생), PARKING(주차), ELEVATOR(엘리베이터), OTHER(기타)
- 심각도: LOW(경미), MEDIUM(보통), HIGH(높음), CRITICAL(긴급)
- 긴급도 점수: 0~100 (100이 가장 긴급)
- 우선순위: LOW / MEDIUM / HIGH / URGENT
- SLA: "24h", "48h", "72h", "7d" 중 하나

반드시 JSON 형식으로만 응답하고, 추측이나 과도한 해석은 피하세요.
제공된 민원 내용에만 근거하여 분류하세요.
담당팀 추천 시 실제 민원 내용과 카테고리를 근거로 제시하세요.`
}

export function buildTriageUserPrompt(ctx: ComplaintTriageContext): string {
  const lines: string[] = []

  lines.push(`## 민원 정보`)
  lines.push(`- 단지: ${ctx.complexName} (${ctx.complexId})`)
  if (ctx.buildingId) lines.push(`- 건물: ${ctx.buildingId}`)
  if (ctx.unitNumber) lines.push(`- 호실: ${ctx.unitNumber}`)
  lines.push(`- 접수자: ${ctx.submittedBy}`)
  lines.push(`- 이미지 포함: ${ctx.hasImage ? '예' : '아니오'}`)
  if (ctx.classificationHint) lines.push(`- 접수 키워드 힌트: ${ctx.classificationHint}`)
  lines.push('')
  lines.push(`## 민원 제목`)
  lines.push(ctx.title)
  lines.push('')
  lines.push(`## 민원 내용`)
  lines.push(ctx.description)
  lines.push('')
  lines.push(`## 출력 형식 (JSON만 응답)`)
  lines.push(`\`\`\`json`)
  lines.push(`{`)
  lines.push(`  "category": "FACILITY|SAFETY|NOISE|SANITATION|PARKING|ELEVATOR|OTHER",`)
  lines.push(`  "severity": "LOW|MEDIUM|HIGH|CRITICAL",`)
  lines.push(`  "urgencyScore": 0~100,`)
  lines.push(`  "suggestedPriority": "LOW|MEDIUM|HIGH|URGENT",`)
  lines.push(`  "suggestedSla": "24h|48h|72h|7d",`)
  lines.push(`  "routingSuggestions": [`)
  lines.push(`    {`)
  lines.push(`      "type": "TEAM",`)
  lines.push(`      "targetId": "팀코드 (예: facility-team)",`)
  lines.push(`      "targetName": "표시명 (예: 시설관리팀)",`)
  lines.push(`      "reason": "추천 근거 한 줄",`)
  lines.push(`      "confidence": 0.0~1.0`)
  lines.push(`    }`)
  lines.push(`  ],`)
  lines.push(`  "classificationReason": "분류 근거 2~3문장",`)
  lines.push(`  "keywordMatches": ["탐지된 키워드 목록"],`)
  lines.push(`  "confidence": 0.0~1.0`)
  lines.push(`}`)
  lines.push(`\`\`\``)

  return lines.join('\n')
}

/**
 * LLM 응답 JSON 파싱 (코드 블록 포함/미포함 모두 처리)
 */
export function parseTriageResponse(raw: string): TriagePromptResult {
  const codeBlockMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : raw.trim()

  try {
    return JSON.parse(jsonStr) as TriagePromptResult
  } catch {
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as TriagePromptResult
    }
    throw new Error(`트리아지 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}
