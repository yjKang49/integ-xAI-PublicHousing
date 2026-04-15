# 드론/영상 데이터 수집 파이프라인

> AX-SPRINT Phase 2 — 드론 점검 미션, 미디어 업로드, 프레임 추출, AI 분석 핸드오프

---

## 개요

드론으로 촬영한 영상·이미지를 수집하고, 자동으로 프레임을 추출하여 AI 결함 분석 파이프라인으로 전달하는 데이터 수집 레이어입니다.

```
[현장 드론 촬영]
       │
       ▼
[Admin Web / Mobile — 미션 생성 + 미디어 업로드]
       │  POST /drone-missions          (미션 생성)
       │  POST /drone-missions/:id/media/upload/init  (pre-signed URL 발급)
       │  PUT  <S3 pre-signed URL>      (클라이언트 → S3 직접 PUT)
       │  PATCH /drone-missions/:id/media/:mediaId/complete
       │
       ▼
[API Server — DroneMissionsService]
       │  HeadObject 검증 → Job 생성 (VIDEO_FRAME_EXTRACTION / IMAGE_METADATA_EXTRACTION)
       │  DroneMission.status = UPLOADING
       │
       ▼
[Job Worker — Bull Queue: job-queue]
       │  VIDEO_FRAME_EXTRACTION  → 키프레임 추출 → S3 업로드 → MediaFrame 문서 생성
       │  IMAGE_METADATA_EXTRACTION → EXIF/GPS 파싱 → 메타데이터 저장
       │
       ▼
[AI Worker — ai-queue (Phase 2 확장)]
       │  DRONE_VIDEO_ANALYSIS / AI_IMAGE_ANALYSIS
       │  → FrameDetection 결과 저장
       │
       ▼
[Admin Web — 프레임 갤러리 + 결함 시각화]
```

---

## 도메인 모델

### DroneMission

```typescript
// packages/shared/src/domain/drone-mission.ts
interface DroneMission {
  _id: `droneMission:${orgId}:${shortId}`;  // CouchDB document ID
  docType: 'droneMission';
  orgId: string;
  complexId: string;
  buildingId?: string;
  sessionId?: string;
  title: string;
  pilot: string;
  flightDate: string;           // YYYY-MM-DD
  droneModel?: string;
  weatherCondition?: string;
  description?: string;
  status: DroneMissionStatus;   // CREATED | UPLOADING | UPLOADED | PROCESSING | COMPLETED | FAILED
  mediaItems: DroneMissionMedia[];  // 임베디드 배열
  jobIds: string[];
  totalFrameCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

**미션 상태 전이:**

```
CREATED → UPLOADING → UPLOADED → PROCESSING → COMPLETED
                                             ↘ FAILED
```

- `CREATED` — 미션 생성됨, 미디어 없음
- `UPLOADING` — 첫 번째 미디어 업로드 init 완료 후
- `UPLOADED` — 최소 1개 미디어 complete 완료 후 (AI 분석 가능)
- `PROCESSING` — POST /analyze 호출 후
- `COMPLETED` / `FAILED` — AI 분석 완료/실패

### DroneMissionMedia (임베디드)

```typescript
interface DroneMissionMedia {
  mediaItemId: string;          // uuid
  fileName: string;
  mimeType: string;
  fileSize: number;             // bytes
  mediaType: 'VIDEO' | 'IMAGE';
  storageKey: string;           // S3 객체 키
  status: DroneMediaItemStatus; // PENDING | UPLOADED | EXTRACTING | DONE | FAILED
  capturedAt?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
  frameCount?: number;
  jobId?: string;
  createdAt: string;
}
```

### MediaFrame

```typescript
// packages/shared/src/domain/media-frame.ts
interface MediaFrame {
  _id: `mediaFrame:${orgId}:${missionId}:${frameIndex}`;
  docType: 'mediaFrame';
  missionId: string;
  mediaItemId: string;
  storageKey: string;           // S3 키 (frame_{000001}.jpg)
  thumbnailUrl?: string;        // CDN URL (Phase 2)
  frameIndex: number;
  timestampMs: number;
  aiResult?: {
    analysedAt: string;
    modelVersion: string;
    detections: FrameDetection[];
  };
}
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/v1/drone-missions` | 미션 생성 |
| `GET` | `/api/v1/drone-missions` | 미션 목록 (페이지네이션, 상태 필터) |
| `GET` | `/api/v1/drone-missions/:missionId` | 미션 상세 |
| `PATCH` | `/api/v1/drone-missions/:missionId` | 미션 수정 |
| `POST` | `/api/v1/drone-missions/:missionId/media/upload/init` | S3 pre-signed URL 발급 |
| `PATCH` | `/api/v1/drone-missions/:missionId/media/:mediaItemId/complete` | 업로드 완료 처리 + Job 생성 |
| `DELETE` | `/api/v1/drone-missions/:missionId/media/:mediaItemId` | 미디어 삭제 |
| `POST` | `/api/v1/drone-missions/:missionId/analyze` | AI 분석 시작 |
| `GET` | `/api/v1/drone-missions/:missionId/frames` | 추출 프레임 목록 |
| `GET` | `/api/v1/media-analysis/mission/:missionId` | 파이프라인 상태 |
| `GET` | `/api/v1/media-analysis/media/:mediaItemId` | 미디어별 파이프라인 |

### 미디어 업로드 플로우

```
1. POST /drone-missions/:id/media/upload/init
   Request:  { fileName, mimeType, fileSize, mediaType }
   Response: { mediaItemId, uploadUrl, storageKey }

