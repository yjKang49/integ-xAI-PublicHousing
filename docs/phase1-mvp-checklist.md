# Phase 1 MVP 완료 체크리스트

> 최종 갱신: 2026-04-08

---

## Slice 1 — 인프라 & 인증

| 항목 | 상태 | 파일 |
|------|------|------|
| CouchDB 연동 (Mango 쿼리, 인덱스 자동 생성) | ✅ | `apps/api/src/database/couch.service.ts` |
| Redis 연동 (캐시 + JWT 차단 목록) | ✅ | `apps/api/src/app.module.ts` |
| MinIO/S3 연동 (presigned URL) | ✅ | `apps/api/src/modules/media/media.service.ts` |
| JWT 로그인 + 리프레시 토큰 rotation | ✅ | `apps/api/src/modules/auth/auth.service.ts` |
| 역할 기반 접근 제어 (RBAC) | ✅ | `apps/api/src/common/guards/roles.guard.ts` |
| API 버전 관리 (`/api/v1`) | ✅ | `apps/api/src/main.ts` |
| Helmet + CORS + Rate limiting | ✅ | `apps/api/src/main.ts` |
| Swagger 문서 (`/api/docs`) | ✅ | `apps/api/src/main.ts` |
| Docker Compose (dev/prod) | ✅ | `docker-compose.dev.yml`, `docker-compose.yml` |

## Slice 2 — 조직·단지·건물

| 항목 | 상태 | 파일 |
|------|------|------|
| Organization CRUD (멀티테넌시) | ✅ | `apps/api/src/modules/organizations/` |
| HousingComplex CRUD | ✅ | `apps/api/src/modules/complexes/` |
| Building CRUD (단지별) | ✅ | `apps/api/src/modules/buildings/` |
| Floor CRUD | ✅ | `apps/api/src/modules/floors/` |
| Zone CRUD | ✅ | `apps/api/src/modules/zones/` |
| 관리자 웹 단지 목록/상세 화면 | ✅ | `apps/admin-web/src/app/features/complexes/` |

## Slice 3 — 점검 프로젝트 & 세션

| 항목 | 상태 | 파일 |
|------|------|------|
| InspectionProject CRUD | ✅ | `apps/api/src/modules/projects/` |
| InspectionSession CRUD | ✅ | `apps/api/src/modules/projects/sessions/` |
| 체크리스트 항목 (PASS/FAIL/N/A) | ✅ | 세션 PATCH |
| 관리자 웹 프로젝트/세션 화면 | ✅ | `apps/admin-web/src/app/features/inspection/` |

## Slice 4 — 결함 & 미디어

| 항목 | 상태 | 파일 |
|------|------|------|
| Defect CRUD + 필터/페이지네이션 | ✅ | `apps/api/src/modules/defects/` |
| Media 업로드 (presigned PUT URL) | ✅ | `apps/api/src/modules/media/` |
| 결함-미디어 연결 | ✅ | `packages/shared/src/types/entities.ts` |
| 모바일 결함 등록 화면 | ✅ | `apps/mobile-app/src/app/features/defects/` |

## Slice 5 — 3D 디지털 트윈

| 항목 | 상태 | 파일 |
|------|------|------|
| Marker3D CRUD (x,y,z + normal) | ✅ | `apps/api/src/modules/markers/` |
| Three.js 3D 뷰어 (Admin Web) | ✅ | `apps/admin-web/src/app/features/defects/viewer-3d/` |
| 마커 심각도별 색상 + 필터 | ✅ | `viewer-3d.component.ts` |

## Slice 6 — 민원 & 일정

| 항목 | 상태 | 파일 |
|------|------|------|
| Complaint CRUD + 상태 전환 | ✅ | `apps/api/src/modules/complaints/` |
| 민원 평균 처리시간 계산 | ✅ | `dashboard.service.ts` |
| Schedule CRUD + 반복 일정 | ✅ | `apps/api/src/modules/schedules/` |
| 관리자 웹 민원 상세/처리 화면 | ✅ | `apps/admin-web/src/app/features/complaints/` |

## Slice 7 — 원격 균열 모니터링

| 항목 | 상태 | 파일 |
|------|------|------|
| CrackGaugePoint CRUD | ✅ | `apps/api/src/modules/cracks/` |
| CrackMeasurement CRUD + 델타 계산 | ✅ | `apps/api/src/modules/cracks/` |
| 임계치 초과 Alert 자동 생성 | ✅ | `apps/api/src/modules/cracks/cracks.service.ts` |
| Alert CRUD + 인지(acknowledge) | ✅ | `apps/api/src/modules/alerts/` |
| 관리자 웹 균열 추이 차트 | ✅ | `apps/admin-web/src/app/features/cracks/` |
| 모바일 카메라 균열 측정 | ✅ | `apps/mobile-app/src/app/features/crack-measure/` |
| OpenCV.js 이미지 분석 알고리즘 | ✅ | `packages/shared/src/cv/crack-measurement-sample.ts` |
| CouchDB 인덱스 (균열, 경보) | ✅ | `apps/api/src/database/indexes/` |

## Slice 8 — 보고서 & 대시보드

| 항목 | 상태 | 파일 |
|------|------|------|
| 보고서 비동기 생성 (Bull 큐) | ✅ | `apps/api/src/modules/reports/` |
| Handlebars 보고서 템플릿 | ✅ | `apps/api/src/templates/report/` |
| PDF 변환 (Puppeteer) | ✅ | `report-generator.processor.ts` |
| S3 presigned 다운로드 URL (15분) | ✅ | `reports.service.ts` |
| 관리자 웹 보고서 목록 페이지 | ✅ | `apps/admin-web/src/app/features/reports/pages/` |
| 대시보드 KPI 카드 (12개) | ✅ | `dashboard-page.component.ts` |
| Redis 캐시 (60s TTL) | ✅ | `dashboard.service.ts` |
| KPI 정의서 | ✅ | `docs/kpi-definition.md` |

## Phase 1 완료 기준

| 기준 | 상태 |
|------|------|
| 로컬 데모 시나리오 9단계 재현 가능 | ✅ |
| Seed 후 관리자 계정 로그인 가능 | ✅ |
| 샘플 데이터로 Dashboard KPI 표시 | ✅ |
| 샘플 데이터로 PDF 보고서 생성 | ✅ |
| E2E 테스트 3개 이상 존재 | ✅ (auth, inspection-flow, complaint-flow) |
| README / run-local.md 존재 | ✅ |
| 새 개발자 bootstrap 스크립트 존재 | ✅ (`scripts/dev/bootstrap.sh`) |

---

## 미완성 항목 (Phase 2 대상)

| 항목 | 우선순위 | 참고 |
|------|----------|------|
| Work Order 관리자 웹 CRUD 화면 | P1 | 백엔드 완료, 프론트엔드 목록만 존재 |
| Asset(시설물 부위) 관리 화면 | P2 | 백엔드 완료, 프론트엔드 미구현 |
| KPI 시계열 추이 차트 | P1 | 대시보드 바 차트만 존재 |
| 모바일 오프라인 동기화 충돌 해결 | P1 | PouchDB 기본 동기화만 구현 |
| 이메일/SMS 알림 발송 | P2 | `docs/phase2-roadmap.md` 참고 |
| 보고서 공개 링크 (isPublic) 프론트엔드 | P2 | 백엔드 구현 완료 |
| 단지별 KPI 비교 대시보드 | P2 | — |
| 모바일 Android/iOS 네이티브 빌드 | P3 | Capacitor 설정만 존재 |

`docs/known-issues.md` 및 `docs/phase2-roadmap.md` 참조.
