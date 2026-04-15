# Phase 2 UAT 시나리오

> **목적:** Phase 2 기능 전체에 대한 인수 테스트 기준 정의  
> **대상:** QA 담당자, 파일럿 기관 담당자, 시스템 관리자  
> **전제조건:** `yarn docker:up` + `yarn seed:demo` 완료, Feature Flag 활성화

---

## 사전 준비

| 항목 | 값 |
|------|-----|
| 테스트 URL | http://localhost:4200 |
| API URL | http://localhost:3000/api/v1 |
| 테스트 조직 | org_demo001 |
| 관리자 계정 | admin@demo.org / demo1234 |
| 점검자 계정 | inspector@demo.org / demo1234 |
| 민원담당자 계정 | cmgr@demo.org / demo1234 |

Feature Flags 활성화 (관리자 > 기능 플래그 메뉴):
- `PHASE2_AI`, `PHASE2_DRONE`, `PHASE2_RPA`, `PHASE2_IOT`
- `AI_DEFECT_DETECTION`, `AI_CRACK_ANALYSIS`, `AI_DIAGNOSIS_OPINION`, `AI_COMPLAINT_TRIAGE`

---

## UAT-01 드론 영상 업로드 및 AI 결함 탐지

**시나리오:** 드론 촬영 영상을 업로드하고 AI가 결함 후보를 자동 생성한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 1-1 | 드론 미션 생성 (단지 선택, 비행 날짜 입력) | 미션 상태 = PLANNED | 미션 ID 생성됨 |
| 1-2 | 외벽 균열 영상 파일(mp4/jpg) 업로드 | 업로드 완료, storageKey 발급 | S3 presigned URL 정상 응답 |
| 1-3 | "AI 분석 시작" 버튼 클릭 | Job 큐 진입, 상태 = RUNNING | /api/v1/jobs/{id} 에서 RUNNING 확인 |
| 1-4 | 30초 대기 후 결과 확인 | 결함 후보 목록 표시 (≥1건) | defect-candidates 목록에 confidence 값 표시 |
| 1-5 | 신뢰도 90% 이상 후보 자동 확정 여부 확인 | AI_AUTO_ACCEPT 플래그 기준으로 동작 | 플래그 OFF 시 모두 PENDING 상태 |

**합격 판정:** 1-1~1-5 전체 Pass

---

## UAT-02 결함 후보 검토 및 defect 승격

**시나리오:** AI가 생성한 결함 후보를 검토자가 검토하여 공식 결함으로 승격한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 2-1 | AI 탐지 결과 > 검토 대기 목록 접속 | PENDING 후보 목록 표시 | 각 후보에 신뢰도, bbox, 탐지 타입 표시 |
| 2-2 | 후보 카드에서 "승인" 클릭 | reviewStatus = APPROVED | defect 문서 자동 생성됨 |
| 2-3 | 후보 카드에서 "거부" 클릭 | reviewStatus = REJECTED | defect 문서 미생성, 이유 기록됨 |
| 2-4 | 결함 목록에서 승격된 결함 확인 | 결함 목록에 신규 항목 표시 | severity, defectType, 위치 정보 포함 |
| 2-5 | 결함 상세에서 근거 이미지 확인 | 원본 이미지 + bbox 오버레이 표시 | sourceMediaId 연결 확인 |

**합격 판정:** 2-1~2-5 전체 Pass

---

## UAT-03 AI 진단 의견 생성 및 검토

**시나리오:** 결함 데이터를 기반으로 AI가 진단 의견 초안을 생성하고, 검토자가 승인한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 3-1 | 결함 상세 > "AI 진단 의견 요청" 클릭 | DIAGNOSIS_OPINION 잡 큐 진입 | 상태 = RUNNING |
| 3-2 | 의견 생성 완료 후 확인 | 초안(DRAFT) 의견 표시 | summary, technicalOpinionDraft 필드 포함 |
| 3-3 | 긴급도(urgency) 표시 확인 | IMMEDIATE/URGENT/ROUTINE/PLANNED 중 하나 | 긴급도 기준 색상 표시 |
| 3-4 | "승인" 버튼 클릭 (REVIEWER 권한) | status = APPROVED | 최종 보고서에 반영 가능 상태 |
| 3-5 | "반려" 클릭 후 이유 입력 | status = REJECTED, 이유 저장 | 점검자에게 재요청 알림 발송 |
| 3-6 | INSPECTOR 권한으로 승인 시도 | 403 Forbidden | 권한 분리 확인 |

**합격 판정:** 3-1~3-5 Pass, 3-6 Pass (403 확인)

---

## UAT-04 민원 접수 및 AI 자동 분류

**시나리오:** 주민이 민원을 접수하면 AI가 자동으로 분류하고 담당팀을 추천한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 4-1 | 민원 접수 (제목 + 내용 + 사진 선택) | 민원 status = OPEN | 접수번호 발급 |
| 4-2 | COMPLAINT_TRIAGE 잡 실행 확인 | ai-queue 진입 확인 | /api/v1/jobs 에서 RUNNING 상태 |
| 4-3 | 분류 결과 확인 (트리아지 패널) | category, urgencyScore(0-100), 배정 추천 | routingSuggestions ≥ 1건 |
| 4-4 | 담당팀 추천 신뢰도 확인 | confidence 값 표시 | 0.0~1.0 범위 정상 |
| 4-5 | "추천대로 배정" 클릭 | status = ASSIGNED, decisionStatus = ACCEPTED | 담당자에게 알림 발송 |
| 4-6 | "수동 배정" 선택 후 직접 지정 | decisionStatus = OVERRIDDEN | 재배정 이유 기록됨 |
| 4-7 | 민원 상태 변경 → RESOLVED 시 자동화 규칙 트리거 | 처리완료 알림 발송 | automation-executions 로그 확인 |

