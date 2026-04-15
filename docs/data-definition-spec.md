# AX 공공임대주택 안전관리 플랫폼 — 데이터 정의서 (Data Definition Specification)

> **버전**: v1.1.0  
> **작성일**: 2026-04-08  
> **작성기관**: 에이톰엔지니어링  
> **적용 대상**: 경상북도개발공사(GBDC) 1차 납품 / SH서울도시공사 범용 확장 대비  
> **참조 자료**: GBDC 주거운영팀 인력운영 비교분석(2026), 공공주택 관리프로그램 고도화 보고서, SW 등록 명세서, 시설물 안전관리 시스템 아키텍처 설계서

---

## 목차

1. [시스템 개요 및 범위](#1-시스템-개요-및-범위)
2. [도메인 계층 구조](#2-도메인-계층-구조)
3. [공통 기반 스키마](#3-공통-기반-스키마)
4. [엔티티 상세 정의](#4-엔티티-상세-정의)
   - 4.1 조직 / 사용자 도메인
   - 4.2 시설물 계층 도메인
   - 4.3 점검 도메인
   - 4.4 결함 도메인
   - 4.5 균열 모니터링 도메인
   - 4.6 민원 도메인
   - 4.7 작업지시 도메인
   - 4.8 스케줄 / 알림 도메인
   - 4.9 KPI / 보고서 도메인
   - 4.10 감사 로그 도메인
5. [열거형(Enum) 정의](#5-열거형enum-정의)
6. [업무 프로세스 및 상태 전이](#6-업무-프로세스-및-상태-전이)
7. [다중 기관 확장 설계 (SH 납품 대비)](#7-다중-기관-확장-설계-sh-납품-대비)
8. [샘플 데이터 생성 기준](#8-샘플-데이터-생성-기준)
9. [데이터 표준화 제언](#9-데이터-표준화-제언)
- [부록 A. 레거시 i-FMS 스키마 → 현행 엔티티 매핑](#부록-a-레거시-i-fms-스키마--현행-엔티티-매핑)
- [부록 B. 성능 벤치마크 및 품질 기준](#부록-b-성능-벤치마크-및-품질-기준)
- [부록 C. SW 등록 명세 요약](#부록-c-sw-등록-명세-요약)

---

## 1. 시스템 개요 및 범위

### 1.1 플랫폼 목적

본 플랫폼은 공공임대주택(행복주택, 매입임대, 통합공공주택 등)의 **시설물 안전 점검, 결함 이력 관리, 균열 모니터링, 민원 처리, 작업지시**를 통합하는 SaaS 형태의 디지털 관리 시스템이다.

### 1.2 1차 납품 대상 (GBDC)

| 항목 | 현황 |
|------|------|
| 기관명 | 경상북도개발공사 (GBDC) |
| 관리 호수 | 8,500호 (2026년 기준) |
| 관리 지역 | 23개 시군 분산 |
| 담당 인력 | 주거운영팀 12명 |
| 인당 관리 호수 | 708호/명 (업계 기준 250~300호의 2.5배 초과) |
| 주택 유형 | 행복주택, 매입임대, 통합공공주택 |
| 2030 목표 | 12,000호 관리 |

### 1.3 2차 납품 대상 (SH 서울도시공사, 준비 기준)

| 항목 | 현황 |
|------|------|
| 기관명 | SH서울도시공사 |
| 관리 호수 | ~290,000호 (전국 최대) |
| 인당 관리 호수 | 290호/명 |
| 특징 | 대규모 단지 집중, 서울시 규제 연동 필요 |

### 1.4 시스템 경계

```
[모바일 앱 - 점검원]          [관리자 웹 - 관리자/검토자]
        │                              │
        └──────── REST API (NestJS) ───┘
                        │
              ┌─────────┼──────────┐
         CouchDB      Redis      MinIO/S3
       (org별 DB)   (캐시/큐)   (미디어)
```

---

## 2. 도메인 계층 구조

```
Organization (기관)
  └── HousingComplex (단지)
        ├── Building (동)
        │     ├── Floor (층)
        │     │     └── Zone (구역)
        │     │           └── FacilityAsset (시설자산)
        │     └── FacilityAsset
        ├── InspectionProject (점검 프로젝트)
        │     └── InspectionSession (점검 세션)
        │           ├── ChecklistItem (체크리스트 항목)
        │           └── Defect (결함)
        │                 ├── DefectMedia (첨부 미디어)
        │                 ├── DefectMarker3D (3D 마커)
        │                 └── WorkOrder (작업지시)
        ├── CrackGaugePoint (균열 게이지 포인트)
        │     └── CrackMeasurement (균열 측정값)
        ├── Complaint (민원)
        │     └── WorkOrder (작업지시)
        ├── Schedule (일정)
        ├── Alert (알림)
        ├── ActionPlan (조치 계획)
        ├── KPIRecord (KPI 기록)
        └── Report (보고서)
```

---

## 3. 공통 기반 스키마

모든 엔티티는 다음 `CouchDocument` 기반 필드를 공통으로 가진다.

### CouchDocument (공통 기반)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `_id` | `string` | PK, NOT NULL | `{docType}:{orgId}:{shortId}` 형식 |
| `_rev` | `string` | CouchDB 자동 관리 | 충돌 감지용 리비전 |
| `docType` | `string` | NOT NULL | 문서 타입 식별자 (인덱스 키) |
| `orgId` | `string` | NOT NULL, FK | 기관 식별자 (멀티 테넌트 분리) |
| `createdAt` | `string` | NOT NULL | ISO 8601 타임스탬프 |
| `updatedAt` | `string` | NOT NULL | ISO 8601 타임스탬프 |
| `createdBy` | `string` | NOT NULL | 생성자 userId |
| `updatedBy` | `string` | NOT NULL | 수정자 userId |
| `_deleted` | `boolean` | optional | soft delete 플래그 |

**ID 명명 규칙 예시:**
```
housingComplex:{orgId}:cplx_{12자리 uuid}
building:{orgId}:bld_{12자리 uuid}
defect:{orgId}:def_{timestamp}_{8자리 uuid}
complaint:{orgId}:cmp_{timestamp}_{8자리 uuid}
```

---

## 4. 엔티티 상세 정의

---

### 4.1 조직 / 사용자 도메인

#### 4.1.1 Organization (기관)

> `docType: 'organization'` | 플랫폼 레벨 DB (`_platform`)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `name` | `string` | NOT NULL | 기관명 (예: 경상북도개발공사) |
| `businessNumber` | `string` | NOT NULL, UNIQUE | 사업자등록번호 (10자리, 하이픈 제외) |
| `address` | `string` | NOT NULL | 본사 주소 |
| `contactName` | `string` | NOT NULL | 담당자 성명 |
| `contactEmail` | `string` | NOT NULL | 담당자 이메일 |
| `contactPhone` | `string` | NOT NULL | 담당자 전화번호 |
| `plan` | `enum` | NOT NULL | `FREE` \| `STARTER` \| `PRO` \| `ENTERPRISE` |
| `dbName` | `string` | NOT NULL, UNIQUE | CouchDB 데이터베이스명 |
| `isActive` | `boolean` | NOT NULL | 계약 활성 여부 |
| `contractStartDate` | `string` | NOT NULL | 계약 시작일 (ISO date) |
| `contractEndDate` | `string` | NOT NULL | 계약 종료일 (ISO date) |
| `logoUrl` | `string` | optional | 기관 로고 URL |

**GBDC 샘플값:**
```json
{
  "_id": "org:gbdc_001",
  "docType": "organization",
  "name": "경상북도개발공사",
  "businessNumber": "5068100074",
  "dbName": "ax_gbdc_001",
  "plan": "ENTERPRISE",
  "contractStartDate": "2026-01-01",
  "contractEndDate": "2028-12-31"
}
```

---

#### 4.1.2 User (사용자)

> `docType: 'user'` | 플랫폼 레벨 DB

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `email` | `string` | NOT NULL, UNIQUE | 로그인 이메일 |
| `passwordHash` | `string` | NOT NULL | bcrypt 해시 (클라이언트 미전송) |
| `name` | `string` | NOT NULL | 성명 |
| `phone` | `string` | optional | 연락처 |
| `role` | `UserRole` | NOT NULL | 역할 (아래 Enum 참조) |
| `organizationId` | `string` | NOT NULL, FK | 소속 기관 |
| `assignedComplexIds` | `string[]` | NOT NULL | 접근 가능 단지 목록 |
| `isActive` | `boolean` | NOT NULL | 계정 활성 여부 |
| `lastLoginAt` | `string` | optional | 마지막 로그인 시각 |
| `avatarUrl` | `string` | optional | 프로필 이미지 |

**역할별 접근 권한:**

| 역할 | 코드 | 설명 | GBDC 대응 직책 |
|------|------|------|----------------|
| `SUPER_ADMIN` | 플랫폼 운영자 | 전체 기관 관리 | 에이톰엔지니어링 |
| `ORG_ADMIN` | 기관 관리자 | 기관 내 전체 권한 | 팀장/과장 |
| `INSPECTOR` | 점검원 | 현장 점검 앱 사용 | 주임/직원 |
| `REVIEWER` | 검토자 | 점검 결과 승인 | 책임기술자 |
| `COMPLAINT_MGR` | 민원 담당 | 민원 처리 전담 | 민원담당 |
| `VIEWER` | 열람자 | 읽기 전용 | 경북도청 감독기관 |

---

### 4.2 시설물 계층 도메인

#### 4.2.1 HousingComplex (단지)

> `docType: 'housingComplex'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `name` | `string` | NOT NULL | 단지명 (예: 구미 행복주택 A단지) |
| `address` | `string` | NOT NULL | 소재 주소 |
| `totalUnits` | `number` | NOT NULL, ≥1 | 총 세대수 |
| `totalBuildings` | `number` | NOT NULL, ≥1 | 총 동수 |
| `builtYear` | `number` | NOT NULL | 준공연도 (4자리) |
| `managedBy` | `string` | NOT NULL, FK(User) | 관리책임자 userId |
| `latitude` | `number` | optional | WGS84 위도 |
| `longitude` | `number` | optional | WGS84 경도 |
| `qrCode` | `string` | NOT NULL, UNIQUE | QR 페이로드 |
| `siteModelUrl` | `string` | optional | 부지 수준 glTF 3D 모델 URL |
| `tags` | `string[]` | NOT NULL | 태그 (예: `['행복주택', '경주시']`) |

**GBDC 단지 예시 (클러스터링 기반 권역 설정):**

| 권역 | 권역명 | 관리 단지 수 | 세대수 | 관할 시군 |
|------|--------|-------------|--------|-----------|
| 1 | 경주·포항 | 8 | 2,100 | 경주, 포항 |
| 2 | 구미·김천 | 6 | 1,800 | 구미, 김천, 칠곡 |
| 3 | 안동·영주 | 7 | 1,600 | 안동, 영주, 봉화 |
| 4 | 기타 북부 | 9 | 3,000 | 상주, 문경 외 |

---

#### 4.2.2 Building (동)

> `docType: 'building'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `name` | `string` | NOT NULL | 동 명칭 (예: 101동) |
| `code` | `string` | NOT NULL | QR 코드용 단축 코드 |
| `totalFloors` | `number` | NOT NULL | 지상 층수 |
| `undergroundFloors` | `number` | NOT NULL, ≥0 | 지하 층수 |
| `totalUnits` | `number` | NOT NULL | 해당 동 세대수 |
| `builtDate` | `string` | NOT NULL | 준공일 (ISO date) |
| `structureType` | `string` | NOT NULL | 구조 형식 (예: 철근콘크리트) |
| `qrCode` | `string` | NOT NULL, UNIQUE | QR 페이로드 |
| `modelUrl` | `string` | optional | 동 수준 glTF URL |
| `floorPlanUrls` | `Record<string, string>` | NOT NULL | 층별 평면도 URL 맵 |

---

#### 4.2.3 Floor (층)

> `docType: 'floor'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `buildingId` | `string` | NOT NULL, FK | 소속 동 |
| `complexId` | `string` | NOT NULL | 소속 단지 (역정규화, 검색용) |
| `floorNumber` | `number` | NOT NULL | 층 번호 (지하는 음수: B1=-1) |
| `floorName` | `string` | NOT NULL | 표시명 (B1, 1F, 2F 등) |
| `area` | `number` | NOT NULL, >0 | 전용면적 m² |
| `planImageUrl` | `string` | optional | 평면도 이미지 URL |
| `zones` | `string[]` | NOT NULL | 소속 Zone ID 목록 |

---

#### 4.2.4 Zone (구역)

> `docType: 'zone'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `floorId` | `string` | NOT NULL, FK | 소속 층 |
| `buildingId` | `string` | NOT NULL | 소속 동 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `name` | `string` | NOT NULL | 구역명 (예: 계단실A, 복도 북측) |
| `code` | `string` | NOT NULL | 단축 코드 |
| `qrCode` | `string` | NOT NULL, UNIQUE | QR 페이로드 |
| `description` | `string` | optional | 구역 설명 |
| `boundingBox2D` | `BoundingBox2D` | optional | 평면도 상 좌표 (`{x,y,width,height}`) |

---

#### 4.2.5 FacilityAsset (시설 자산)

> `docType: 'facilityAsset'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `buildingId` | `string` | optional | 소속 동 |
| `floorId` | `string` | optional | 소속 층 |
| `zoneId` | `string` | optional | 소속 구역 |
| `name` | `string` | NOT NULL | 자산명 |
| `code` | `string` | NOT NULL | 관리 코드 |
| `assetType` | `FacilityAssetType` | NOT NULL | 자산 유형 (Enum 참조) |
| `material` | `string` | optional | 재질 |
| `installDate` | `string` | optional | 설치일 |
| `serviceLifeYears` | `number` | optional | 내용연수 (년) |
| `expectedReplacementDate` | `string` | optional | 교체 예정일 (자동 계산) |
| `qrCode` | `string` | NOT NULL, UNIQUE | QR 페이로드 |
| `specifications` | `Record<string,any>` | NOT NULL | 규격 명세 (키-값) |
| `lastInspectionDate` | `string` | optional | 최근 점검일 |
| `riskLevel` | `SeverityLevel` | optional | 위험도 |

---

### 4.3 점검 도메인

#### 4.3.1 InspectionProject (점검 프로젝트)

> `docType: 'inspectionProject'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 대상 단지 |
| `name` | `string` | NOT NULL | 프로젝트명 |
| `round` | `number` | NOT NULL, ≥1 | 점검 차수 |
| `inspectionType` | `enum` | NOT NULL | `REGULAR` \| `EMERGENCY` \| `SPECIAL` |
| `plannedStartDate` | `string` | NOT NULL | 계획 시작일 |
| `plannedEndDate` | `string` | NOT NULL | 계획 종료일 |
| `actualStartDate` | `string` | optional | 실제 시작일 |
| `actualEndDate` | `string` | optional | 실제 종료일 |
| `status` | `InspectionStatus` | NOT NULL | 프로젝트 상태 |
| `leadInspectorId` | `string` | NOT NULL, FK(User) | 책임 점검원 |
| `reviewerId` | `string` | optional, FK(User) | 검토자 |
| `checklistTemplateId` | `string` | optional | 사용 체크리스트 템플릿 |
| `sessionIds` | `string[]` | NOT NULL | 하위 세션 ID 목록 |

**점검 유형 분류 (GBDC 기준):**

| 구분 | 주기 | inspectionType | 설명 |
|------|------|---------------|------|
| 일상점검 | 매일 | REGULAR | 외관 이상 여부 |
| 주간점검 | 주 1회 | REGULAR | 공용부 순회 |
| 월간점검 | 월 1회 | REGULAR | 설비 점검 포함 |
| 분기점검 | 3개월 | REGULAR | 외벽·옥상 포함 |
| 반기점검 | 6개월 | REGULAR | 전수 점검 |
| 연간점검 | 연 1회 | REGULAR | 법정 정기점검 |
| 법정점검 | 법령 기준 | SPECIAL | 정밀안전진단 |
| 긴급점검 | 수시 | EMERGENCY | 재해·민원 대응 |

---

#### 4.3.2 InspectionSession (점검 세션)

> `docType: 'inspectionSession'` | 모바일 오프라인 지원 (PouchDB)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `projectId` | `string` | NOT NULL, FK | 소속 프로젝트 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `buildingId` | `string` | NOT NULL | 점검 대상 동 |
| `floorId` | `string` | optional | 점검 대상 층 |
| `zoneId` | `string` | optional | 점검 대상 구역 |
| `inspectorId` | `string` | NOT NULL, FK(User) | 점검원 |
| `status` | `SessionStatus` | NOT NULL | 세션 상태 |
| `startedAt` | `string` | optional | 점검 시작 시각 |
| `submittedAt` | `string` | optional | 제출 시각 |
| `approvedAt` | `string` | optional | 승인 시각 |
| `checklistItems` | `ChecklistItem[]` | NOT NULL | 체크리스트 항목 배열 |
| `defectCount` | `number` | NOT NULL | 발견 결함 수 |
| `weatherCondition` | `string` | optional | 날씨 (맑음/흐림/비/눈) |
| `temperature` | `number` | optional | 기온 (℃) |
| `humidity` | `number` | optional | 습도 (%) |
| `syncStatus` | `SyncStatus` | optional | 모바일 오프라인 동기화 상태 |

**SessionStatus 전이:**
```
DRAFT → ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED
```

---

#### 4.3.3 ChecklistItem (체크리스트 항목)

> InspectionSession 내 embedded array

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `id` | `string` | NOT NULL | 항목 UUID |
| `category` | `string` | NOT NULL | 분류 (구조체/외벽/방수·누수/공용설비/마감) |
| `description` | `string` | NOT NULL | 점검 항목 내용 |
| `result` | `ChecklistResult` | NOT NULL | `PASS` \| `FAIL` \| `N/A` \| `null` |
| `notes` | `string` | optional | 점검자 메모 |
| `photoUrls` | `string[]` | optional | 첨부 사진 URL |
| `order` | `number` | NOT NULL | 정렬 순서 |

---

#### 4.3.4 ChecklistTemplate (체크리스트 템플릿)

> `docType: 'checklistTemplate'` | 플랫폼 레벨

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `name` | `string` | NOT NULL | 템플릿명 |
| `version` | `string` | NOT NULL | 버전 (예: 2026.1) |
| `inspectionType` | `enum` | NOT NULL | 적용 점검 유형 |
| `items` | `ChecklistItem[]` | NOT NULL | 항목 템플릿 |
| `isDefault` | `boolean` | NOT NULL | 기본 템플릿 여부 |
| `isActive` | `boolean` | NOT NULL | 활성 여부 |

---

### 4.4 결함 도메인

#### 4.4.1 Defect (결함)

> `docType: 'defect'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `sessionId` | `string` | NOT NULL, FK | 발견 세션 |
| `projectId` | `string` | NOT NULL, FK | 소속 프로젝트 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `buildingId` | `string` | NOT NULL | 소속 동 |
| `floorId` | `string` | optional | 소속 층 |
| `zoneId` | `string` | optional | 소속 구역 |
| `assetId` | `string` | optional, FK(FacilityAsset) | 연관 시설 자산 |
| `defectType` | `DefectType` | NOT NULL | 결함 유형 |
| `severity` | `SeverityLevel` | NOT NULL | 심각도 |
| `description` | `string` | NOT NULL | 결함 설명 |
| `widthMm` | `number` | optional | 폭 (mm) — 균열 등 |
| `lengthMm` | `number` | optional | 길이 (mm) |
| `depthMm` | `number` | optional | 깊이 (mm) |
| `areaSqm` | `number` | optional | 면적 (m²) |
| `locationDescription` | `string` | NOT NULL | 위치 설명 |
| `photo2DCoords` | `{x,y}` | optional | 평면도 상 좌표 |
| `marker3DId` | `string` | optional, FK | 3D 마커 연결 |
| `mediaIds` | `string[]` | NOT NULL | 첨부 미디어 목록 |
| `isRepaired` | `boolean` | NOT NULL | 수리 완료 여부 |
| `repairedAt` | `string` | optional | 수리 완료 시각 |
| `repairedBy` | `string` | optional, FK(User) | 수리 담당자 |
| `repairNotes` | `string` | optional | 수리 내용 기록 |
| `workOrderId` | `string` | optional, FK | 연결 작업지시 |
| `aiClassification` | `string` | optional | AI 자동 분류 결과 (Phase 2) |
| `aiConfidence` | `number` | optional, 0~1 | AI 신뢰도 |

**DefectType 분류:**

| 코드 | 한글명 | 설명 |
|------|--------|------|
| `CRACK` | 균열 | 구조체·마감재 균열 |
| `LEAK` | 누수 | 물 침투·누수 |
| `SPALLING` | 박리/박락 | 콘크리트 표면 박리 |
| `CORROSION` | 부식 | 철근·금속 부식 |
| `EFFLORESCENCE` | 백태 | 콘크리트 백화현상 |
| `DEFORMATION` | 변형 | 구조 변형·처짐 |
| `SETTLEMENT` | 침하 | 지반·기초 침하 |
| `OTHER` | 기타 | 미분류 |

---

#### 4.4.2 DefectMedia (결함 미디어)

> `docType: 'defectMedia'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `defectId` | `string` | NOT NULL, FK | 연결 결함 |
| `sessionId` | `string` | NOT NULL | 소속 세션 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `mediaType` | `MediaType` | NOT NULL | `PHOTO` \| `VIDEO` \| `DRAWING` \| `MODEL_3D` |
| `fileName` | `string` | NOT NULL | 원본 파일명 |
| `fileSize` | `number` | NOT NULL | 바이트 단위 |
| `mimeType` | `string` | NOT NULL | MIME 타입 |
| `storageKey` | `string` | NOT NULL | S3/MinIO 오브젝트 키 |
| `capturedAt` | `string` | NOT NULL | 촬영 시각 |
| `capturedBy` | `string` | NOT NULL, FK(User) | 촬영자 |
| `gpsLat` | `number` | optional | GPS 위도 |
| `gpsLng` | `number` | optional | GPS 경도 |

---

#### 4.4.3 DefectMarker3D (3D 마커)

> `docType: 'defectMarker3D'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `defectId` | `string` | NOT NULL, FK | 연결 결함 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `buildingId` | `string` | NOT NULL | 소속 동 |
| `modelUrl` | `string` | NOT NULL | glTF 모델 URL |
| `position` | `{x,y,z}` | NOT NULL | Three.js 월드 좌표 |
| `normal` | `{x,y,z}` | optional | 표면 법선 벡터 |
| `meshName` | `string` | optional | 클릭된 메쉬 이름 |
| `floor` | `number` | optional | 층 번호 (meshName에서 파생) |
| `color` | `string` | NOT NULL | 심각도별 HEX 색상 |
| `label` | `string` | NOT NULL | 표시 레이블 |
| `iconType` | `DefectType` | NOT NULL | 아이콘 유형 |
| `isVisible` | `boolean` | NOT NULL | 표시 여부 |

---

### 4.5 균열 모니터링 도메인

#### 4.5.1 CrackGaugePoint (균열 게이지 포인트)

> `docType: 'crackGaugePoint'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `buildingId` | `string` | NOT NULL | 소속 동 |
| `floorId` | `string` | optional | 소속 층 |
| `zoneId` | `string` | optional | 소속 구역 |
| `name` | `string` | NOT NULL | 포인트 명칭 (예: GP-B2-C3-N) |
| `description` | `string` | NOT NULL | 위치 설명 |
| `qrCode` | `string` | NOT NULL, UNIQUE | QR 코드 |
| `installDate` | `string` | NOT NULL | 설치일 |
| `baselineWidthMm` | `number` | NOT NULL, ≥0 | 초기 균열폭 (mm) |
| `thresholdMm` | `number` | NOT NULL, >0 | 경보 임계값 (mm) |
| `location` | `string` | NOT NULL | 위치 설명 |
| `isActive` | `boolean` | NOT NULL | 활성 여부 |

---

#### 4.5.2 CrackMeasurement (균열 측정값)

> `docType: 'crackMeasurement'` | OpenCV.js 자동 측정

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `gaugePointId` | `string` | NOT NULL, FK | 게이지 포인트 |
| `complexId` | `string` | NOT NULL | 소속 단지 |
| `sessionId` | `string` | optional, FK | 연결 세션 |
| `measuredBy` | `string` | NOT NULL, FK(User) | 측정자 |
| `measuredAt` | `string` | NOT NULL | 측정 시각 |
| `capturedImageKey` | `string` | NOT NULL | 원본 이미지 S3 키 |
| `roiImageKey` | `string` | optional | ROI 추출 이미지 키 |
| `measuredWidthMm` | `number` | NOT NULL | 자동 측정값 (mm) |
| `changeFromBaselineMm` | `number` | NOT NULL | 초기값 대비 변화량 |
| `changeFromLastMm` | `number` | optional | 이전 측정 대비 변화량 |
| `isManualOverride` | `boolean` | NOT NULL | 수동 입력 여부 |
| `manualWidthMm` | `number` | optional | 수동 입력값 |
| `autoConfidence` | `number` | optional, 0~1 | OpenCV 신뢰도 |
| `exceedsThreshold` | `boolean` | NOT NULL | 임계값 초과 여부 |
| `alertId` | `string` | optional, FK | 연결 알림 |

---

### 4.6 민원 도메인

#### 4.6.1 Complaint (민원)

> `docType: 'complaint'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `buildingId` | `string` | optional | 소속 동 |
| `unitNumber` | `string` | optional | 호실 (예: 203호) |
| `category` | `ComplaintCategory` | NOT NULL | 민원 유형 |
| `status` | `ComplaintStatus` | NOT NULL | 처리 상태 |
| `title` | `string` | NOT NULL | 민원 제목 |
| `description` | `string` | NOT NULL | 민원 내용 |
| `priority` | `enum` | NOT NULL | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| `submittedBy` | `string` | NOT NULL | 민원인 성명 |
| `submittedPhone` | `string` | optional | 민원인 연락처 |
| `submittedAt` | `string` | NOT NULL | 접수 시각 |
| `assignedTo` | `string` | optional, FK(User) | 담당자 |
| `assignedAt` | `string` | optional | 배정 시각 |
| `dueDate` | `string` | optional | 처리 기한 |
| `resolvedAt` | `string` | optional | 처리 완료 시각 |
| `resolutionNotes` | `string` | optional | 처리 결과 기록 |
| `mediaIds` | `string[]` | NOT NULL | 첨부 미디어 |
| `workOrderId` | `string` | optional, FK | 연결 작업지시 |
| `satisfactionScore` | `number` | optional, 1~5 | 만족도 점수 |
| `classificationHint` | `string` | optional | AI 분류 힌트 키워드 |
| `aiSuggestion` | `string` | optional | AI 제안 분류 (Phase 2) |
| `timeline` | `ComplaintEvent[]` | NOT NULL | 상태 변경 이력 |

**ComplaintCategory 분류:**

| 코드 | 한글명 | GBDC 월 평균 비중 |
|------|--------|-----------------|
| `FACILITY` | 시설물 결함 | 35% |
| `NOISE` | 소음 | 20% |
| `SANITATION` | 위생 | 10% |
| `SAFETY` | 안전 | 15% |
| `PARKING` | 주차 | 8% |
| `ELEVATOR` | 엘리베이터 | 7% |
| `OTHER` | 기타 | 5% |

---

#### 4.6.2 ComplaintEvent (민원 이벤트)

> Complaint 내 embedded array (이력 추적)

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `timestamp` | `string` | NOT NULL | 이벤트 발생 시각 |
| `fromStatus` | `ComplaintStatus\|null` | NOT NULL | 이전 상태 |
| `toStatus` | `ComplaintStatus` | NOT NULL | 변경 후 상태 |
| `actorId` | `string` | NOT NULL | 처리자 userId |
| `notes` | `string` | optional | 메모 |

---

### 4.7 작업지시 도메인

#### 4.7.1 WorkOrder (작업지시)

> `docType: 'workOrder'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `buildingId` | `string` | optional | 소속 동 |
| `defectId` | `string` | optional, FK | 연결 결함 |
| `complaintId` | `string` | optional, FK | 연결 민원 |
| `title` | `string` | NOT NULL | 작업 제목 |
| `description` | `string` | NOT NULL | 작업 내용 |
| `assignedTo` | `string` | NOT NULL, FK(User) | 담당자 |
| `scheduledDate` | `string` | NOT NULL | 조치 예정일 |
| `startedAt` | `string` | optional | 작업 시작 시각 |
| `completedAt` | `string` | optional | 완료 시각 |
| `status` | `WorkOrderStatus` | NOT NULL | 작업 상태 |
| `priority` | `enum` | NOT NULL | 우선순위 |
| `estimatedCost` | `number` | optional | 예상 비용 (원) |
| `actualCost` | `number` | optional | 실제 비용 (원) |
| `vendor` | `string` | optional | 외주 업체명 |
| `mediaIds` | `string[]` | NOT NULL | 첨부 미디어 |
| `actionNotes` | `string` | optional | 현장 조치 결과 |
| `timeline` | `WorkOrderEvent[]` | NOT NULL | 상태 변경 이력 |

---

### 4.8 스케줄 / 알림 도메인

#### 4.8.1 Schedule (정기 일정)

> `docType: 'schedule'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `title` | `string` | NOT NULL | 일정명 |
| `scheduleType` | `enum` | NOT NULL | `REGULAR_INSPECTION` \| `EMERGENCY_INSPECTION` \| `MAINTENANCE` \| `CONTRACT_RENEWAL` |
| `recurrence` | `enum` | NOT NULL | `ONCE` \| `WEEKLY` \| `MONTHLY` \| `QUARTERLY` \| `ANNUALLY` |
| `nextOccurrence` | `string` | NOT NULL | 다음 실행일 |
| `assignedTo` | `string[]` | NOT NULL | 담당자 userId 목록 |
| `isActive` | `boolean` | NOT NULL | 활성 여부 |
| `overdueAlertDays` | `number` | NOT NULL, ≥1 | 초과 경보 기준일 |

---

#### 4.8.2 Alert (알림)

> `docType: 'alert'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `alertType` | `AlertType` | NOT NULL | 알림 유형 |
| `status` | `AlertStatus` | NOT NULL | `ACTIVE` \| `ACKNOWLEDGED` \| `RESOLVED` |
| `severity` | `SeverityLevel` | NOT NULL | 심각도 |
| `title` | `string` | NOT NULL | 알림 제목 |
| `message` | `string` | NOT NULL | 알림 내용 |
| `sourceEntityType` | `string` | NOT NULL | 발생 원인 엔티티 타입 |
| `sourceEntityId` | `string` | NOT NULL | 발생 원인 엔티티 ID |
| `acknowledgedBy` | `string` | optional | 확인자 |
| `resolvedAt` | `string` | optional | 해결 시각 |

---

### 4.9 KPI / 보고서 도메인

#### 4.9.1 KPIRecord (KPI 기록)

> `docType: 'kpiRecord'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `periodStart` | `string` | NOT NULL | 집계 시작일 |
| `periodEnd` | `string` | NOT NULL | 집계 종료일 |
| `totalComplaints` | `number` | NOT NULL | 총 민원 수 |
| `resolvedComplaints` | `number` | NOT NULL | 처리 완료 민원 수 |
| `avgResolutionHours` | `number` | NOT NULL | 평균 처리 소요시간 (시간) |
| `totalInspections` | `number` | NOT NULL | 총 점검 수 |
| `completedInspections` | `number` | NOT NULL | 완료 점검 수 |
| `overdueInspections` | `number` | NOT NULL | 지연 점검 수 |
| `totalDefects` | `number` | NOT NULL | 총 결함 수 |
| `criticalDefects` | `number` | NOT NULL | 긴급 결함 수 |
| `repairedDefects` | `number` | NOT NULL | 수리 완료 결함 수 |
| `preventiveMaintenanceCost` | `number` | NOT NULL | 예방 유지관리 비용 |
| `correctiveMaintenanceCost` | `number` | NOT NULL | 사후 유지관리 비용 |
| `avgSatisfactionScore` | `number` | optional | 평균 민원 만족도 |
| `complaintResolutionRate` | `number` | NOT NULL | 민원 처리율 (%) |
| `inspectionCompletionRate` | `number` | NOT NULL | 점검 이행률 (%) |
| `defectRepairRate` | `number` | NOT NULL | 결함 수리율 (%) |

**GBDC 목표 KPI 기준 (2026~2028):**

| 지표 | 현재 | 1차 목표 | 최종 목표 |
|------|------|----------|-----------|
| 민원 처리율 | 75% | 90% | 95% |
| 점검 이행률 | 82% | 95% | 98% |
| 결함 수리율 | 68% | 85% | 90% |
| 평균 민원 처리 시간 | 120시간 | 72시간 | 48시간 |
| 긴급 결함 대응 시간 | 24시간 | 12시간 | 6시간 |

---

#### 4.9.2 Report (보고서)

> `docType: 'report'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `complexId` | `string` | NOT NULL, FK | 소속 단지 |
| `projectId` | `string` | optional, FK | 연결 프로젝트 |
| `reportType` | `ReportType` | NOT NULL | 보고서 유형 |
| `title` | `string` | NOT NULL | 보고서 제목 |
| `generatedBy` | `string` | NOT NULL, FK(User) | 생성자 |
| `generatedAt` | `string` | NOT NULL | 생성 시각 |
| `fileKey` | `string` | NOT NULL | S3 PDF 키 |
| `fileSize` | `number` | NOT NULL | 파일 크기 (bytes) |
| `parameters` | `Record<string,any>` | NOT NULL | 생성 파라미터 |
| `isPublic` | `boolean` | NOT NULL | VIEWER 역할 공개 여부 |

---

### 4.10 감사 로그 도메인

#### 4.10.1 AuditLog (감사 로그)

> `docType: 'auditLog'`

| 필드명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| `action` | `string` | NOT NULL | 행위 코드 (예: `defect.create`) |
| `entityType` | `string` | NOT NULL | 대상 엔티티 타입 |
| `entityId` | `string` | NOT NULL | 대상 엔티티 ID |
| `actorId` | `string` | NOT NULL, FK(User) | 행위자 |
| `actorRole` | `UserRole` | NOT NULL | 행위자 역할 |
| `ipAddress` | `string` | optional | 요청 IP |
| `changes.before` | `object` | optional | 변경 전 값 |
| `changes.after` | `object` | optional | 변경 후 값 |

---

## 5. 열거형(Enum) 정의

### 5.1 UserRole

| 값 | 한글 | GBDC 직책 | SH 대응 |
|----|------|-----------|---------|
| `SUPER_ADMIN` | 플랫폼 운영자 | 에이톰엔지니어링 | 동일 |
| `ORG_ADMIN` | 기관 관리자 | 팀장/과장 | 부장/팀장 |
| `INSPECTOR` | 점검원 | 주임/직원 | 점검원 |
| `REVIEWER` | 검토자 | 책임기술자 | 안전관리자 |
| `COMPLAINT_MGR` | 민원 담당 | 민원담당 | 주거서비스팀 |
| `VIEWER` | 열람자 | 경북도청 | 서울시청 |

### 5.2 SeverityLevel

| 값 | 한글 | 대응 조치 | 기한 |
|----|------|-----------|------|
| `LOW` | 경미 | 관찰 유지 | 1년 이내 |
| `MEDIUM` | 보통 | 유지관리 계획 수립 | 6개월 이내 |
| `HIGH` | 높음 | 조속 조치 | 1개월 이내 |
| `CRITICAL` | 긴급 | 즉시 조치 | 24시간 이내 |

### 5.3 ComplaintStatus (상태 전이)

```
OPEN ──→ TRIAGED ──→ ASSIGNED ──→ IN_PROGRESS ──→ RESOLVED ──→ CLOSED
  ↑_____________↑       ↑                                          ↑
  (RECEIVED: 하위호환)   └──────────────────────────────────────────┘
```

### 5.4 WorkOrderStatus (상태 전이)

```
OPEN ──→ IN_PROGRESS ──→ COMPLETED
  ↑           │
  └───────────┘ (재개방)
  
  OPEN / IN_PROGRESS ──→ CANCELLED
```

---

## 6. 업무 프로세스 및 상태 전이

### 6.1 점검 워크플로우

```
[점검 계획 수립] → InspectionProject(PLANNED)
       ↓
[동별 세션 생성] → InspectionSession(DRAFT)
       ↓
[점검원 배정]    → InspectionSession(ASSIGNED)
       ↓
[현장 점검]      → InspectionSession(IN_PROGRESS) + Defect 생성
  (모바일 오프라인 지원 — PouchDB → CouchDB sync)
       ↓
[제출]           → InspectionSession(SUBMITTED)
       ↓
[검토자 검토]    → InspectionSession(APPROVED)
       ↓
[보고서 생성]    → Report 생성 (PDF)
       ↓
InspectionProject(COMPLETED)
```

### 6.2 결함 → 조치 워크플로우

```
Defect 등록 (severity 판단)
  ├── CRITICAL → Alert 자동 생성 → 즉시 WorkOrder 생성
  ├── HIGH     → ActionPlan 수립 → WorkOrder 생성
  └── LOW/MED  → 다음 점검 주기에 추적
  
WorkOrder(OPEN) → WorkOrder(IN_PROGRESS) → WorkOrder(COMPLETED)
                                                    ↓
                                          Defect.isRepaired = true
```

### 6.3 민원 처리 워크플로우

```
입주민 민원 접수 → Complaint(OPEN)
       ↓
[민원 담당자 검토] → Complaint(TRIAGED) + 우선순위·카테고리 분류
       ↓
[담당자 배정]      → Complaint(ASSIGNED)
       ↓
[현장 조치]        → Complaint(IN_PROGRESS) ← WorkOrder 생성
       ↓
[처리 완료]        → Complaint(RESOLVED) → 만족도 조사
       ↓
Complaint(CLOSED)
```

---

## 7. 다중 기관 확장 설계 (SH 납품 대비)

### 7.1 멀티 테넌트 아키텍처

```
_platform DB: Organization, User (전체)
ax_gbdc_001 DB: GBDC 전용 데이터
ax_sh_001   DB: SH 전용 데이터  ← 신규 추가만으로 확장
```

- 기관별 **완전 격리** (CouchDB database-per-org 패턴)
- `orgId` 필드로 모든 쿼리 범위 제한 → 데이터 유출 방지
- 신규 기관 온보딩 = Organization 문서 + DB 생성 + 인덱스 초기화

### 7.2 GBDC vs SH 요구사항 차이 분석

| 항목 | GBDC (경북) | SH (서울) | 설계 대응 |
|------|-------------|-----------|----------|
| 규모 | 8,500호 | ~290,000호 | `orgId` 분리, 페이지네이션 |
| 주택 유형 | 행복주택·매입임대 | 장기임대·분양전환 | `tags` 필드로 유형 관리 |
| 점검 기준 | 경북도 조례 기준 | 서울시 조례 기준 | `ChecklistTemplate` 기관별 분리 |
| 조직 구조 | 팀(단일) | 본부·처·팀(다계층) | `UserRole` 확장 가능 구조 |
| 연계 시스템 | 없음 | 서울시 GIS, SH 포털 | `webhookUrl` 필드 추가 예정 |
| 보고 기준 | 경북도청 | 서울시청 | `isPublic` + VIEWER 역할 |
| 비용 규모 | 중소 | 대형 | `estimatedCost` / `actualCost` 필드 공통 |

### 7.3 SH 납품 시 추가 필요 엔티티 (예측)

| 엔티티 | 설명 | 우선순위 |
|--------|------|---------|
| `ResidentProfile` | 입주민 정보 (세대주·가족) | HIGH |
| `LeaseContract` | 임대차 계약 (계약일·갱신·퇴거) | HIGH |
| `MaintenanceFee` | 관리비 부과·수납 이력 | MEDIUM |
| `EvictionRecord` | 퇴거 및 재입주 이력 | MEDIUM |
| `PublicNotice` | 공지사항 게시판 | LOW |
| `EmergencyReport` | 긴급 안전 신고 | HIGH |

---

## 8. 샘플 데이터 생성 기준

### 8.1 가용 데이터 현황 평가

| 데이터 항목 | 가용 여부 | 출처 | 완성도 |
|------------|----------|------|--------|
| 단지 목록·세대수 | ✅ | GBDC 클러스터링 자료 | 80% |
| 조직 구조·인력 | ✅ | 주거운영팀 분석 HTML | 95% |
| 점검 유형·주기 | ✅ | 관리프로그램 보고서 | 90% |
| 민원 분류·처리 흐름 | ✅ | 관리프로그램 HTML | 85% |
| 시설자산 목록 | ⚠️ | 제한적 (점검표 일부) | 40% |
| 균열 게이지 실측값 | ✅ | 특허·센트럴시티 사례 | 70% |
| KPI 벤치마크 | ✅ | 비교분석 자료 | 95% |
| 입주민·계약 정보 | ❌ | 개인정보 미제공 | 0% |

**평가 결론:** 시스템 개발·시연용 샘플 데이터 생성에 **충분한 정보**가 확보되어 있음.  
입주민 개인정보는 가상 데이터(Faker)로 대체 생성 권고.

### 8.2 시드 데이터 구성 권고안

```
Organization: 1개 (GBDC)
HousingComplex: 5개 단지 (권역별 대표)
Building: 단지당 3~5동
Defect: 단지당 15~20건 (유형·심각도 분산)
Complaint: 월 150건 기준 → 3개월치 450건
CrackGaugePoint: 동당 3~5포인트
KPIRecord: 월별 6개월치
User: 6명 (역할별 1명씩)
```

---

## 9. 데이터 표준화 제언

### 9.1 국가 표준 연계 필요 항목

| 항목 | 관련 표준 | 현재 상태 | 권고 사항 |
|------|----------|-----------|----------|
| 시설물 분류 코드 | 국토부 시설물통합정보관리시스템(FMS) | 자체 정의 | FMS 코드 체계 병행 관리 |
| 결함 분류 체계 | KCS 41 10 05 (콘크리트 균열 보수) | 자체 정의 | 국토부 기준 코드 매핑 |
| 좌표계 | EPSG:5186 (국가 평면) | WGS84 | 국가 GIS 연계 시 변환 로직 필요 |
| 날짜 형식 | ISO 8601 | 준수 중 | 유지 |
| 개인정보 | 개인정보보호법 | 암호화 저장 | PII 필드 별도 암호화 레이어 권고 |

### 9.2 SH 납품 대비 우선 표준화 권고

1. **`ResidentProfile` 엔티티 선제 설계**  
   SH는 서울시 주거복지 포털과 연계 필수 → 입주민 ID 체계를 서울시 통합 ID와 매핑할 수 있는 `externalId` 필드 사전 정의

2. **보고서 템플릿 기관별 분리**  
   경북도·서울시 각 조례 기준에 따른 보고서 형식이 다름 → `reportTemplateId`를 기관(org)별로 관리

3. **점검 체크리스트 버전 관리**  
   법령 개정 시 기존 완료 세션 이력을 보존하면서 새 템플릿 적용 가능하도록 `version` + `checklistTemplateId` 스냅샷 저장

4. **비용 단위 표준화**  
   GBDC: 외주 단가 체계 단순 / SH: 단가 DB 연동 예상 → `estimatedCost` 필드에 `currency: 'KRW'` 메타 필드 추가 권고

5. **멀티 언어 대비 (장기)**  
   해외 입주민 증가 추세 → `title`, `description` 필드에 `_i18n` 확장 구조 예약

---

*본 문서는 에이톰엔지니어링 내부 검토용이며, 납품 계약 체결 후 세부 사항은 발주처 요구사항에 맞게 개정한다.*

---

## 부록 A. 레거시 i-FMS 스키마 → 현행 엔티티 매핑

> **참조**: 시설물 안전관리 시스템 아키텍처 설계서 (i-FMS v1.x, 에이톰엔지니어링)  
> 원시 CouchDB 컬렉션명을 현행 AX 플랫폼 엔티티명으로 정식 매핑한다.

### A.1 CouchDB docType 매핑표

| 레거시 docType (i-FMS) | 현행 docType (AX 플랫폼) | 현행 엔티티 클래스 | 비고 |
|----------------------|------------------------|----------------|------|
| `atomuses` | `user` | `User` | 사용자 계정 (roles 필드 구조 변경) |
| `atomdiag` | `inspectionProject` | `InspectionProject` | 진단 프로젝트 (GBDC 점검 단위) |
| `atomdetail` | `housingComplex` + `building` | `HousingComplex`, `Building` | 단지·동 분리 (원본은 단일 문서) |
| `atomdefect` | `defect` | `Defect` | 결함 기록 (3D 좌표 `x,y,z` 보존) |
| `atomlink` | `defectMarker3d` | `DefectMarker3D` | 3D 뷰어 링크 + 어노테이션 |

### A.2 레거시 → 현행 필드 상세 매핑

#### atomuses → User

| 레거시 필드 | 현행 필드 | 타입 변환 |
|-----------|---------|---------|
| `_id` | `_id` (prefix: `user:`) | 네임스페이스 추가 |
| `email` | `email` | 동일 |
| `password` | `passwordHash` | bcrypt 해시화 |
| `role` (string) | `roles` (string[]) | 단일→배열 (다중 역할 지원) |
| `name` | `name` | 동일 |
| `phone` | `phone` | 동일 |
| `orgId` | `organizationId` | 필드명 변경 |
| _(없음)_ | `isActive`, `lastLoginAt` | 신규 추가 |

#### atomdiag → InspectionProject

| 레거시 필드 | 현행 필드 | 타입 변환 |
|-----------|---------|---------|
| `diagName` | `title` | 필드명 변경 |
| `diagDate` | `startDate` | 필드명 변경 |
| `diagEndDate` | `endDate` | 신규 매핑 |
| `diagStatus` | `status` (InspectionStatus enum) | 문자열 → enum |
| `assignee` | `assignedInspectors` (string[]) | 단일→배열 |
| `complexRef` | `complexId` | 참조 ID 정규화 |
| _(없음)_ | `checklistTemplateId`, `version` | 신규 추가 (법령 개정 대응) |

#### atomdetail → HousingComplex + Building

| 레거시 필드 | 현행 엔티티 | 현행 필드 | 비고 |
|-----------|-----------|---------|------|
| `complexName` | HousingComplex | `name` | |
| `address` | HousingComplex | `address` | 구조체 분리 권고 |
| `buildingName` | Building | `name` | |
| `floorCount` | Building | `totalFloors` | |
| `unitCount` | Building | `totalUnits` | |
| `modelPath` | Building | `model3dPath` | IFC/glTF 경로 |
| `buildingType` | Building | `buildingType` (enum) | |

#### atomdefect → Defect

| 레거시 필드 | 현행 필드 | 타입 변환 |
|-----------|---------|---------|
| `defectType` | `defectType` (DefectType enum) | 자유문자→enum 표준화 |
| `severity` | `severity` (Severity enum) | 동일 구조 유지 |
| `posX`, `posY`, `posZ` | `position3d.x`, `position3d.y`, `position3d.z` | 중첩 객체로 리팩터링 |
| `meshName` | `meshName` | 동일 |
| `repaired` (boolean) | `isRepaired` (boolean) | 네이밍 컨벤션 통일 |
| `imgUrl` | _(분리)_ → `DefectMedia.storageKey` | 미디어 분리 엔티티화 |
| `diagId` | `sessionId` | InspectionSession 참조로 변경 |
| _(없음)_ | `zoneId`, `floorId`, `buildingId`, `complexId` | 계층 FK 전체 추가 |

#### atomlink → DefectMarker3D

| 레거시 필드 | 현행 필드 | 타입 변환 |
|-----------|---------|---------|
| `defectRef` | `defectId` | 참조 ID 정규화 |
| `linkUrl` | _(제거)_ | 뷰어 내장으로 URL 불필요 |
| `annotation` | `label` | 필드명 변경 |
| `visible` | `isVisible` | 네이밍 통일 |
| `posX`, `posY`, `posZ` | `position.x`, `position.y`, `position.z` | 중첩 객체화 |
| _(없음)_ | `normalVector`, `colorHex`, `markerType` | 3D 렌더링용 신규 필드 |

---

## 부록 B. 성능 벤치마크 및 품질 기준

> **출처**: 시설물 안전관리 시스템 아키텍처 설계서 — 성능 요구사항 섹션

### B.1 응답시간 SLA (서비스 수준 협약)

| 구분 | 목표값 | 측정 조건 |
|------|-------|---------|
| 3D 모델 초기 로딩 | ≤ 3초 | 50MB 이하 IFC 파일, LTE 환경 |
| 균열 측정 데이터 렌더링 | ≤ 1초 | 최근 30일 측정값 |
| 대시보드 KPI 집계 | ≤ 2초 | 전체 단지 기준 |
| 결함 목록 페이지 로딩 | ≤ 1.5초 | 100건 페이지 기준 |
| 오프라인→온라인 동기화 | ≤ 30초 | 100건 결함 + 미디어 제외 |
| 이미지 업로드 처리 | ≤ 5초 | 5MB JPEG 단일 파일 |

### B.2 동시 접속 및 가용성

| 구분 | 목표값 |
|------|-------|
| 최대 동시 사용자 | 50명 (GBDC 기준) / 500명 (SH 확장 기준) |
| 시스템 가용성 (Uptime) | ≥ 99.5% (월 기준) |
| 데이터 백업 주기 | 24시간 (CouchDB 복제) |
| RPO (복구 목표 시점) | ≤ 1시간 |
| RTO (복구 목표 시간) | ≤ 4시간 |

### B.3 데이터 용량 기준

| 데이터 유형 | 건당 용량 | 연간 누적 예상 (GBDC) |
|-----------|---------|-------------------|
| Defect 문서 | ~2 KB | ~500 MB (500,000건 기준) |
| DefectMedia (이미지) | 2~5 MB | ~500 GB (100,000장 기준) |
| CrackMeasurement | ~0.5 KB | ~18 MB (월 3,000건) |
| Complaint | ~3 KB | ~5 MB (연 1,800건) |
| 3D 모델 (IFC/glTF) | 10~100 MB | ~5 GB (50동 기준) |

---

## 부록 C. SW 등록 명세 요약

> **참조**: 프로그램등록신청명세서 (한국저작권위원회 SW등록 양식)  
> 공공임대주택 안전관리 플랫폼 SW 저작권 등록을 위한 핵심 정보 요약

### C.1 기본 정보

| 항목 | 내용 |
|------|------|
| 프로그램명 | AX 공공임대주택 안전관리 플랫폼 (AX Public Housing Safety Management Platform) |
| 개발사 | 에이톰엔지니어링 |
| 관련 특허 | 특허 제10-2204016호 (3D 시설물 안전 점검 시스템) |
| 관련 특허 | 특허 제10-2398241호 (원격 균열 모니터링 시스템) |
| 개발 언어 | TypeScript (NestJS, Angular, Ionic) |
| 운영 환경 | Node.js 20+, CouchDB 3.x, Redis 7.x, Docker |
| 라이선스 형태 | 소유권 에이톰엔지니어링 / 사용권 납품 기관 |

### C.2 핵심 기능 모듈 목록 (등록 대상)

| 모듈 | 설명 | 기술 스택 |
|------|------|---------|
| 관리자 웹 (Admin Web) | 단지·동 관리, 결함 조회, 민원 처리, KPI 대시보드 | Angular 18, Standalone Components |
| 모바일 점검 앱 (Mobile App) | 오프라인 점검, 결함 기록, 3D 마커, 균열 촬영 | Ionic 8, PouchDB, offline-first |
| 백엔드 API (REST API) | 멀티테넌트 NestJS, JWT 인증, Mango 쿼리 | NestJS 10, CouchDB nano |
| 3D 뷰어 | IFC/glTF 모델 위에 결함 마커 오버레이 | Three.js / IFC.js |
| 균열 모니터링 엔진 | 게이지 포인트 자동 임계값 초과 탐지, 알림 생성 | NestJS Schedule, CouchDB View |
| 민원 처리 워크플로 | OPEN→TRIAGED→ASSIGNED→IN_PROGRESS→RESOLVED→CLOSED | NestJS + CouchDB |

### C.3 아키텍처 구성도 (텍스트)

```
[Angular Admin Web]  [Ionic Mobile App]
         │                  │ (PouchDB offline)
         └──────┬───────────┘
                │ HTTPS REST /api/v1
         [NestJS API Server]
           ├── Auth (JWT + Passport)
           ├── Guards (Roles, JwtAuth)
           ├── Modules: complexes, defects, complaints, work-orders,
           │           crack-gauges, inspections, dashboard, kpi
           └── Database Layer
                ├── CouchDB (org별 DB: ax_{orgId}_{env})
                │     └── PouchDB Sync ← Mobile App
                ├── Redis (캐시, 큐)
                └── MinIO / S3 (미디어 스토리지)
```

---

*본 문서는 에이톰엔지니어링 내부 검토용이며, 납품 계약 체결 후 세부 사항은 발주처 요구사항에 맞게 개정한다.*
