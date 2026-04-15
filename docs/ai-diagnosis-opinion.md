# AI 진단 의견 & 보수 추천 파이프라인

Phase 2 다섯 번째 작업 — 결함·균열·민원·경보 데이터를 종합하여 AI가 초안 수준의 진단 의견과 보수·보강 우선순위를 생성한다.

---

## 1. 아키텍처 개요

```
[Admin/API 트리거]
       │
       ▼ POST /api/v1/diagnosis-opinions/trigger
[DiagnosisOpinion 문서 생성 (DRAFT)]
[DIAGNOSIS_OPINION Bull Job 생성]
       │
       ▼ ai-queue
[DiagnosisOpinionProcessor]
  ├─ 컨텍스트 수집 (defects, cracks, complaints, alerts)
  ├─ buildSystemPrompt() + buildUserPrompt() 렌더링
  ├─ LlmDiagnosisAdapter.generate()  ← MOCK / GPT4O_MINI / CLAUDE_HAIKU
  └─ POST /api/v1/diagnosis-opinions/internal/result
       │
       ▼
[DiagnosisOpinion 업데이트 (summary, technicalOpinionDraft, urgency, …)]
[RepairRecommendation 문서들 생성 (isApproved=false)]
       │
       ▼ 검토자 워크플로
[DRAFT → REVIEWING → APPROVED / REJECTED]
[RepairRecommendation 개별 approve]
       │
       ▼ 보고서 연동
[includedInReportId 설정 → PDF 생성 시 포함]
```

---

## 2. 도메인 문서

### DiagnosisOpinion

- **docType**: `diagnosisOpinion`
- **_id 패턴**: `diagnosisOpinion:{orgId}:{uuid8}`
- **상태 흐름**: `DRAFT → REVIEWING → APPROVED | REJECTED`

| 필드 | 타입 | 설명 |
|------|------|------|
| `summary` | string | AI 생성 한 줄 요약 |
| `technicalOpinionDraft` | string | 기술 의견 초안 (마크다운) |
| `urgency` | IMMEDIATE \| URGENT \| ROUTINE \| PLANNED | 긴급도 |
| `estimatedPriorityScore` | 0~100 | 우선순위 점수 |
| `confidence` | 0~1 | AI 신뢰도 |
| `status` | DiagnosisOpinionStatus | 처리 상태 |
| `editHistory` | DiagnosisEditRecord[] | 검토자 수정 이력 |

### RepairRecommendation

- **docType**: `repairRecommendation`
- **_id 패턴**: `repairRec:{orgId}:{uuid8}`
- **필수 조건**: `DiagnosisOpinion.status = APPROVED` + `isApproved = true` → 보고서 반영 가능

---

## 3. API 엔드포인트

### DiagnosisOpinions

```
POST   /api/v1/diagnosis-opinions/trigger        AI 진단 의견 생성 트리거
GET    /api/v1/diagnosis-opinions                목록 조회 (status, urgency, targetType 필터)
GET    /api/v1/diagnosis-opinions/stats          통계
GET    /api/v1/diagnosis-opinions/:id            단건 조회
PATCH  /api/v1/diagnosis-opinions/:id            내용 수정 (수정 이력 자동 기록)
POST   /api/v1/diagnosis-opinions/:id/review     검토 (APPROVE/REJECT/REQUEST_REVISION)
POST   /api/v1/diagnosis-opinions/internal/result [내부] 워커 결과 저장 (X-Worker-Secret)
```

### RepairRecommendations

```
GET    /api/v1/repair-recommendations            목록 조회
GET    /api/v1/repair-recommendations/:id        단건 조회
PATCH  /api/v1/repair-recommendations/:id        내용 수정
POST   /api/v1/repair-recommendations/:id/approve    개별 승인
DELETE /api/v1/repair-recommendations/:id/approve    승인 취소
```

---

## 4. Feature Flag

```
Key:     ai.diagnosis_opinion
Default: false (비활성)
```

활성화 없이 trigger 호출 시 `400 BadRequest` 반환.

---

## 5. 프롬프트 구조

`apps/ai-worker/src/prompts/diagnosis-opinion.prompt.ts`

```
buildSystemPrompt(language)  → 전문가 역할 정의 (한국어/영어)
buildUserPrompt(context)     → 결함·균열·민원·경보 컨텍스트 렌더링
parseLlmResponse(raw)        → JSON 코드블록 파싱 (폴백 포함)
```

