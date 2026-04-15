# IoT 센서 연동 — Phase 2-8

## 1. 아키텍처

```
[IoT 기기 / Mock Script]
        │
        │  REST POST /api/v1/sensor-readings/ingest
        │  REST POST /api/v1/sensor-readings/batch
        ▼
[NestJS API — SensorReadingsService]
  ├── 센서 기기 조회 (deviceKey → SensorDevice)
  ├── 임계치 평가 (evaluateThreshold)
  ├── SensorReading 저장 (CouchDB)
  ├── SensorDevice.lastValue 갱신
  └── 임계치 초과 시 → AlertsService.createIfNotExists()
                              └── Alert (IOT_THRESHOLD) 생성
```

## 2. 도메인 모델

### SensorDevice
| 필드 | 설명 |
|------|------|
| `deviceKey` | 인제스트 식별자 (고유) — 기기가 이 키로 데이터 전송 |
| `sensorType` | TEMPERATURE / HUMIDITY / VIBRATION / LEAK / POWER / CO2 / PRESSURE / WATER_LEVEL |
| `thresholds` | warning/critical 최소·최대값 + 측정 단위 |
| `lastValue` | 최근 측정값 (비정규화) |
| `lastSeenAt` | 마지막 통신 시각 |

### SensorReading
| 필드 | 설명 |
|------|------|
| `deviceKey` | 어느 기기의 측정값인지 |
| `recordedAt` | 센서 측정 시각 (서버 수신 시각과 다를 수 있음) |
| `thresholdStatus` | NORMAL / WARNING / CRITICAL |
| `alertId` | 임계치 초과 시 생성된 경보 ID |
| `source` | REST_INGEST / BATCH_IMPORT / MANUAL |

## 3. API 엔드포인트

### 센서 기기 관리
```
POST   /api/v1/sensors          센서 등록 (ORG_ADMIN)
GET    /api/v1/sensors          목록 조회 (필터: complexId, sensorType, status)
GET    /api/v1/sensors/:id      단건 조회
PATCH  /api/v1/sensors/:id      수정
DELETE /api/v1/sensors/:id      삭제 (soft)
```

### 센서값 수집 & 조회
```
POST /api/v1/sensor-readings/ingest    단일 수집
POST /api/v1/sensor-readings/batch     일괄 수집 (최대 500건)
GET  /api/v1/sensor-readings           시계열 조회 (deviceId / deviceKey / complexId / from / to)
```

### 예시 요청

#### 센서 등록
```json
POST /api/v1/sensors
{
  "complexId": "complex:org1:cmp_001",
  "name": "101동 지하 온도계 #1",
  "deviceKey": "bldg101-temp-b1-01",
  "sensorType": "TEMPERATURE",
  "locationDescription": "101동 지하 1층 기계실",
  "thresholds": {
    "unit": "°C",
    "warningMin": 5, "warningMax": 30,
    "criticalMin": 0, "criticalMax": 40
  }
}
```

#### 단일 ingest
```json
POST /api/v1/sensor-readings/ingest
{
  "deviceKey": "bldg101-temp-b1-01",
  "value": 42.5,
  "recordedAt": "2026-04-14T09:00:00.000Z"
}
```

#### Batch ingest
```json
POST /api/v1/sensor-readings/batch
{
  "readings": [
    { "deviceKey": "bldg101-temp-b1-01", "value": 22.3 },
    { "deviceKey": "bldg101-hum-b1-01",  "value": 58.7 }
  ]
}
```

#### 시계열 조회
```
GET /api/v1/sensor-readings?deviceKey=bldg101-temp-b1-01&limit=100
```

## 4. Alert 연동 규칙

| 임계치 상태 | Alert severity | 중복 방지 |
|------------|---------------|-----------|
| WARNING    | HIGH          | 동일 deviceId에 ACTIVE IOT_THRESHOLD 경보가 이미 있으면 미생성 |
| CRITICAL   | CRITICAL      | 동일 deviceId에 ACTIVE IOT_THRESHOLD 경보가 이미 있으면 미생성 |

- 경보는 `AlertsService.createIfNotExists()`를 통해 생성
- 경보 해제 시 다음 임계치 초과부터 새 경보 생성

## 5. Mock Ingestion 스크립트

```bash
# 1. 로그인해서 토큰 발급
TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login \
  -d '{"email":"admin@happy-housing.kr","password":"Admin@1234"}' \
  -H "Content-Type:application/json" | jq -r .data.accessToken)

# 2. Seed (센서 등록 + 과거 6시간 데이터)
ACCESS_TOKEN=$TOKEN ts-node scripts/mock/mock-sensor-ingestion.ts

# 3. Batch (500개 랜덤 데이터 1회)
ACCESS_TOKEN=$TOKEN MODE=batch ts-node scripts/mock/mock-sensor-ingestion.ts

# 4. Stream (5초 간격 실시간)
ACCESS_TOKEN=$TOKEN MODE=stream ts-node scripts/mock/mock-sensor-ingestion.ts
```

## 6. 지원 센서 유형 및 기본 임계치

| 유형 | 단위 | WARNING | CRITICAL |
|------|------|---------|----------|
| TEMPERATURE | °C | <5 or >30 | <0 or >40 |
| HUMIDITY | % | <30 or >70 | <20 or >85 |
| VIBRATION | mm/s | >5 | >10 |
| LEAK | — | — | >0.5 |
| POWER | kW | >80 | >100 |
| CO2 | ppm | >1000 | >2000 |
| PRESSURE | kPa | <80 or >110 | <60 or >130 |
| WATER_LEVEL | % | >70 | >90 |

## 7. CouchDB 인덱스

- `idx-sensor-devicekey` — deviceKey 기반 ingest 조회
- `idx-reading-device-recorded` — 센서별 시계열 조회
- `idx-reading-threshold-status` — 임계치 초과 건 집계

## 8. 운영 고려사항

### 데이터 보존
- SensorReading은 시계열 특성상 빠르게 누적됨
- CouchDB 용량 모니터링 필요
- 장기 보관 시: 일/시간 단위 집계 후 원시 데이터 삭제 권장

### 오류 처리
- `deviceKey`가 없는 요청: 400 반환 (ingest 실패)
- Alert 생성 실패: ingestion은 성공 처리, 경고 로그만 출력
- `lastSeen` 갱신 실패: ingestion은 성공 처리 (비동기)

### 향후 확장
- MQTT 브로커 연동 (Mosquitto + bull 큐)
- WebSocket 실시간 푸시 (SSE 또는 Socket.IO)
- 센서별 샘플링 주기 설정
- 배터리 잔량 경보
- 기기 오프라인 감지 (lastSeenAt 기준 N분 초과 시 ERROR 상태)
