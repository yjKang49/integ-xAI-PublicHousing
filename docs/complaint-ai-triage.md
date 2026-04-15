# 민원 AI 트리아지 (Complaint AI Triage)

> **Phase 2 — 여섯 번째 기능**  
> 민원 텍스트/이미지 기반 자동 분류 · 우선순위 예측 · 담당팀 추천 · Human-in-the-loop 확정

---

## 1. 아키텍처 개요

```
[민원 접수 (OPEN)]
       │
       ▼
[Complaint Triage Trigger]  ← 관리자/시스템이 POST /complaint-triage/trigger 호출
       │
       ▼
[ai-queue: COMPLAINT_TRIAGE Job]
       │
  ┌────┴────────────────────────────────┐
  │ ComplaintTriageProcessor            │
  │  1. Complaint 데이터 수집           │
  │  2. 프롬프트 렌더링                 │
  │  3. AI 분류 (Mock/LLM)              │
  │     → 실패 시 Rule-based fallback  │
  │  4. 결과 저장 (internal API)        │
  └────────────────────────────────────┘
       │
       ▼
[ComplaintTriage 문서: status=COMPLETED, decisionStatus=PENDING_REVIEW]
       │
       ▼
[Triage Queue UI]  ← 관리자가 검토
       │
  ┌────┴──────────────────────────────────────────┐
  │ Human-in-the-loop 검토                         │
  │  ACCEPT  → decisionStatus = ACCEPTED          │
  │  MODIFY  → decisionStatus = MODIFIED          │
  │             (카테고리/우선순위/담당자 수정)     │
  │  REJECT  → decisionStatus = REJECTED          │
  │             (수동 재분류 필요)                  │
  └───────────────────────────────────────────────┘
       │
       ▼
[Complaint 상태 전이: TRIAGED → ASSIGNED (별도 API 호출)]
```

**핵심 원칙**
- AI는 "추천"까지만 수행 — 최종 확정은 반드시 담당자
- AI 미응답 시 rule-based fallback 자동 적용 (`isRuleBased: true`)
- 기존 Complaint 상태 머신(`OPEN → TRIAGED → ASSIGNED → ...`) 변경 없음
- 자동 배정 금지 — `acceptedAssigneeId` 확정 후 Complaints API를 별도 호출해야 배정됨

---

## 2. 도메인 설계

### 2.1 ComplaintTriage 문서

```typescript
interface ComplaintTriage {
  _id: string            // complaintTriage:{orgId}:{uuid8}
  docType: 'complaintTriage'
  orgId: string
  complexId: string
  complaintId: string    // FK → Complaint

  // AI 분류 결과
  aiCategory?: string          // ComplaintCategory 값
  aiSeverity?: string          // SeverityLevel 값
  urgencyScore: number         // 0~100 (높을수록 긴급)
  suggestedPriority?: string   // LOW | MEDIUM | HIGH | URGENT
  suggestedSla?: string        // "24h" | "48h" | "72h" | "7d"
  routingSuggestions: RoutingSuggestion[]
  classificationReason?: string
  keywordMatches?: string[]
  hasImage: boolean

  // AI 모델 정보
  model: string
  modelVersion: string
  confidence: number           // 0~1
  isRuleBased: boolean         // true = rule-based fallback 사용

  // 처리 상태
  status: ComplaintTriageStatus
  decisionStatus: TriageDecisionStatus

  // Human-in-the-loop 결과
  acceptedCategory?: string
  acceptedPriority?: string
  acceptedAssigneeId?: string
  reviewedBy?: string
  reviewHistory?: TriageReviewRecord[]
}
```

### 2.2 상태 전이

```
ComplaintTriageStatus:
  PENDING → PROCESSING → COMPLETED
                       → FAILED

TriageDecisionStatus (COMPLETED 후):
  PENDING_REVIEW → ACCEPTED
               → MODIFIED
               → REJECTED
```

### 2.3 카테고리별 기본 SLA

