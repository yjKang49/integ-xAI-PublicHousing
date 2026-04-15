# 균열 측정 알고리즘 설계 문서

> 버전: 1.0 | 작성일: 2026-04-08 | 대상: MVP Phase 1

---

## 1. 개요

원격 균열 모니터링 MVP는 다음 두 가지 측정 방식을 지원합니다.

| 방식 | 설명 | 신뢰도 |
|------|------|--------|
| **IMAGE_ASSISTED** | OpenCV.js 이미지 분석 → 자동 균열 폭 측정 | 40–90% |
| **MANUAL** | 측정 실패 또는 낮은 신뢰도 시 수동값 입력 | 100% (사람 측정) |

> **Phase 2** 에서는 딥러닝 기반 crack segmentation 모델(예: U-Net)로 교체 예정.

---

## 2. 데이터 흐름

```
[모바일 앱]
  └── CrackCaptureComponent
        ├── 1. 이미지 촬영 or 갤러리 선택
        ├── 2. ROI(관심영역) 선택 (선택)
        ├── 3. OpenCV.js 자동 측정 실행
        │     ├── 성공 (신뢰도 ≥ 0.6): IMAGE_ASSISTED
        │     └── 실패 or 신뢰도 낮음: 수동 입력 권장
        └── 4. CrackMeasurementPage → API 전송

[API 서버]
  └── POST /api/v1/cracks/measurements
        ├── 이전 측정값 조회 → changeFromLastMm 계산
        ├── baselineWidthMm 대비 → changeFromBaselineMm 계산
        ├── exceedsThreshold 판단
        └── 임계치 초과 시 → Alert 자동 생성 (중복 방지)

[Admin Web]
  └── CrackHistoryPageComponent
        ├── 게이지 포인트 정보 카드
        ├── CrackChartComponent (시계열 그래프)
        └── 측정 이력 테이블
```

---

## 3. OpenCV.js 알고리즘 단계별 설명

### 3.1 전처리

```
원본 이미지 (RGBA)
  → 그레이스케일 변환 (cv.cvtColor)
  → 가우시안 블러 (5×5 커널, 노이즈 제거)
  → 적응형 이진화 (ADAPTIVE_THRESH_GAUSSIAN_C, THRESH_BINARY_INV)
       - 균열: 어두운 영역 → 이진화 후 흰색
       - 배경: 밝은 영역 → 검은색
  → 모폴로지 닫힘 (3×3 커널, MORPH_CLOSE)
       - 균열 선 내부 작은 구멍 제거
```

### 3.2 균열 윤곽선 검출

```python
# 의사코드
contours = findContours(morphed, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)
largest  = max(contours, key=contourArea)
bRect    = boundingRect(largest)
crackWidthPx = min(bRect.width, bRect.height)
# 균열은 길이 >> 폭이므로 최솟값이 폭
```

### 3.3 눈금 검출 (캘리브레이션)

```
Canny 엣지 검출 → Hough 직선 변환
  → 수평 직선 필터 (|θ| < 0.2 rad or |θ - π| < 0.2 rad)
  → 3px 이내 직선 클러스터링 → 고유 눈금 수 계산
  → 인접 눈금 간 평균 간격(px) 계산
  → px/mm = 눈금 간격(px) / 눈금 1칸(mm)
```

### 3.4 균열 폭 변환

```
crackWidthMm = crackWidthPx / pxPerMm

# 눈금 미검출 시 fallback:
crackWidthMm ≈ crackWidthPx × 0.01  (경험적 상수, ~10px/mm 가정)
```

### 3.5 신뢰도 계산

| 조건 | 가산점 |
|------|--------|
| 균열 윤곽선 면적 > 50px² | +0.5 |
| 눈금 2개 이상 검출 | +0.4 |
| 균열 윤곽선 면적 > 200px² | +0.1 |

- 신뢰도 ≥ 0.6: 자동 측정 채택
- 신뢰도 < 0.6: 수동 입력 권장 메시지 표시

---

## 4. 변화량 계산 (서버 측)

```typescript
// 기준 대비 변화량
changeFromBaselineMm = effectiveWidth - gaugePoint.baselineWidthMm

// 전회 측정 대비 변화량 (deltaFromPrevious)
changeFromLastMm = effectiveWidth - previousMeasurement.measuredWidthMm

// 임계치 초과 여부
exceedsThreshold = effectiveWidth >= gaugePoint.thresholdMm
```

> `effectiveWidth` = `isManualOverride` ? `manualWidthMm` : `measuredWidthMm`

---

## 5. 경보 규칙

