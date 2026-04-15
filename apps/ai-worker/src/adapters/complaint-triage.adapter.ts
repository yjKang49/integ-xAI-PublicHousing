// apps/ai-worker/src/adapters/complaint-triage.adapter.ts
import { ComplaintTriageContext, TriagePromptResult } from '../prompts/complaint-triage.prompt'

export const COMPLAINT_TRIAGE_ADAPTER = 'COMPLAINT_TRIAGE_ADAPTER'

export interface ComplaintTriageInput {
  /** 렌더링된 시스템 프롬프트 */
  systemPrompt: string
  /** 렌더링된 사용자 프롬프트 */
  userPrompt: string
  /** 사용할 모델 */
  model: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
  /** 원본 컨텍스트 */
  context: ComplaintTriageContext
}

export interface ComplaintTriageOutput {
  result: TriagePromptResult
  modelVersion: string
  tokensUsed?: number
  processingTimeMs: number
  rawResponse?: string
}

/** 민원 분류 어댑터 인터페이스 */
export interface ComplaintTriageAdapter {
  classify(input: ComplaintTriageInput): Promise<ComplaintTriageOutput>
}
