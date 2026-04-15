// apps/ai-worker/src/prompts/diagnosis-opinion.prompt.ts
// AI 진단 의견 프롬프트 템플릿 v1.0
// 결함·균열·민원·경보 컨텍스트를 받아 기술 의견 초안 생성

export const PROMPT_VERSION = 'diagnosis-v1.0'

// ── 컨텍스트 타입 ────────────────────────────────────────────────────────────

export interface DefectContext {
  defectId: string
  defectType: string
  severity: string
  description?: string
  locationDescription?: string
  widthMm?: number
  lengthMm?: number
  kcsStandardRef?: string
  kcsExceedsLimit?: boolean
  aiCaption?: string
  isRepaired: boolean
  createdAt: string
}

export interface CrackContext {
  gaugePointId: string
  measuredWidthMm: number
  changeFromBaselineMm?: number
  exceedsThreshold: boolean
  measuredAt: string
}

export interface ComplaintContext {
  complaintId: string
  category: string
  title: string
  priority: string
  status: string
  submittedAt: string
}

export interface AlertContext {
  alertId: string
  alertType: string
  severity: string
  title: string
  status: string
  createdAt: string
}

export interface DiagnosisPromptContext {
  /** 점검 단지 */
  complexName: string
  complexId: string
  /** 진단 대상 유형 */
  targetType: string
  targetId: string
  /** 결함 목록 */
  defects: DefectContext[]
  /** 균열 측정 */
  cracks: CrackContext[]
  /** 관련 민원 */
  complaints: ComplaintContext[]
  /** 경보 */
  alerts: AlertContext[]
  /** 출력 언어 */
  language: 'ko' | 'en'
}

// ── 프롬프트 렌더링 ──────────────────────────────────────────────────────────

/**
 * buildSystemPrompt — 시스템 프롬프트 (역할 정의)
 */
export function buildSystemPrompt(language: 'ko' | 'en'): string {
  if (language === 'en') {
    return `You are an expert structural engineer specializing in public housing facilities.
Your role is to analyze inspection data and generate objective technical diagnosis opinions.
Always base your opinions on provided data. Do NOT fabricate measurements or facts.
Output must be in JSON format as specified.`
  }

  return `당신은 공공임대주택 시설물 구조 안전 전문가입니다.
현장 점검 데이터를 분석하여 객관적이고 기술적인 진단 의견 초안을 생성합니다.
제공된 데이터에만 근거하여 의견을 작성하고, 수치나 사실을 임의로 생성하지 마세요.
결과는 반드시 지정된 JSON 형식으로 출력하세요.
이 의견은 전문 검토자가 검토·수정·승인할 초안이므로 신중하고 전문적으로 작성하세요.`
}

/**
 * buildUserPrompt — 실제 분석 요청 프롬프트
 */
