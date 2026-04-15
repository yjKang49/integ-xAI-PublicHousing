# 알려진 이슈 및 제한사항

> integ-xAI-PublicHousing 최종 통합본 기준 — 최종 갱신: 2026-04-15  
> (Phase 1 MVP + integ-AX AI 통합 기능 포함)

---

## 🔴 치명적 (데모 진행 전 반드시 확인)

### KI-001: Handlebars 템플릿 파일 미복사 (개발 서버)

- **증상**: 보고서 생성 시 `ENOENT: template not found` 오류
- **원인**: `nest start:dev`는 `dist/`를 생성하지 않으므로 `assets` 복사 미실행
- **해결**:
  ```bash
  # 개발 환경: src/ 경로 폴백이 구현되어 있으나 경로 확인 필요
  # 또는 프로덕션 빌드 후 실행
  yarn workspace @ax/api build
  yarn workspace @ax/api start
  ```
- **대안**: 데모 시 이미 생성된 보고서(데모 seed 투입 데이터)를 활용

---

### KI-002: CouchDB 인덱스 첫 쿼리 지연

- **증상**: API 서버 시작 직후 첫 목록 요청이 수 초 지연
- **원인**: Mango 인덱스가 첫 쿼리 시 빌드됨
- **해결**: 서버 시작 후 30초 대기 또는 각 엔드포인트에 워밍업 요청 1회 실행
  ```bash
  curl -sf http://localhost:3000/api/v1/health
  curl -sf -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/api/v1/dashboard
  ```

---

## 🟡 주의 (데모 중 인지 필요)

### KI-003: PDF 보고서 생성 — Puppeteer 환경 의존

- **증상**: `Error: Failed to launch the browser process`
- **원인**: Docker 컨테이너 내 Chromium 미설치 또는 sandbox 설정 부재
- **해결**:
  ```yaml
  # docker-compose.yml에 추가 필요
  environment:
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "false"
    PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium-browser
  ```
- **임시 우회**: 로컬 실행 시 시스템 Chromium 감지 자동 사용

---

### KI-004: MediaService.uploadBuffer() 미구현 가능성

- **증상**: 보고서 생성 큐에서 `TypeError: this.media.uploadBuffer is not a function`
- **원인**: `report-generator.processor.ts`에서 호출하는 `MediaService.uploadBuffer()`가 구현되지 않았을 수 있음
- **해결**: `apps/api/src/modules/media/media.service.ts`에 아래 메서드 존재 여부 확인:
  ```typescript
  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string>
  async getPresignedUrl(key: string, expiresIn?: number): Promise<string>
  ```
  없을 경우 추가 구현 필요.

---

### KI-005: 모바일 앱 — iOS Safari CORS 이슈

- **증상**: 모바일 Safari에서 API 요청 CORS 오류
- **원인**: `credentials: true` + wildcard origin 조합 불가
- **해결**: `.env`에서 `CORS_ORIGINS=http://localhost:8100` 명시
  ```bash
  CORS_ORIGINS=http://localhost:4200,http://localhost:8100
  ```

---

### KI-006: Rate Limiting — E2E 테스트 환경

- **증상**: E2E 테스트 중 429 Too Many Requests 발생
- **원인**: ThrottlerGuard 100 req/60s 적용
- **해결**: E2E 환경에서 ThrottleGuard를 override:
  ```typescript
  // test setup
  .overrideGuard(ThrottlerGuard)
  .useValue({ canActivate: () => true })
  ```
  (현재 e2e 스펙에 미적용 — rate limiting 테스트 케이스 제외 필요 시 적용)

---

## 🟢 마이너 (시연 영향 없음)

### KI-007: 기존 defects.e2e-spec.ts 테스트 계정 불일치

- **증상**: 기존 `apps/api/test/defects.e2e-spec.ts`가 `admin@test.org` / `Test@1234` 계정을 사용하나 seed 데이터에는 존재하지 않음
- **영향**: 기존 e2e 파일 실행 시 beforeAll에서 401 → 모든 테스트 토큰이 null → 전체 실패
- **해결**: `test/e2e/` 아래 새 스펙 파일(auth, inspection-flow, complaint-flow)을 대신 사용