| 규칙 | 트리거 조건 | 심각도 | 중복 방지 |
|------|------------|--------|-----------|
| 균열 임계치 초과 | `measuredWidthMm ≥ thresholdMm` | HIGH | 동일 gaugePointId ACTIVE 알림 1건만 유지 |
| 균열 긴급 초과 | `measuredWidthMm ≥ thresholdMm × 1.5` | CRITICAL | 별도 처리 (Phase 2) |

```typescript
// 내부 유틸 — createIfNotExists
if (existingActiveAlert) {
  return null;  // 중복 생성 방지
}
await alertsService.create({ ... alertType: 'CRACK_THRESHOLD', ... });
```

---

## 6. 데이터 모델 요약

### CrackGaugePoint
```typescript
{
  _id: 'crackGaugePoint:org001:cgp_...',
  docType: 'crackGaugePoint',
  name: '101동 계단실 A 균열 #1',
  baselineWidthMm: 0.3,   // 설치 시 기준값
  thresholdMm: 0.5,        // 경보 임계치
  isActive: true,
}
```

### CrackMeasurement
```typescript
{
  _id: 'crackMeasurement:org001:cm_...',
  docType: 'crackMeasurement',
  gaugePointId: 'crackGaugePoint:org001:cgp_...',
  measuredAt: '2026-04-08T10:00:00Z',
  measuredWidthMm: 0.62,
  changeFromBaselineMm: +0.32,   // 기준 대비
  changeFromLastMm: +0.05,        // 전회 대비 (deltaFromPrevious)
  isManualOverride: false,
  autoConfidence: 0.82,
  exceedsThreshold: true,
  method: 'IMAGE_ASSISTED',
}
```

### Alert (자동 생성)
```typescript
{
  _id: 'alert:org001:alt_...',
  docType: 'alert',
  alertType: 'CRACK_THRESHOLD',
  severity: 'HIGH',
  status: 'ACTIVE',
  title: '균열 임계치 초과: 101동 계단실 A 균열 #1',
  message: '측정값 0.62mm가 임계치 0.5mm를 초과했습니다. (기준 대비 +0.32mm)',
  sourceEntityType: 'crackMeasurement',
  sourceEntityId: 'crackGaugePoint:org001:cgp_...',
}
```

---

## 7. 테스트 데이터 시나리오

| 시나리오 | measuredWidthMm | 예상 결과 |
|---------|----------------|----------|
| 정상 (기준 이하) | 0.35 | exceedsThreshold=false, 알림 없음 |
| 경고 (임계치 80%) | 0.42 | exceedsThreshold=false, UI warning 표시 |
| 임계치 초과 | 0.55 | exceedsThreshold=true, Alert HIGH 생성 |
| 수동 측정 | manualWidthMm=0.70 | method=MANUAL, Alert HIGH |

---

## 8. 제한 사항 및 Phase 2 로드맵

### 현재 제한
- OpenCV.js 단순 이진화: 조명, 그림자, 표면 질감에 민감
- 눈금 검출: 표준 균열 측정자(crack gauge) 사용 시 정확도 향상
- 모바일 WASM 로딩: 4-6초 초기화 시간 소요

### Phase 2 개선 계획
1. **딥러닝 crack segmentation**: TFLite 모델 모바일 탑재
2. **IoT 센서 연동**: 자동화된 연속 측정 데이터 수집
3. **드론 이미지 배치 처리**: 대규모 외벽 균열 자동 분석
4. **예측 모델**: 균열 진행 속도 기반 수명 예측

---

## 9. 파일 위치 참조

| 역할 | 경로 |
|------|------|
| OpenCV 샘플 코드 | `packages/shared/src/cv/crack-measurement-sample.ts` |
| 모바일 캡처 컴포넌트 | `apps/mobile-app/src/app/features/crack-measure/capture/crack-capture.component.ts` |
| 모바일 측정 등록 페이지 | `apps/mobile-app/src/app/features/crack-measure/crack-measurement.page.ts` |
| Admin 차트 컴포넌트 | `apps/admin-web/src/app/features/cracks/components/crack-chart.component.ts` |
| Admin 이력 페이지 | `apps/admin-web/src/app/features/cracks/pages/crack-history-page.component.ts` |
| Admin 경보 페이지 | `apps/admin-web/src/app/features/alerts/pages/alert-list-page.component.ts` |
| API 균열 모듈 | `apps/api/src/modules/cracks/` |
| API 경보 모듈 | `apps/api/src/modules/alerts/` |
| DB 인덱스 | `apps/api/src/database/indexes/crack-*.index.json` |