export function buildUserPrompt(ctx: DiagnosisPromptContext): string {
  const lines: string[] = []

  if (ctx.language === 'ko') {
    lines.push(`## 진단 대상`)
    lines.push(`- 단지: ${ctx.complexName} (${ctx.complexId})`)
    lines.push(`- 대상 유형: ${ctx.targetType}`)
    lines.push(`- 대상 ID: ${ctx.targetId}`)
    lines.push('')

    if (ctx.defects.length > 0) {
      lines.push(`## 결함 현황 (총 ${ctx.defects.length}건)`)
      for (const d of ctx.defects) {
        lines.push(`- [${d.severity}] ${d.defectType}: ${d.description ?? '설명 없음'}`)
        if (d.widthMm) lines.push(`  폭: ${d.widthMm}mm`)
        if (d.kcsStandardRef) lines.push(`  KCS: ${d.kcsStandardRef}${d.kcsExceedsLimit ? ' (기준 초과)' : ''}`)
        if (d.aiCaption) lines.push(`  AI 설명: ${d.aiCaption}`)
        lines.push(`  보수 여부: ${d.isRepaired ? '완료' : '미완료'}`)
      }
      lines.push('')
    }

    if (ctx.cracks.length > 0) {
      lines.push(`## 균열 측정 현황 (총 ${ctx.cracks.length}건)`)
      for (const c of ctx.cracks) {
        const exceed = c.exceedsThreshold ? ' [임계치 초과]' : ''
        const delta = c.changeFromBaselineMm != null
          ? ` (기준 대비 ${c.changeFromBaselineMm > 0 ? '+' : ''}${c.changeFromBaselineMm}mm)` : ''
        lines.push(`- 게이지 ${c.gaugePointId}: ${c.measuredWidthMm}mm${delta}${exceed}`)
      }
      lines.push('')
    }

    if (ctx.complaints.length > 0) {
      lines.push(`## 관련 민원 (총 ${ctx.complaints.length}건)`)
      for (const c of ctx.complaints) {
        lines.push(`- [${c.priority}] ${c.category}: ${c.title} (상태: ${c.status})`)
      }
      lines.push('')
    }

    if (ctx.alerts.length > 0) {
      lines.push(`## 활성 경보 (총 ${ctx.alerts.length}건)`)
      for (const a of ctx.alerts) {
        lines.push(`- [${a.severity}] ${a.alertType}: ${a.title} (${a.status})`)
      }
      lines.push('')
    }

    lines.push(`## 출력 형식 (JSON)`)
    lines.push(`다음 JSON 형식으로만 응답하세요. 설명 텍스트를 JSON 밖에 추가하지 마세요.`)
    lines.push(`\`\`\`json`)
    lines.push(`{`)
    lines.push(`  "summary": "한 줄 요약 (50자 이내)",`)
    lines.push(`  "technicalOpinionDraft": "기술 의견 초안 (마크다운 사용 가능, 500자 이내)",`)
    lines.push(`  "urgency": "IMMEDIATE|URGENT|ROUTINE|PLANNED",`)
    lines.push(`  "estimatedPriorityScore": 0~100,`)
    lines.push(`  "confidence": 0.0~1.0,`)
    lines.push(`  "recommendations": [`)
    lines.push(`    {`)
    lines.push(`      "recommendedAction": "보수 공법 또는 조치 (단문)",`)
    lines.push(`      "actionDetail": "상세 설명 (선택)",`)
    lines.push(`      "recommendedTimeline": "IMMEDIATE|WITHIN_1_WEEK|WITHIN_1_MONTH|WITHIN_3_MONTHS|ANNUAL_PLAN",`)
    lines.push(`      "priorityRank": 1,`)
    lines.push(`      "kcsStandardRef": "KCS 코드 (선택)",`)
    lines.push(`      "kcsComplianceNote": "기준 준수 메모 (선택)"`)
    lines.push(`    }`)
    lines.push(`  ]`)
    lines.push(`}`)
    lines.push(`\`\`\``)
  } else {
    // English prompt
    lines.push(`## Diagnosis Target`)
    lines.push(`- Complex: ${ctx.complexName} (${ctx.complexId})`)
    lines.push(`- Target type: ${ctx.targetType}, ID: ${ctx.targetId}`)
    lines.push('')

    if (ctx.defects.length > 0) {
      lines.push(`## Defects (${ctx.defects.length} total)`)
      for (const d of ctx.defects) {
        lines.push(`- [${d.severity}] ${d.defectType}: ${d.description ?? 'No description'}`)
        if (d.widthMm) lines.push(`  Width: ${d.widthMm}mm`)
      }
      lines.push('')
    }

    lines.push(`## Required Output (JSON only)`)
    lines.push(`{ "summary": "...", "technicalOpinionDraft": "...", "urgency": "IMMEDIATE|URGENT|ROUTINE|PLANNED", "estimatedPriorityScore": 0-100, "confidence": 0.0-1.0, "recommendations": [...] }`)
  }

  return lines.join('\n')
}

/**
 * 프롬프트에서 LLM 응답 JSON 파싱
 * JSON 코드 블록이 있는 경우와 없는 경우 모두 처리
 */
export function parseLlmResponse(raw: string): Record<string, any> {
  // JSON 코드 블록 추출 시도
  const codeBlockMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : raw.trim()

  try {
    return JSON.parse(jsonStr)
  } catch {
    // 부분 파싱 시도 — { ... } 패턴 찾기
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0])
    }
    throw new Error(`LLM 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`)
  }
}