### 출력 JSON 스키마

```json
{
  "summary": "한 줄 요약 (50자 이내)",
  "technicalOpinionDraft": "기술 의견 마크다운",
  "urgency": "IMMEDIATE|URGENT|ROUTINE|PLANNED",
  "estimatedPriorityScore": 0~100,
  "confidence": 0.0~1.0,
  "recommendations": [
    {
      "recommendedAction": "보수 공법",
      "actionDetail": "상세 설명",
      "recommendedTimeline": "IMMEDIATE|WITHIN_1_WEEK|WITHIN_1_MONTH|WITHIN_3_MONTHS|ANNUAL_PLAN",
      "priorityRank": 1,
      "kcsStandardRef": "KCS 코드",
      "kcsComplianceNote": "기준 준수 메모",
      "estimatedCostRange": { "min": 0, "max": 0, "currency": "KRW" }
    }
  ]
}
```

---

## 6. Mock 어댑터 시나리오

`apps/ai-worker/src/adapters/mock-llm-diagnosis.adapter.ts`

`hashCode(targetId) % 5`로 결정론적 시나리오 선택:

| # | 긴급도 | 우선순위 | 주요 결함 |
|---|--------|----------|-----------|
| 0 | IMMEDIATE | 95 | 구조 균열 + 누수 복합 |
| 1 | URGENT | 78 | 누수 + 박리 |
| 2 | ROUTINE | 52 | 경미한 표면 균열 |
| 3 | PLANNED | 30 | 노후화 (예방 유지관리) |
| 4 | URGENT | 70 | 철재 부식 |

---

## 7. 어댑터 교체 (실제 LLM 연동)

`apps/ai-worker/src/worker.module.ts`에서 한 줄만 변경:

```typescript
// OpenAI
{ provide: LLM_DIAGNOSIS_ADAPTER, useClass: OpenAiDiagnosisAdapter }

// Claude (Anthropic)
{ provide: LLM_DIAGNOSIS_ADAPTER, useClass: ClaudeDiagnosisAdapter }
```

어댑터는 `LlmDiagnosisAdapter` 인터페이스만 구현하면 됩니다:

```typescript
interface LlmDiagnosisAdapter {
  generate(input: LlmDiagnosisInput): Promise<LlmDiagnosisOutput>
}
```

---

## 8. 보고서 연동 구조

Phase 1 보고서 구조를 깨지 않고 확장:

```
Report (기존)
  └─ sections[]
       └─ [신규] AI 진단 의견 섹션
            ├─ DiagnosisOpinion (status=APPROVED만)
            └─ RepairRecommendation[] (isApproved=true만)
```

보고서 생성 시 쿼리:
```typescript
// 승인된 진단 의견
{ docType: 'diagnosisOpinion', complexId, status: 'APPROVED' }

// 승인된 보수 추천
{ docType: 'repairRecommendation', complexId, isApproved: true }
```

---

## 9. 테스트 방법

### curl로 트리거

```bash
# Feature Flag 활성화 (먼저 관리자 UI 또는 직접 DB에서)
curl -X PATCH /api/v1/feature-flags/ai.diagnosis_opinion \
  -H 'Authorization: Bearer <token>' \
  -d '{"enabled":true}'

# 진단 의견 생성 트리거
curl -X POST /api/v1/diagnosis-opinions/trigger \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "targetType": "DEFECT",
    "targetId": "defect:org1:abc12345",
    "complexId": "complex:org1:xyz",
    "model": "MOCK",
    "language": "ko"
  }'
```

### 응답 예시

```json
{
  "diagnosisId": "diagnosisOpinion:org1:a1b2c3d4",
  "jobId": "job:org1:e5f6g7h8"
}
```

### Mock 결과 확인

```bash
# 약 0.5초 후 분석 완료
curl /api/v1/diagnosis-opinions/diagnosisOpinion:org1:a1b2c3d4 \
  -H 'Authorization: Bearer <token>'
```

---

## 10. 제약 사항

1. **AI 결과는 항상 초안(DRAFT)** — 자동 확정 절대 금지
2. **APPROVED 상태 전까지 공식 문서 반영 금지** — `status != APPROVED`이면 보고서 섹션에서 제외
3. **보수 추천 개별 승인 필수** — `isApproved=true`인 항목만 보고서에 포함
4. **Phase 1 보고서 구조 불변** — 기존 Report 도메인을 수정하지 않고 신규 섹션으로 확장
