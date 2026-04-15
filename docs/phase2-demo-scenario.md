# Phase 2 데모 시나리오

> **목적:** 실증기관·조달 설명회에서 end-to-end 시연 재현 가능한 표준 데모 절차  
> **소요 시간:** 약 30분 (압축 시 15분)  
> **전제조건:** `scripts/dev/run-phase2-demo.sh` 실행 완료

---

## 데모 환경 설정

```bash
# 1. 인프라 기동
yarn docker:up

# 2. 데모 시드 데이터 로드
yarn workspace @ax/api seed:demo

# 3. Feature Flag 전체 활성화
curl -X PATCH http://localhost:3000/api/v1/feature-flags/batch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flags":{"PHASE2_AI":true,"PHASE2_DRONE":true,"PHASE2_RPA":true,"PHASE2_IOT":true,"AI_DEFECT_DETECTION":true,"AI_CRACK_ANALYSIS":true,"AI_DIAGNOSIS_OPINION":true,"AI_COMPLAINT_TRIAGE":true}}'

# 4. 워커 기동
yarn dev:workers
```

---

## STEP 1 — 드론 영상 업로드 및 AI 결함 탐지 (5분)

**화면:** 드론 미션 > 새 미션

1. **미션 생성**
   - 단지: 행복주택 1단지 / 건물: A동
   - 비행 일시: 오늘 날짜
   - "미션 생성" 클릭 → 미션 ID 확인

2. **외벽 영상 업로드**
   - 파일 선택: `demo-assets/crack-wall.jpg` (균열 포함 외벽 사진)
   - 업로드 완료 확인

3. **AI 분석 트리거**
   - "AI 분석 시작" 클릭
   - 작업 큐 상태 바(RUNNING) 표시 확인

4. **결과 확인** *(약 10~15초)*
   - 결함 후보 카드 3~5건 자동 생성
   - 각 카드에 **신뢰도(0.85~0.97)**, **bbox 좌표**, **탐지 타입(CRACK/SPALLING)** 표시

> **설명 포인트:** "AI 신뢰도 ≥90%는 자동 확정 후보, 80~89%는 검토 필요, <80%는 수동 입력 유도"

---

## STEP 2 — 결함 후보 검토 및 공식 결함 등록 (3분)

**화면:** AI 탐지 결과 > 검토 대기

1. **후보 목록 표시**
   - 신뢰도 높은 순 정렬, 이미지 썸네일 포함

2. **후보 승인**
   - 균열 후보(confidence=0.93) 클릭 → "승인" → defect 문서 자동 생성
   - 결함 severity = HIGH 자동 할당

3. **후보 거부**
   - 오탐 후보 클릭 → "거부" → 이유 입력 "조명 반사 오탐"

4. **결함 목록에서 확인**
   - 신규 결함이 결함 목록에 추가됨
   - 원본 이미지 + bbox 오버레이 확인

---

## STEP 3 — AI 진단 의견 생성 (3분)

**화면:** 결함 상세 > AI 진단 의견

1. **진단 요청**
   - 결함 상세 페이지 > "AI 진단 의견 요청" 버튼
   - DIAGNOSIS_OPINION 잡 진입 확인

2. **의견 초안 표시** *(약 5~10초)*
   - **요약:** "외벽 균열 폭 1.2mm, KCS 14 20 10 기준 경계값 초과"
   - **긴급도:** URGENT (황색)
   - **기술 의견:** 마크다운 형식 상세 분석

3. **검토자 승인**
   - REVIEWER 계정으로 로그인 → "승인" 클릭
   - status = APPROVED → 최종 보고서 반영 가능

> **설명 포인트:** "AI 의견은 항상 초안(DRAFT)으로 생성, 자격을 가진 검토자만 승인 가능 — 책임 소재 명확화"

---

## STEP 4 — 민원 접수 및 AI 자동 분류 (4분)

**화면:** 민원 > 새 민원 접수