2. PUT <uploadUrl>
   Headers:  Content-Type: <mimeType>
   Body:     <file binary>
   → S3로 직접 전송 (API 서버 경유 없음)

3. PATCH /drone-missions/:id/media/:mediaItemId/complete
   Request:  { capturedAt?, gpsLat?, gpsLng?, gpsAlt? }
   Response: { mission (updated), jobId }
   → HeadObjectCommand로 S3 업로드 검증
   → VIDEO: VIDEO_FRAME_EXTRACTION 잡 생성
   → IMAGE: IMAGE_METADATA_EXTRACTION 잡 생성
```

### S3 경로 규칙

```
drone/{orgId}/{complexId}/{shortMissionId}/videos/{timestamp}_{uuid}.mp4
drone/{orgId}/{complexId}/{shortMissionId}/images/{timestamp}_{uuid}.jpg
drone/{orgId}/{complexId}/{shortMissionId}/frames/{mediaItemId}/frame_{000001}.jpg
```

- pre-signed URL TTL: **15분** (대용량 파일 고려)
- `shortMissionId` = `missionId` 의 마지막 세그먼트 (`:` 기준 split)

---

## Job Worker 프로세서

### VIDEO_FRAME_EXTRACTION

`apps/job-worker/src/processors/extract-video-frames.processor.ts`

| 단계 | 진행률 | 설명 |
|------|--------|------|
| 영상 메타데이터 조회 | 10% | ffprobe로 duration/fps 조회 (Phase 2) |
| 영상 다운로드 | 20% | S3 presigned GET → 로컬 스트림 |
| 키프레임 추출 | 20-80% | fluent-ffmpeg 5초 간격 (기본) |
| S3 업로드 | 85% | 프레임 JPG → S3 |
| 완료 처리 | 100% | DroneMission frameCount 업데이트 |

**Phase 2 실제 구현 시 필요한 패키지:**
```bash
npm i fluent-ffmpeg @types/fluent-ffmpeg ffmpeg-static
```

**핵심 ffmpeg 명령 (주석으로 포함됨):**
```typescript
ffmpeg(videoLocalPath)
  .outputOptions([
    `-vf select='not(mod(n\\,${Math.round(fps * keyframeIntervalSec)}))'`,
    '-vsync', 'vfr',
    '-q:v', '2',
  ])
  .output(path.join(framesDir, 'frame_%06d.jpg'))
