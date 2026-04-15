# Phase 2 고도화 로드맵

## 전체 일정

```
Phase 1 MVP (현재)  ──────────────────────────────► 완료
Phase 2 Alpha       Month 1–2  AI 추론 + 드론 분석
Phase 2 Beta        Month 3–4  RPA + IoT + 예지정비
Phase 2 GA          Month 5–6  KPI/공공조달 대응
```

---

## 기능별 상세 계획

### 2-1. 드론 영상 AI 분석

**목적:** 드론으로 촬영한 외벽 영상에서 결함을 자동 탐지

**구현 전략:**

```
Mobile/Web → 영상 업로드 → S3
                             ↓
                    Bull Queue (ai-analysis)
                             ↓
                    Python AI Worker
                    ┌─────────────────────────┐
                    │ YOLOv8 / Detectron2     │
                    │ 결함 바운딩박스 탐지     │
                    │ 균열/박리/누수 분류      │
                    │ 심각도 점수 예측         │
                    └─────────────────────────┘
                             ↓
                    NestJS API (aiAnalysis endpoint)
                             ↓
                    결함 자동 생성 (aiClassification 필드)
```

**신규 엔티티:**
```typescript
interface DroneMedia extends CouchDocument {
  docType: 'droneMedia';
  complexId: string;
  buildingId: string;
  flightDate: string;
  pilotId: string;
  videoKey: string;          // S3 key
  frameKeys: string[];       // extracted frames
  analysisStatus: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';
  detectedDefects: AiDetection[];
  modelVersion: string;
  processingTimeMs: number;
}

interface AiDetection {
  frameKey: string;
  boundingBox: { x: number; y: number; w: number; h: number };
  defectType: DefectType;
  confidence: number;
  severity: SeverityLevel;
  autoCreatedDefectId?: string;   // if auto-converted to Defect
}
```

**API 추가:**
```
POST /api/v1/ai/drone-analysis        # 드론 영상 분석 요청
GET  /api/v1/ai/drone-analysis/:id    # 분석 결과 조회
POST /api/v1/ai/drone-analysis/:id/accept-defects  # AI 탐지 결과 일괄 결함 등록
```

---

### 2-2. AI 결함 자동 분류 및 진단 의견

**목적:** 현장 사진 업로드 시 AI가 결함 유형/심각도를 자동 분류

**구현:**
```typescript
// NestJS AI Module — OpenAI Vision API 또는 자체 모델
@Injectable()
export class AiClassificationService {
  async classifyDefect(imageUrl: string): Promise<{
    defectType: DefectType;
    severity: SeverityLevel;
    confidence: number;
    diagnosis: string;       // "균열 폭 약 2mm, 진행성 구조균열 의심. 즉시 정밀점검 필요."
    recommendedAction: string;
  }> {
    // 1차: OpenAI GPT-4o Vision API 활용 (빠른 MVP)
    // 2차: 자체 학습 모델 (Fine-tuned ResNet/EfficientNet)
  }
}
```

**Prompt Engineering (GPT-4o Vision):**
```
System: 당신은 건축물 결함 분류 전문가입니다.
        다음 이미지를 분석하여 JSON으로 응답하세요.
User: {image_base64}
      결함 유형, 심각도(LOW/MEDIUM/HIGH/CRITICAL),
      예상 원인, 권고 조치를 분석해주세요.
```

---

### 2-3. AI 민원 자동 분류 및 우선순위 예측

**구현:**
```typescript
@Injectable()
export class AiComplaintService {
  async classifyComplaint(title: string, description: string): Promise<{
    suggestedCategory: ComplaintCategory;
    suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    relatedDefectTypes: DefectType[];
    confidence: number;
  }> {
    // 훈련 데이터: 기존 처리 완료 민원 데이터 활용
    // 모델: KoELECTRA (한국어 특화 BERT 계열)
    // 서빙: FastAPI Python 마이크로서비스
  }
}
```

**인프라 추가 (docker-compose.yml):**
```yaml
ai-service:
  build: ./services/ai
  ports: ['8000:8000']
  environment:
    OPENAI_API_KEY: ${OPENAI_API_KEY}
    MODEL_PATH: /models/complaint_classifier
  volumes:
    - ./models:/models
```

---

### 2-4. RPA 업무 자동화

**목적:** 반복 행정 업무 자동화

| 업무 | 자동화 방법 | 트리거 |
|------|-------------|--------|
| 점검 결과 보고서 이메일 발송 | Nodemailer + 템플릿 | 점검 완료 이벤트 |
| 민원 접수 SMS 알림 | Kakao/NHN Cloud SMS | 민원 등록 |
| 계약 만료 알림 | Bull Cron Job | 30일/7일/1일 전 |
| 장기수선 계획 알림 | Bull Cron Job | 월 1회 |
| 공공기관 보고 PDF 자동 생성 | Puppeteer + Bull | 분기 1회 |

**구현 구조:**
```typescript
// apps/api/src/modules/automation/automation.processor.ts
@Processor('automation')
export class AutomationProcessor {
  @Process('send-inspection-report')
  async sendInspectionReport(job: Job) { ... }

  @Process('contract-expiry-reminder')
  async contractExpiryReminder(job: Job) { ... }

  @Cron('0 9 1 * *')  // 매월 1일 오전 9시
  async monthlyKpiReport() { ... }
}
```

---

### 2-5. IoT 센서 연동

**지원 센서 유형:**
- 균열 센서 (LVDT, 전기저항식)
- 기울기 센서 (MEMS 가속도계)
- 진동 센서 (압전소자)
- 침하 측정 (GPS RTK)
- 온습도 센서