**합격 판정:** 4-1~4-7 전체 Pass

---

## UAT-05 자동화 규칙 설정 및 실행

**시나리오:** 민원 상태 변경 시 자동 알림을 발송하는 규칙을 설정하고 실행을 검증한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 5-1 | 자동화 > 새 규칙 생성 | 트리거(STATUS_CHANGE), 액션(SEND_NOTIFICATION) 설정 | 규칙 저장 성공 |
| 5-2 | 규칙 조건 설정 (complaint, OPEN→RESOLVED) | 조건 저장됨 | fromStatus, toStatus 정확히 저장 |
| 5-3 | 알림 액션 설정 (채널: IN_APP, 수신자: submittedBy) | 액션 저장됨 | channel = IN_APP, recipientField = submittedBy |
| 5-4 | 민원을 RESOLVED로 상태 변경 | NOTIFICATION_SEND 잡 큐 진입 | automation-executions 에 RUNNING 기록 |
| 5-5 | 실행 이력 확인 | status = COMPLETED, actionResult 기록됨 | actionsExecuted[0].status = SUCCESS |
| 5-6 | 규칙 비활성화 후 동일 상태 변경 | 알림 미발송, 규칙 스킵됨 | automation-executions 미생성 확인 |

**합격 판정:** 5-1~5-6 전체 Pass

---

## UAT-06 IoT 센서 데이터 수집 및 경보

**시나리오:** 센서 값이 임계치를 초과하면 자동으로 경보가 생성된다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 6-1 | 센서 등록 (진동 센서, 임계치 5.0 mm/s) | status = ACTIVE | 센서 ID 발급 |
| 6-2 | 정상 센서 값 전송 (4.5 mm/s) | 값 저장, anomalyDetected = false | quality = GOOD |
| 6-3 | 임계치 초과 값 전송 (6.2 mm/s) | anomalyDetected = true | IOT_THRESHOLD 경보 자동 생성 |
| 6-4 | 대시보드에서 경보 확인 | AlertType = IOT_THRESHOLD, status = ACTIVE | severity 표시 정확 |
| 6-5 | 경보 "확인" 처리 | status = ACKNOWLEDGED, acknowledgedBy 기록 | 처리자 이름 표시 |
| 6-6 | THRESHOLD 기반 자동화 규칙 실행 확인 | 알림 또는 작업지시 자동 생성 | automation-executions 로그 확인 |

**합격 판정:** 6-1~6-6 전체 Pass

---

## UAT-07 위험도 예측 및 유지보수 권장

**시나리오:** 결함/균열/센서 데이터를 종합하여 건물 위험도를 산정하고 유지보수를 권장한다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 7-1 | 위험도 계산 요청 (건물 단위) | RISK_SCORE_CALCULATE 잡 진입 | /api/v1/jobs 에서 RUNNING 확인 |
| 7-2 | 결과 확인 | score (0-100), level (LOW/MEDIUM/HIGH/CRITICAL) | subScores 5개 항목 모두 표시 |
| 7-3 | 히트맵에서 위험도 시각화 | 건물별 색상 표시 (녹/황/적) | 위험도 수치와 색상 일치 |
| 7-4 | 유지보수 권장 생성 확인 | maintenanceType, estimatedCost, suggestedTimeline | MAINTENANCE_RECOMMEND 자동 생성 |
| 7-5 | 권장 "승인" 처리 | status = APPROVED | 작업지시 연결 가능 상태 |

**합격 판정:** 7-1~7-5 전체 Pass

---

## UAT-08 통합 KPI 대시보드

**시나리오:** Phase 2 전체 기능의 결과가 KPI 대시보드에 정확히 반영된다.

| 단계 | 행동 | 기대 결과 | 합격 기준 |
|------|------|-----------|-----------|
| 8-1 | KPI 대시보드 접속 | 6개 핵심 지표 카드 표시 | 결함해소율, 점검완료율, 민원SLA, AI탐지건수, 자동화실행건수, 위험도분포 |
| 8-2 | 기간 필터 변경 (7일/30일/90일) | 필터 즉시 반영 | 기간별 수치 변화 확인 |
| 8-3 | 결함 하나 추가 → KPI 재확인 | 결함해소율 수치 변화 | 실시간 반영 (30초 이내) |
| 8-4 | AI 자동화 실행건수 확인 | automation-executions 건수와 일치 | ±1 이내 오차 허용 |

**합격 판정:** 8-1~8-4 전체 Pass

---

## UAT 합격 기준 요약

| 카테고리 | 시나리오 수 | 합격 기준 |
|----------|-------------|-----------|
| AI 파이프라인 | UAT-01~03 | 전체 합격 필수 |
| 민원 자동화 | UAT-04~05 | 전체 합격 필수 |
| IoT/센서 | UAT-06 | 전체 합격 필수 |
| 예지정비 | UAT-07 | 전체 합격 필수 |
| 대시보드 | UAT-08 | 전체 합격 필수 |

> **주의:** AI 결과(진단 의견, 트리아지 분류)는 모두 초안(DRAFT) 상태로 생성되며,  
> 담당자의 검토·승인 없이 자동 확정되지 않음을 UAT에서 반드시 확인할 것.