```

### IMAGE_METADATA_EXTRACTION

`apps/job-worker/src/processors/extract-image-metadata.processor.ts`

| 단계 | 진행률 | 설명 |
|------|--------|------|
| 이미지 다운로드 | 30% | S3 → 버퍼 |
| EXIF/메타데이터 파싱 | 70% | sharp + exif-parser |
| 결과 저장 | 100% | GPS, 해상도, 카메라 정보 업데이트 |

**Phase 2 실제 구현 시 필요한 패키지:**
```bash
npm i sharp exif-parser @aws-sdk/client-s3
```

---

## MediaAnalysisPipeline

각 미디어 아이템의 분석 상태를 추적하는 CouchDB 문서입니다.

```typescript
// packages/shared/src/domain/media-analysis-job.ts
interface MediaAnalysisPipeline {
  _id: `mediaPipeline:${orgId}:${mediaItemId}`;
  stages: {
    metadataExtraction: PipelineStage;
    frameExtraction:    PipelineStage;
    aiAnalysis:         PipelineStage;
  };
  overallStatus: PipelineStageStatus; // 가장 심각한 상태 반영
}
```

---

## Admin Web 컴포넌트

| 파일 | 역할 |
|------|------|
| `drone-mission-list-page.component.ts` | 미션 목록 (상태 필터, 페이지네이션, 10초 폴링) |
| `drone-mission-new-page.component.ts` | 미션 생성 폼 |
| `drone-mission-detail-page.component.ts` | 미션 상세 (정보 + 파이프라인 상태 + 미디어 목록) |
| `drone-upload-form.component.ts` | 미디어 업로드 다이얼로그 (드래그앤드롭, 진행률) |
| `frame-gallery.component.ts` | 프레임 그리드 갤러리 (결함 뱃지, 인라인 모달) |

**라우트:**
```
/drone             → DroneMissionListPageComponent
/drone/new         → DroneMissionNewPageComponent
/drone/:missionId  → DroneMissionDetailPageComponent
```

---

## Mobile (Ionic)

`apps/mobile-app/src/app/features/drone/drone-upload.page.ts`

현장에서 드론 미디어를 빠르게 업로드하는 Ionic 페이지입니다.

- 카메라(`capture="environment"`) 또는 갤러리에서 멀티 파일 선택
- 빠른 미션 생성 폼 (제목, 단지 ID, 조종사, 드론 기종)
- 동일한 3단계 S3 업로드 플로우 (init → PUT → complete)
- 파일별 진행률 + 전체 진행률 표시

**라우트:**
```
/tabs/drone-upload  → DroneUploadPage
```

---

## CouchDB 인덱스

`apps/api/src/database/indexes/drone-missions.index.json`

| 인덱스 | 필드 | 용도 |
|--------|------|------|
| `idx-droneMission-complex` | `orgId, complexId, createdAt` | 단지별 목록 |
| `idx-droneMission-status` | `orgId, status, createdAt` | 상태 필터 |
| `idx-droneMission-session` | `orgId, sessionId, createdAt` | 세션별 조회 |
| `idx-droneMission-building` | `orgId, buildingId, createdAt` | 동별 조회 |
| `idx-droneMission-pilot` | `orgId, pilot, flightDate` | 조종사별 조회 |
| `idx-mediaFrame-mission` | `orgId, missionId, frameIndex` | 프레임 목록 |
| `idx-mediaFrame-mediaItem` | `orgId, mediaItemId, frameIndex` | 미디어별 프레임 |

---

## Phase 2 확장 계획

### 실제 ffmpeg 연동

1. `apps/job-worker`에 ffmpeg-static 설치
2. `extract-video-frames.processor.ts` 주석 해제
3. S3 스트림 다운로드 → 임시 디렉토리 → ffmpeg 실행 → 업로드 → 정리

### S3 썸네일 CDN

- 프레임 업로드 후 CloudFront/CDN URL을 `MediaFrame.thumbnailUrl`에 저장
- `FrameGalleryComponent`에서 실제 이미지 표시

### AI 분석 연동

- `POST /drone-missions/:id/analyze` 호출 시 `DRONE_VIDEO_ANALYSIS` / `AI_IMAGE_ANALYSIS` 잡 생성
- `ai-worker`에서 처리 → `MediaFrame.aiResult` 업데이트
- 결함 탐지 결과가 `FrameGalleryComponent`의 결함 뱃지로 표시

### GPS 히트맵

- `DroneMissionMedia.gpsLat/Lng` + `MediaFrame` 위치 정보를 지도에 오버레이
- 결함 위치 시각화

---

## 개발 환경 실행

```bash
# API + Workers 동시 시작
docker-compose -f infra/docker/docker-compose.yml up -d

# API 서버 (별도 터미널)
yarn workspace @ax/api start:dev

# Job Worker (드론 프로세서 포함)
yarn workspace @ax/job-worker start:dev

# Admin Web
yarn workspace @ax/admin-web start
```

**MinIO 콘솔:** http://localhost:9001 (root / minio123)
**CouchDB Fauxton:** http://localhost:5984/_utils