**아키텍처:**
```
IoT Device → MQTT Broker (Mosquitto/EMQX)
                   ↓
            NestJS MQTT Subscriber
                   ↓
            CouchDB (sensorReading 문서)
                   ↓
            임계치 초과 시 → Alert 자동 생성
```

**신규 엔티티:**
```typescript
interface SensorDevice extends CouchDocument {
  docType: 'sensorDevice';
  complexId: string;
  deviceId: string;          // MAC address or serial
  sensorType: 'CRACK' | 'TILT' | 'VIBRATION' | 'SETTLEMENT' | 'TEMP_HUMIDITY';
  location: string;
  mqttTopic: string;
  samplingIntervalSec: number;
  thresholds: Record<string, number>;
  batteryLevel?: number;
  lastSeenAt?: string;
  isOnline: boolean;
}

interface SensorReading extends CouchDocument {
  docType: 'sensorReading';
  deviceId: string;
  complexId: string;
  timestamp: string;
  values: Record<string, number>;   // { crackWidthMm: 1.2, temp: 22.5 }
  exceedsThreshold: boolean;
  alertId?: string;
}
```

---

### 2-6. 예지정비 (Predictive Maintenance)

**목적:** 결함 이력 + 센서 데이터 기반 고장 예측

**구현 접근:**
1. **데이터 수집:** 결함 발생 이력, 균열 진전 속도, 환경 데이터
2. **특징 공학:** 시계열 변화율, 계절성, 노후도 지수
3. **모델:** ARIMA (단기 예측), LSTM (장기 패턴)
4. **출력:** "3개월 내 균열 임계치 도달 확률 78%"

```typescript
interface MaintenancePrediction extends CouchDocument {
  docType: 'maintenancePrediction';
  complexId: string;
  assetId: string;
  predictedFailureDate: string;
  failureProbability: number;    // 0-1
  predictedCost: number;
  recommendedAction: string;
  confidence: number;
  modelVersion: string;
  inputFeatures: Record<string, number>;
  generatedAt: string;
}
```

---

### 2-7. 장기수선 계획 추천

**목적:** 공동주택관리법 기반 장기수선 계획 자동 생성/추천

```typescript
interface LongTermMaintenancePlan extends CouchDocument {
  docType: 'ltmPlan';
  complexId: string;
  planYear: number;
  totalBudget: number;
  items: LtmPlanItem[];
  approvedBy?: string;
  approvedAt?: string;
  legalBasis: string;   // 공동주택관리법 제29조 등
}

interface LtmPlanItem {
  facilityType: string;
  workDescription: string;
  scheduledYear: number;
  estimatedCost: number;
  priority: SeverityLevel;
  basedOnDefects: string[];   // defectId[]
  basedOnPredictions: string[]; // maintenancePrediction ids
}
```

---

### 2-8. KPI / 실증 / 공공조달 대응

**핵심 성과 지표 자동 산출:**

| KPI | 목표 | 산출 방법 |
|-----|------|-----------|
| 민원 처리 시간 | 67% 개선 | (before 도입 기준선 vs 현재 avgResolutionHours) |
| 점검 업무 시간 | 50% 단축 | 점검 소요 시간 세션 타임스탬프 |
| 예방정비 비용 | 20% 절감 | preventiveCost / (preventive + corrective) |
| 입주민 만족도 | 측정 | complaint.satisfactionScore 평균 |

**공공조달 대응 보고서:**
```typescript
// API: POST /api/v1/kpi/public-procurement-report
// 산출물: 실증기관 제출용 엑셀/PDF 보고서
interface PublicProcurementReport {
  reportPeriod: { from: string; to: string };
  pilotSite: string;
  kpiAchievements: KPIAchievement[];
  costBenefitAnalysis: CostBenefit;
  userSatisfaction: SatisfactionSummary;
  technicalSpecs: TechSpec[];
  certifications: string[];
}
```

---

## 기술 스택 추가 사항 (Phase 2)

```yaml
# Phase 2 추가 서비스
services:
  ai-service:           # FastAPI + PyTorch
  mqtt-broker:          # Eclipse Mosquitto
  timescaledb:          # 시계열 센서 데이터 (PostgreSQL extension)
  grafana:              # IoT 모니터링 대시보드
  mlflow:               # AI 모델 버전 관리

# Python AI 의존성
python-deps:
  - ultralytics         # YOLOv8
  - torch torchvision
  - transformers        # KoELECTRA
  - pandas scikit-learn
  - fastapi uvicorn
  - celery redis
```

---

## 마이그레이션 전략

Phase 1 → Phase 2 전환 시 기존 데이터 호환성 유지:

1. **CouchDB 문서 마이그레이션:** 신규 필드는 `undefined` 허용 → 점진적 채움
2. **API 버전 관리:** `/api/v1/` 유지, 신규 기능은 `/api/v2/` 또는 새 엔드포인트
3. **모바일 앱:** 기존 PouchDB 스키마 호환, 신규 필드 옵셔널
4. **롤백 계획:** 각 마이크로서비스 독립 배포로 개별 롤백 가능

---

## 예상 효과 (Phase 2 완성 시)

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| 민원 처리시간 개선 | 30% | **67%** |
| 점검 업무 단축 | 25% | **50%** |
| 예방정비 비용 절감 | 10% | **20%** |
| 드론 점검 자동화 | 0% | **80%** |
| 고장 예측 정확도 | N/A | **75%+** |
