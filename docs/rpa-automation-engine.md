# RPA/업무 자동화 엔진 (Phase 2-7)

> AX-SPRINT 지능형 행정자동화 — 반복 행정 업무를 자동화하는 룰 엔진

---

## 1. 개요

**AutomationRule** 도메인 + **AutomationExecution** 도메인으로 구성된 룰 엔진입니다.  
기존 RPA 일회성 작업(`RpaTaskType`)과 달리, **지속적으로 활성 상태를 유지하며 트리거 조건에 따라 자동 실행**됩니다.

### 자동화 대상 4가지

| 룰 키 | 트리거 유형 | 설명 |
|-------|------------|------|
| `contract_expiry_30d` | DATE_BASED | 계약 만료 30일 전 알림 |
| `contract_expiry_7d` | DATE_BASED | 계약 만료 7일 전 긴급 알림 |
| `inspection_schedule_auto` | DATE_BASED | 월별 정기 점검 일정 자동 생성 |
| `complaint_resolved_notify` | STATUS_CHANGE | 민원 처리 완료 시 민원인 통지 |
| `inspection_reminder` | DATE_BASED | 점검 미수행 리마인드 (D-3일) |

---

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Web (Angular 18)                │
│  AutomationRuleListPage → RuleBuilder → ExecutionLogTable│
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────┐
│              NestJS API (:3000)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AutomationRulesModule                           │   │
│  │  ├─ AutomationRulesService (룰 CRUD + 엔진)      │   │
│  │  │    ├─ executeRule()          ← 핵심 실행기     │   │
│  │  │    ├─ checkStatusChangeTriggers() ← 상태변화  │   │
│  │  │    └─ scanDateBasedRules()   ← 날짜 스캔       │   │
│  │  └─ AutomationRulesController                    │   │
│  │       ├─ POST /automation-rules                  │   │
│  │       ├─ GET  /automation-rules                  │   │
│  │       ├─ POST /automation-rules/:id/execute      │   │
│  │       └─ POST /automation-rules/scan             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AutomationExecutionsModule                      │   │
│  │  ├─ AutomationExecutionsService (이력 CRUD)      │   │
│  │  └─ AutomationExecutionsController               │   │
│  │       ├─ GET  /automation-executions             │   │
│  │       ├─ GET  /automation-executions/summary     │   │
│  │       └─ PATCH /automation-executions/:id/result │   │
│  └──────────────────────────────────────────────────┘   │
│  ComplaintsService ─→ checkStatusChangeTriggers()        │
└────────────────────┬────────────────────────────────────┘
                     │ Bull Queue (job-queue)
┌────────────────────▼────────────────────────────────────┐
│              Job Worker                                  │
│  ├─ AutomationRuleProcessor                             │
│  │    ├─ AUTOMATION_RULE_EXECUTE  (외부 알림 발송)        │
│  │    └─ AUTOMATION_RULE_SCAN     (날짜 룰 주기 스캔)      │
│  ├─ NotificationProcessor                               │
│  │    └─ NOTIFICATION_SEND        (Email/SMS mock)       │
│  └─ RuleEvaluatorService          (mock 발송 로직)        │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 도메인 모델

### AutomationRule

```typescript
interface AutomationRule {
  _id:        string;  // 'automationRule:{orgId}:{localId}'
  docType:    'automationRule';
  orgId:      string;
  name:       string;
  ruleKey:    string;               // 고유 식별자 (영문, 언더스코어)
  category:   AutomationRuleCategory;
  isActive:   boolean;
  trigger:    AutomationTrigger;    // 트리거 조건
  conditions: AutomationCondition[]; // 추가 필터 (선택)
  actions:    AutomationAction[];   // 실행할 액션 목록
  executionCount: number;
  successCount:   number;
  failureCount:   number;
  lastTriggeredAt?: string;
}
```

### AutomationExecution (실행 이력)