1. **민원 접수**
   - 제목: "101동 외벽에서 물이 새요"
   - 내용: "3층 계단실 외벽에서 누수가 발생하고 있어 거주민 안전이 우려됩니다"
   - 사진 첨부: `demo-assets/leak-wall.jpg`
   - "접수" 클릭 → status = OPEN

2. **AI 분류 결과** *(약 5~8초)*
   - category: **FACILITY** (시설물 결함)
   - urgencyScore: **78** / 100
   - 배정 추천: 시설관리팀 (신뢰도 0.92)

3. **배정 처리**
   - "추천대로 배정" → status = ASSIGNED
   - 시설관리팀 담당자에게 IN_APP 알림 발송

4. **처리 완료 및 알림**
   - status = RESOLVED → 자동화 규칙 트리거
   - "처리완료 알림 발송됨" 토스트 메시지 확인

---

## STEP 5 — 자동화 규칙 실행 로그 확인 (2분)

**화면:** 자동화 > 실행 이력

1. 최근 실행 목록에서 방금 트리거된 `complaint_resolved_notify` 규칙 확인
2. status = COMPLETED, actionsExecuted[0] = SEND_NOTIFICATION SUCCESS
3. 실행 시간(durationMs) 확인

---

## STEP 6 — IoT 센서 경보 시연 (3분)

**화면:** IoT 센서 > 센서 대시보드

1. **센서 현황 확인**
   - 진동 센서 (A동 지하1층): 현재값 4.1 mm/s, 임계치 5.0 mm/s

2. **임계치 초과 시뮬레이션** *(시드 데이터 스크립트 실행)*
   ```bash
   curl -X POST http://localhost:3000/api/v1/sensor-readings \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"sensorId":"sensor:org_demo001:vib_001","value":6.8,"unit":"mm/s"}'
   ```

3. **경보 자동 생성 확인**
   - AlertType = IOT_THRESHOLD, severity = HIGH
   - 대시보드 상단에 빨간 배너 표시

---

## STEP 7 — 위험도 예측 및 유지보수 권장 (3분)

**화면:** 위험도 분석 > 건물 A동

1. **위험도 계산**
   - "위험도 계산" 버튼 → RISK_SCORE_CALCULATE 잡 실행

2. **결과 표시**
   - 종합 위험도: **72 / 100 (HIGH)**
   - 세부: 결함(30pt) + 균열(18pt) + 센서(14pt) + 민원(7pt) + 노후도(3pt)

3. **유지보수 권장 확인**
   - maintenanceType: SHORT_TERM_REPAIR
   - suggestedTimeline: 4주 이내
   - estimatedCost: 약 2,400만원

---

## STEP 8 — 통합 KPI 대시보드 (2분)

**화면:** 대시보드

| KPI 항목 | 데모 시점 값 |
|----------|-------------|
| 결함해소율 | 62% |
| 점검완료율 | 88% |
| 민원 SLA 준수율 | 94% |
| AI 탐지 이번달 | 47건 |
| 자동화 실행 이번달 | 183건 |
| 위험도 HIGH 이상 | 3개 건물 |

---

## 데모 Q&A 예상 질문 및 답변

**Q: AI가 틀렸을 때 책임은 누구에게?**  
A: 모든 AI 결과는 초안 상태이며, 자격을 갖춘 검토자가 승인해야 확정됩니다. 승인 이력과 담당자가 시스템에 기록됩니다.

**Q: 오프라인 환경에서도 동작하나요?**  
A: 현장 점검 앱은 오프라인 우선(CouchDB 로컬 동기화)으로 동작하며, 연결 복구 시 자동 동기화합니다.

**Q: 기존 시스템(HIS 등)과 연동 가능한가요?**  
A: Phase 3 계획에 표준 API 연동 모듈이 포함되어 있습니다. 현재는 REST API 기반 수동 연동이 가능합니다.

**Q: 데이터 보안은?**  
A: CouchDB 멀티테넌트 격리, JWT 인증, Role 기반 접근제어, HTTPS 적용. 민감 데이터는 환경변수로 분리 관리합니다.