| 카테고리 | 기본 SLA | 이유 |
|---------|---------|------|
| SAFETY | 24h | 즉각적 안전 위협 |
| ELEVATOR | 24h | 노약자 이동권 침해 |
| FACILITY | 72h | 시설물 결함 |
| SANITATION | 48h | 위생 악화 방지 |
| NOISE | 72h | 중재 절차 필요 |
| PARKING | 7d | 긴급도 낮음 |
| OTHER | 7d | 일반 민원 |

---

## 3. API 엔드포인트

### 3.1 트리거

```http
POST /api/v1/complaint-triage/trigger
Authorization: Bearer {token}
Content-Type: application/json

{
  "complaintId": "complaint:org1:cmp_abc123",
  "complexId": "complex:org1:cx001",
  "model": "MOCK"
}
```

**응답:**
```json
{
  "triageId": "complaintTriage:org1:a1b2c3d4",
  "jobId": "job:org1:e5f6g7h8"
}
```

### 3.2 트리아지 조회

```http
GET /api/v1/complaint-triage?decisionStatus=PENDING_REVIEW&limit=20
GET /api/v1/complaint-triage/by-complaint/{complaintId}
GET /api/v1/complaint-triage/{triageId}
GET /api/v1/complaint-triage/stats?complexId={complexId}
```

### 3.3 Human-in-the-loop 검토

```http
POST /api/v1/complaint-triage/{triageId}/review
Authorization: Bearer {token}

# 수락
{ "decision": "ACCEPT", "acceptedAssigneeId": "user:org1:mgr01" }

# 수정 확정
{
  "decision": "MODIFY",
  "acceptedCategory": "SAFETY",
  "acceptedPriority": "URGENT",
  "acceptedAssigneeId": "user:org1:safety01",
  "reviewNote": "안전 위협 요소 직접 확인 필요"
}

# 기각
{ "decision": "REJECT", "reviewNote": "민원 내용 불분명, 추가 확인 필요" }
```

### 3.4 워커 내부 엔드포인트

```http
POST /api/v1/complaint-triage/internal/result
X-Worker-Secret: {WORKER_SECRET}
```

---

## 4. AI Worker 구조

### 4.1 어댑터 교체 방법

```typescript
// apps/ai-worker/src/worker.module.ts

// 현재 (Mock)
{ provide: COMPLAINT_TRIAGE_ADAPTER, useClass: MockComplaintTriageAdapter }

// Claude API로 교체
{ provide: COMPLAINT_TRIAGE_ADAPTER, useClass: ClaudeComplaintTriageAdapter }

// OpenAI로 교체
{ provide: COMPLAINT_TRIAGE_ADAPTER, useClass: OpenAiComplaintTriageAdapter }
```

### 4.2 Rule-based Fallback 키워드 규칙

| 키워드 | 카테고리 | 심각도 | SLA | 담당팀 |
|-------|---------|-------|-----|-------|
| 누수, 물, 방수, 습기 | FACILITY | HIGH | 48h | 방수·누수 처리팀 |
| 균열, 크랙 | FACILITY | HIGH | 48h | 구조물 점검팀 |
| 안전, 위험, 사고 | SAFETY | CRITICAL | 24h | 안전관리팀 |
| 엘리베이터, 승강기 | ELEVATOR | HIGH | 24h | 엘리베이터 유지보수팀 |
| 소음, 층간 | NOISE | MEDIUM | 72h | 층간소음 민원팀 |
| 주차, 불법주차 | PARKING | LOW | 7d | 주차관리팀 |
| 위생, 청소, 해충 | SANITATION | MEDIUM | 48h | 위생관리팀 |

### 4.3 프롬프트 버전

- 현재: `complaint-triage-v1.0`
- 위치: `apps/ai-worker/src/prompts/complaint-triage.prompt.ts`

---

## 5. Feature Flag

트리아지 기능은 feature flag `ai.complaint_triage`로 제어합니다.

```http
# 활성화
PATCH /api/v1/feature-flags/ai.complaint_triage
{ "enabled": true }
```

비활성화 상태에서 트리거 시 `400 Bad Request` 반환.

---

## 6. Admin Web UI

### 6.1 Triage Queue 페이지

위치: `apps/admin-web/src/app/features/complaints/pages/triage-queue-page.component.ts`