```typescript
interface AutomationExecution {
  _id:         string;  // 'automationExecution:{orgId}:{localId}'
  docType:     'automationExecution';
  ruleId:      string;
  ruleName:    string;
  triggerType: AutomationTriggerType;
  status:      AutomationExecutionStatus; // RUNNING | COMPLETED | FAILED | SKIPPED
  startedAt:   string;
  completedAt?: string;
  durationMs?:  number;
  actionsExecuted: AutomationActionResult[];
  affectedDocIds: string[];
  summary?:    string;
}
```

---

## 4. 트리거 유형

### DATE_BASED (날짜 기반)

```json
{
  "trigger": {
    "type": "DATE_BASED",
    "cronExpression": "0 9 * * *"   // 매일 09:00
  }
}
```

`cronExpression` 파싱 규칙:
| cron 패턴 | 실행 주기 |
|-----------|----------|
| `0 9 * * *` | 매일 (24h) |
| `0 9 1 * *` | 매월 1일 (~30일) |
| `0 9 * * 1` | 매주 월요일 (7일) |
| 없음 / 오류 | 매일 (24h) |

`lastTriggeredAt`과 비교하여 주기가 경과한 경우만 실행됩니다.

### STATUS_CHANGE (상태 변경)

```json
{
  "trigger": {
    "type": "STATUS_CHANGE",
    "watchDocType": "complaint",
    "fromStatus": "IN_PROGRESS",    // null = 모든 상태에서
    "toStatus":   "RESOLVED"
  }
}
```

`ComplaintsService.updateStatus()` 호출 시 `checkStatusChangeTriggers()`가 자동 실행됩니다.

### MANUAL (수동)

`POST /automation-rules/:id/execute` 호출 시 즉시 실행됩니다.

---

## 5. 액션 유형

### SEND_NOTIFICATION

```json
{
  "type": "SEND_NOTIFICATION",
  "channel": "IN_APP",
  "titleTemplate": "{{title}} 처리 완료",
  "bodyTemplate": "접수하신 민원이 처리되었습니다. 만족도를 평가해 주세요.",
  "recipientStatic": "park@happy-housing.kr"
}
```

| 채널 | 처리 방식 |
|------|----------|
| `IN_APP` | CouchDB `notification` 문서 즉시 생성 |
| `EMAIL` | `NOTIFICATION_SEND` Bull Job → NotificationProcessor (mock) |
| `SMS` | `NOTIFICATION_SEND` Bull Job → NotificationProcessor (mock) |

### CREATE_ALERT

```json
{
  "type": "CREATE_ALERT",
  "alertType": "CONTRACT_EXPIRY",
  "alertSeverity": "HIGH",
  "alertTitle": "계약 만료 임박: {{complexId}}",
  "alertBody": "30일 이내 계약 만료 예정입니다."
}
```

CouchDB `alert` 문서를 직접 생성합니다.

### CREATE_SCHEDULE

```json
{
  "type": "CREATE_SCHEDULE",
  "scheduleTitle": "[자동] 정기 점검 일정",
  "scheduleDaysOffset": 30
}
```

CouchDB `schedule` 문서를 생성합니다. `isAutoGenerated: true` 플래그가 추가됩니다.

---

## 6. API 명세

### 자동화 룰 CRUD

```
POST   /api/v1/automation-rules          룰 생성
GET    /api/v1/automation-rules          룰 목록 (?isActive&category&page&limit)
GET    /api/v1/automation-rules/:id      룰 상세
PATCH  /api/v1/automation-rules/:id      룰 수정
PATCH  /api/v1/automation-rules/:id/toggle  활성화/비활성화
DELETE /api/v1/automation-rules/:id      룰 삭제 (소프트)
```

### 룰 실행 트리거

```
POST   /api/v1/automation-rules/:id/execute  특정 룰 수동 실행
POST   /api/v1/automation-rules/scan         날짜 기반 전체 스캔
```

### 실행 이력

```
GET    /api/v1/automation-executions              이력 목록 (?ruleId&status&triggerType)
GET    /api/v1/automation-executions/summary      통계 요약
GET    /api/v1/automation-executions/:id          이력 단건
PATCH  /api/v1/automation-executions/:id/result   [Worker 전용] 결과 콜백
```

