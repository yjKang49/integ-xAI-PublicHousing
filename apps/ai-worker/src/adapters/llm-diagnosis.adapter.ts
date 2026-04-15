// apps/ai-worker/src/adapters/llm-diagnosis.adapter.ts
import { DiagnosisPromptContext } from '../prompts/diagnosis-opinion.prompt'
import { DiagnosisUrgency, RepairRecommendationDraft } from '@ax/shared'

export const LLM_DIAGNOSIS_ADAPTER = 'LLM_DIAGNOSIS_ADAPTER'

export interface LlmDiagnosisInput {
  /** 렌더링된 시스템 프롬프트 */
  systemPrompt: string
  /** 렌더링된 사용자 프롬프트 (컨텍스트 포함) */
  userPrompt: string
  /** 사용할 모델 */
  model: 'MOCK' | 'GPT4O_MINI' | 'CLAUDE_HAIKU'
  /** 원본 컨텍스트 (결과 보강용) */
  context: DiagnosisPromptContext
}

export interface LlmDiagnosisOutput {
  summary: string
  technicalOpinionDraft: string
  urgency: DiagnosisUrgency
  estimatedPriorityScore: number
  confidence: number
  recommendations: RepairRecommendationDraft[]
  modelVersion: string
  tokensUsed?: number
  rawResponse?: string
}

/** LLM 진단 의견 어댑터 인터페이스 */
export interface LlmDiagnosisAdapter {
  generate(input: LlmDiagnosisInput): Promise<LlmDiagnosisOutput>
}