기능:
- 검토 대기(PENDING_REVIEW) 트리아지 목록 표시
- 긴급도 점수(0~100), 카테고리, 심각도, SLA 표시
- 키워드 매칭 결과 시각화
- Rule-based 분류 여부 구분 표시
- 통계 카드 (총 건수, 검토대기, 수락, 수정확정, 기각, 평균긴급도)

Human-in-the-loop 액션:
- **수락**: AI 분류 결과 그대로 채택
- **수정 확정**: 카테고리/우선순위/담당자 수정 후 확정
- **기각**: 전체 기각, 수동 재분류 필요

### 6.2 Triage Result Panel (민원 상세 페이지 삽입용)

위치: `apps/admin-web/src/app/features/complaints/components/triage-result-panel.component.ts`

```html
<ax-triage-result-panel
  [complaintId]="complaint._id"
  [complexId]="complaint.complexId"
  (triageConfirmed)="onTriageConfirmed($event)"
/>
```

### 6.3 Routing Suggestion Card

위치: `apps/admin-web/src/app/features/complaints/components/routing-suggestion-card.component.ts`

```html
<ax-routing-suggestion-card
  [suggestion]="routingSuggestion"
  [rank]="0"
  [selected]="isSelected"
  [showAssignButton]="true"
  (assign)="onAssign($event)"
/>
```

---

## 7. 자동 배정 Rule vs AI Suggestion 분리 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    자동 배정 분리 원칙                            │
├──────────────────┬──────────────────────────────────────────────┤
│ AI Suggestion    │ - 카테고리, 심각도, 긴급도, SLA 추천         │
│ (ComplaintTriage)│ - 담당팀/담당자 추천 (신뢰도 포함)           │
│                  │ - 반드시 담당자가 확정 전에는 적용 안 됨     │
├──────────────────┼──────────────────────────────────────────────┤
│ 자동 배정 Rule   │ - SLA 기반 due date 자동 계산 (향후)         │
│ (미구현, 향후)   │ - 미응답 시 자동 에스컬레이션 알림 (향후)    │
│                  │ - 99% 자동화는 법정 민원 처리에 부적합        │
└──────────────────┴──────────────────────────────────────────────┘
```

**자동 배정이 금지된 이유:**
1. 공동주택관리법상 민원 처리 책임은 담당자에게 귀속
2. AI 오분류로 인한 민원 처리 지연 방지
3. 담당자의 현장 컨텍스트 반영 필요

---

## 8. 샘플 결과

### 8.1 안전 민원 (SAFETY, 긴급)

```json
{
  "_id": "complaintTriage:org1:a1b2c3d4",
  "complaintId": "complaint:org1:cmp_20260414_abc1",
  "status": "COMPLETED",
  "decisionStatus": "PENDING_REVIEW",
  "aiCategory": "SAFETY",
  "aiSeverity": "CRITICAL",
  "urgencyScore": 92,
  "suggestedPriority": "URGENT",
  "suggestedSla": "24h",
  "routingSuggestions": [
    {
      "type": "TEAM",
      "targetId": "safety-team",
      "targetName": "안전관리팀",
      "reason": "안전 위해 요소가 확인되어 즉시 현장 점검 필요",
      "confidence": 0.91
    }
  ],
  "classificationReason": "민원 내용에 '위험', '추락' 키워드가 포함되어 즉각적인 안전 위협으로 판단됩니다.",
  "keywordMatches": ["위험", "안전"],
  "confidence": 0.91,
  "isRuleBased": false,
  "model": "MOCK",
  "modelVersion": "mock-llm-triage-1.0.0"
}
```

### 8.2 누수 민원 (FACILITY, rule-based fallback)

```json
{
  "aiCategory": "FACILITY",
  "aiSeverity": "HIGH",
  "urgencyScore": 70,
  "suggestedPriority": "HIGH",
  "suggestedSla": "48h",
  "routingSuggestions": [
    {
      "type": "TEAM",
      "targetId": "waterproof-team",
      "targetName": "방수·누수 처리팀",
      "reason": "rule-based 키워드 분류 (AI 미응답): 누수, 물",
      "confidence": 0.80
    }
  ],
  "isRuleBased": true,
  "modelVersion": "rule-based-fallback-1.0.0"
}
```

---

## 9. 테스트 방법

### 9.1 Feature Flag 활성화

```http
PATCH /api/v1/feature-flags/ai.complaint_triage
{ "enabled": true }
```

### 9.2 민원 생성 후 트리아지 트리거

```http
# 1. 민원 생성
POST /api/v1/complaints
{
  "complexId": "complex:org1:cx001",
  "category": "FACILITY",
  "title": "천장 누수로 물이 떨어집니다",
  "description": "302호 욕실 천장에서 지속적으로 물이 새고 있습니다. 위층 403호 관련인 것 같습니다.",
  "priority": "HIGH",
  "submittedBy": "홍길동",
  "classificationHint": "누수"
}