---

## 7. 샘플 자동화 룰 데이터

`seed-master.ts` 실행 후 아래 룰들이 등록됩니다. 또는 관리자 웹에서 직접 생성하세요.

### 룰 1 — 민원 처리 완료 통지 (STATUS_CHANGE)

```bash
curl -X POST http://localhost:3000/api/v1/automation-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "민원 처리 완료 통지",
    "ruleKey": "complaint_resolved_notify",
    "category": "COMPLAINT",
    "description": "민원 상태가 RESOLVED로 변경되면 접수자에게 인앱 알림을 발송합니다.",
    "isActive": true,
    "priority": 10,
    "trigger": {
      "type": "STATUS_CHANGE",
      "watchDocType": "complaint",
      "fromStatus": null,
      "toStatus": "RESOLVED"
    },
    "actions": [
      {
        "type": "SEND_NOTIFICATION",
        "channel": "IN_APP",
        "titleTemplate": "민원 처리 완료 안내",
        "bodyTemplate": "접수하신 민원이 처리 완료되었습니다. 처리 결과를 확인하고 만족도를 평가해 주세요."
      }
    ]
  }'
```

### 룰 2 — 계약 만료 30일 전 알림 (DATE_BASED)

```bash
curl -X POST http://localhost:3000/api/v1/automation-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "계약 만료 30일 전 알림",
    "ruleKey": "contract_expiry_30d",
    "category": "CONTRACT",
    "description": "매일 09:00에 실행하여 계약 만료가 임박한 세대에 경보를 생성합니다.",
    "isActive": true,
    "priority": 20,
    "trigger": {
      "type": "DATE_BASED",
      "cronExpression": "0 9 * * *"
    },
    "actions": [
      {
        "type": "CREATE_ALERT",
        "alertType": "CONTRACT_EXPIRY",
        "alertSeverity": "MEDIUM",
        "alertTitle": "계약 만료 30일 전 안내",
        "alertBody": "임대차 계약 만료 30일 전입니다. 갱신 또는 퇴거 절차를 진행하세요."
      },
      {
        "type": "SEND_NOTIFICATION",
        "channel": "EMAIL",
        "titleTemplate": "[AX] 임대차 계약 만료 30일 전 안내",
        "bodyTemplate": "임대차 계약이 30일 후 만료됩니다. 경북개발공사에 문의하세요.",
        "recipientStatic": "admin@happy-housing.kr"
      }
    ]
  }'
```

### 룰 3 — 정기 점검 일정 자동 생성 (DATE_BASED)

```bash
curl -X POST http://localhost:3000/api/v1/automation-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "월별 정기 점검 일정 자동 생성",
    "ruleKey": "inspection_schedule_auto",
    "category": "INSPECTION",
    "description": "매월 1일 09:00에 다음 달 정기 점검 일정을 자동 생성합니다.",
    "isActive": true,
    "priority": 30,
    "trigger": {
      "type": "DATE_BASED",
      "cronExpression": "0 9 1 * *"
    },
    "actions": [
      {
        "type": "CREATE_SCHEDULE",
        "scheduleTitle": "[자동] 정기 안전 점검",
        "scheduleDaysOffset": 30
      },
      {
        "type": "SEND_NOTIFICATION",
        "channel": "IN_APP",
        "titleTemplate": "정기 점검 일정 자동 등록",
        "bodyTemplate": "다음 달 정기 점검 일정이 자동으로 등록되었습니다."
      }
    ]
  }'
```

### 룰 4 — 점검 미수행 리마인드 (DATE_BASED)

```bash
curl -X POST http://localhost:3000/api/v1/automation-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "점검 미수행 리마인드",
    "ruleKey": "inspection_reminder",
    "category": "INSPECTION",
    "description": "매일 체크하여 점검 기한 내 미완료 세션이 있을 경우 담당자에게 알립니다.",
    "isActive": true,
    "priority": 40,
    "trigger": {
      "type": "DATE_BASED",
      "cronExpression": "0 8 * * *"
    },
    "actions": [
      {
        "type": "CREATE_ALERT",
        "alertType": "INSPECTION_OVERDUE",
        "alertSeverity": "HIGH",
        "alertTitle": "점검 미수행 알림",
        "alertBody": "기한 내 완료되지 않은 점검 세션이 있습니다. 즉시 확인하세요."
      }
    ]
  }'
```