---

### KI-009: 대시보드 complaintTotal 계산 중복 가능성

- **증상**: `complaintResolutionRate`가 100%를 초과하는 경우
- **원인**: `complaintTotal = pendingComplaints + resolvedComplaints + overdueComplaints` 에서 overdueComplaints가 pendingComplaints와 중복될 수 있음
- **해결 방향**: 전체 민원 수 별도 쿼리 또는 `status IN ALL` 단일 쿼리로 교체

---

### KI-010: 3D 뷰어 — 모바일 성능

- **증상**: 저사양 기기에서 Three.js 렌더링 프레임 드랍
- **해결 방향**: LOD(Level of Detail) 적용, 모바일에서 마커 개수 제한

---

### KI-011: CrackHistoryComponent 레거시 라우트

- **내용**: `/cracks/gauge/:gaugeId/legacy` 라우트가 기존 컴포넌트를 유지하고 있으나 신규 `CrackHistoryPageComponent`로 대체됨
- **조치**: Phase 2에서 legacy 라우트 제거 예정

---

### KI-012: 보고서 목록 search 파라미터 미구현

- **증상**: `ReportListPageComponent`에 title 검색 입력란 존재하나 백엔드 `reports.service.ts`의 `findAll()`에 search 필터 미구현
- **임시 조치**: 검색 필드 입력 시 전체 목록 반환 (필터 미적용)

---

## 🟢 integ-AX AI 통합 기능 (신규)

### KI-013: AI 신기능 — Mock 추론 모드

- **대상**: ai-inbox, ai-performance, ai-pipeline, kobert-classifier, xai-shap-panel, vision2030, mileage
- **내용**: 현재 admin-web의 AI 기능은 실제 모델 API가 아닌 mock 데이터/시뮬레이션으로 동작
- **영향**: 시연·평가 목적으로는 완전 기능, 프로덕션 배포 시 ai-worker 연동 필요
- **연동 방법**: `environment.ts`의 `aiWorkerUrl` 설정 후 `AiInboxService.fetchItems()` → 실 API 교체
- **데모 영향**: 없음 (시연용으로 완전히 동작)

---

### KI-014: KoBERT 시뮬레이터 — 키워드 기반 분류

- **대상**: `/complaints/triage` → KoBERT 시뮬레이터 탭
- **내용**: 실제 KoBERT 추론이 아닌 키워드 매칭 + softmax 시뮬레이션
- **정밀도**: 자연어 처리 능력은 실제 KoBERT(Acc=92%) 대비 제한적
- **시연 사용**: 샘플 민원 8건은 의도된 결과를 보여주도록 설계됨
- **실 모델 연동**: ai-worker의 `ComplaintTriageProcessor` → KoBERT FastAPI endpoint 교체

---

### KI-015: Vision 2030 SVG 차트 — 정적 Mock 데이터

- **대상**: `/vision2030` 고장 예측 탭
- **내용**: GBR 모델 예측값이 정적 함수(`makeFaultForecast()`)로 생성됨
- **실 연동 방법**: ai-worker GBR 예측 API 결과를 `GET /api/v1/predictions/fault-forecast`로 제공 후 연동

---

### KI-016: CleanHouse 마일리지 — 정적 시드 데이터

- **대상**: `/mileage`
- **내용**: 50세대 리더보드가 컴포넌트 내 정적 배열로 생성됨
- **실 연동 방법**: CouchDB `mileage` 도큐먼트 스키마 정의 후 API 엔드포인트 연결

---

## 환경 요구사항 요약

| 항목 | 버전 | 비고 |
|------|------|------|
| Node.js | ≥ 20 LTS | 필수 |
| Docker Engine | ≥ 24 | 필수 |
| Yarn | ≥ 1.22 | 필수 |
| CouchDB | 3.3 | Docker 이미지 |
| Redis | 7.2 | Docker 이미지 |
| MinIO | 2024-03 | Docker 이미지 |
| Chrome/Chromium | 최신 | Puppeteer PDF 생성 |