# 2. 트리아지 트리거
POST /api/v1/complaint-triage/trigger
{
  "complaintId": "{complaintId}",
  "complexId": "complex:org1:cx001",
  "model": "MOCK"
}

# 3. 결과 조회 (약 1~2초 후)
GET /api/v1/complaint-triage/by-complaint/{complaintId}

# 4. 검토 — 수락
POST /api/v1/complaint-triage/{triageId}/review
{ "decision": "ACCEPT", "acceptedAssigneeId": "user:org1:mgr01" }

# 5. 통계 확인
GET /api/v1/complaint-triage/stats
```

### 9.3 Rule-based Fallback 테스트

```http
# REDIS/AI Worker 없이 테스트 시:
# COMPLAINT_TRIAGE_ADAPTER를 MockComplaintTriageAdapter로 유지하되
# Mock 내에서 AI 오류를 시뮬레이션하려면 processor 내 fallback 로직 직접 확인

# 또는 title/description에 fallback 키워드 없이 처리 →
# MOCK_SCENARIOS[hash % 5] 시나리오로 분류됨
```

### 9.4 Admin Web 확인 경로

1. `/complaints/triage-queue` — Triage Queue 페이지
2. `/complaints/{id}` — 민원 상세 페이지 내 `<ax-triage-result-panel>` 확인

---

## 10. 파일 목록

| 파일 | 역할 |
|------|------|
| `packages/shared/src/domain/complaint-triage.ts` | 도메인 타입, 열거형, DTO |
| `packages/shared/src/jobs/job-types.ts` | `COMPLAINT_TRIAGE` JobType 추가 |
| `packages/shared/src/jobs/job-payloads.ts` | `ComplaintTriagePayload` 추가 |
| `packages/shared/src/feature-flags/feature-flag.ts` | `AI_COMPLAINT_TRIAGE` 플래그 추가 |
| `apps/api/src/modules/complaint-triage/complaint-triage.module.ts` | NestJS 모듈 |
| `apps/api/src/modules/complaint-triage/complaint-triage.service.ts` | 비즈니스 로직 |
| `apps/api/src/modules/complaint-triage/complaint-triage.controller.ts` | REST 엔드포인트 |
| `apps/api/src/modules/complaint-triage/dto/complaint-triage.dto.ts` | DTO 클래스 |
| `apps/api/src/database/indexes/complaint-triage.index.json` | CouchDB 인덱스 |
| `apps/ai-worker/src/adapters/complaint-triage.adapter.ts` | 어댑터 인터페이스 |
| `apps/ai-worker/src/adapters/mock-complaint-triage.adapter.ts` | Mock 구현 (rule-based + 시나리오) |
| `apps/ai-worker/src/processors/complaint-triage.processor.ts` | Bull Job 프로세서 |
| `apps/ai-worker/src/prompts/complaint-triage.prompt.ts` | 프롬프트 템플릿 |
| `apps/admin-web/.../pages/triage-queue-page.component.ts` | Triage Queue 관리 UI |
| `apps/admin-web/.../components/triage-result-panel.component.ts` | 민원 상세 내 결과 패널 |
| `apps/admin-web/.../components/routing-suggestion-card.component.ts` | 라우팅 추천 카드 |