---

## 8. 상태 변화 트리거 실행 흐름

```
1. 사용자: PATCH /complaints/:id (status: 'RESOLVED')
2. ComplaintsService.updateStatus() 실행
3. prevStatus('IN_PROGRESS') 캡처 → DB 저장
4. void automationRules.checkStatusChangeTriggers(
     orgId, 'complaint', docId, doc, 'IN_PROGRESS', 'RESOLVED'
   )
5. 활성화된 STATUS_CHANGE 룰 조회 (watchDocType='complaint', toStatus='RESOLVED')
6. 매칭 룰: 'complaint_resolved_notify' 발견
7. executeRule() 호출:
   a. automationExecution 문서 생성 (status: RUNNING)
   b. SEND_NOTIFICATION(IN_APP) 액션 실행 → notification 문서 생성
   c. automationExecution 완료 처리 (status: COMPLETED)
   d. 룰 통계 업데이트 (executionCount+1, successCount+1)
```

---

## 9. 날짜 기반 트리거 실행 흐름

```
방법 A — 수동 (관리자 웹 또는 cURL):
  POST /api/v1/automation-rules/scan
  → 날짜 기반 활성 룰 전체 평가
  → lastTriggeredAt + 주기 < 현재시간인 룰만 실행
  → { scanned: 4, triggered: 2 } 반환

방법 B — Job Worker 주기 스캔:
  Bull Job: AUTOMATION_RULE_SCAN
  → AutomationRuleProcessor.handleRuleScan()
  → API /automation-rules/scan 호출
  → 결과 로그
```

---

## 10. 알림 채널 동작

| 채널 | 처리 위치 | 실제 발송 여부 |
|------|----------|--------------|
| `IN_APP` | API 인라인 (즉시) | CouchDB `notification` 문서 저장 |
| `EMAIL` | Job Worker (비동기) | Mock (RPA_DRY_RUN=true 시 발송 없음) |
| `SMS` | Job Worker (비동기) | Mock (RPA_DRY_RUN=true 시 발송 없음) |

`RPA_DRY_RUN=false` 환경 변수 설정 시 실제 발송 어댑터 연결 자리가 활성화됩니다.

---

## 11. 완료 기준 확인

| 기준 | 구현 상태 |
|------|---------|
| automation rule CRUD 가능 | ✅ POST/GET/PATCH/DELETE /automation-rules |
| 예약 기반 job 실행 가능 | ✅ DATE_BASED 룰 + POST /scan + AUTOMATION_RULE_SCAN 잡 |
| 상태 변화 기반 자동 액션 실행 | ✅ ComplaintsService → checkStatusChangeTriggers() |
| 실행 이력(log) 조회 가능 | ✅ GET /automation-executions (+ 상세, 통계) |
| 알림/스케줄/작업 중 하나 자동 실행 | ✅ IN_APP 알림, alert 생성, schedule 생성 모두 구현 |

---

## 12. 관련 파일

| 파일 | 역할 |
|------|------|
| `packages/shared/src/domain/automation-rule.ts` | AutomationRule 타입 정의 |
| `packages/shared/src/domain/automation-execution.ts` | 실행 이력 타입 정의 |
| `apps/api/src/modules/automation-rules/automation-rules.service.ts` | 룰 엔진 핵심 로직 |
| `apps/api/src/modules/automation-executions/` | 실행 이력 API |
| `apps/job-worker/src/processors/automation-rule.processor.ts` | 비동기 외부 알림 처리 |
| `apps/job-worker/src/processors/notification.processor.ts` | Email/SMS mock |
| `apps/job-worker/src/services/rule-evaluator.service.ts` | mock 발송 서비스 |
| `apps/admin-web/.../automation/` | 관리자 웹 UI (4개 컴포넌트) |
