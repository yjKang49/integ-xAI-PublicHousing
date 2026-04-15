#!/usr/bin/env ts-node
// scripts/mock/mock-sensor-ingestion.ts
// Phase 2-8: IoT 센서 mock ingestion 스크립트
//
// 사용법:
//   1. 로컬 서버 실행 상태에서:
//      ACCESS_TOKEN=<jwt> ts-node scripts/mock/mock-sensor-ingestion.ts
//
//   2. 배치 모드 (500개 랜덤 시계열 생성):
//      ACCESS_TOKEN=<jwt> MODE=batch ts-node scripts/mock/mock-sensor-ingestion.ts
//
//   3. 연속 스트림 (5초 간격 전송):
//      ACCESS_TOKEN=<jwt> MODE=stream ts-node scripts/mock/mock-sensor-ingestion.ts
//
// 환경변수:
//   API_BASE   - API 서버 주소 (기본: http://localhost:3000)
//   ACCESS_TOKEN - JWT 액세스 토큰 (필수)
//   MODE       - batch | stream | seed (기본: seed)
//   COMPLEX_ID - 대상 단지 ID

import * as https from 'https';
import * as http from 'http';

const API_BASE    = process.env.API_BASE    ?? 'http://localhost:3000';
const TOKEN       = process.env.ACCESS_TOKEN ?? '';
const MODE        = process.env.MODE        ?? 'seed';
const COMPLEX_ID  = process.env.COMPLEX_ID  ?? 'complex:_platform:cmp_001';

if (!TOKEN) {
  console.error('❌  ACCESS_TOKEN 환경변수가 필요합니다.');
  console.error('   예: ACCESS_TOKEN=$(curl -s http://localhost:3000/api/v1/auth/login -d \'{"email":"admin@happy-housing.kr","password":"Admin@1234"}\' -H "Content-Type:application/json" | jq -r .data.accessToken)');
  process.exit(1);
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────

function request(method: string, path: string, body?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const data = body ? JSON.stringify(body) : undefined;
    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function addNoise(base: number, noise: number) {
  return base + (Math.random() - 0.5) * 2 * noise;
}

function isoOffset(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

// ── 센서 정의 ─────────────────────────────────────────────────────────

const MOCK_SENSORS = [
  {
    name: '101동 지하 온도계 #1',
    deviceKey: 'bldg101-temp-b1-01',
    sensorType: 'TEMPERATURE',
    locationDescription: '101동 지하 1층 기계실',
    thresholds: { unit: '°C', warningMin: 5, warningMax: 30, criticalMin: 0, criticalMax: 40 },
    baseValue: 22, noise: 3,
  },
  {
    name: '101동 지하 습도계 #1',
    deviceKey: 'bldg101-hum-b1-01',
    sensorType: 'HUMIDITY',
    locationDescription: '101동 지하 1층 기계실',
    thresholds: { unit: '%', warningMin: 30, warningMax: 70, criticalMin: 20, criticalMax: 85 },
    baseValue: 55, noise: 10,
  },
  {
    name: '102동 외벽 진동 센서 #1',
    deviceKey: 'bldg102-vib-roof-01',
    sensorType: 'VIBRATION',
    locationDescription: '102동 옥상 외벽',
    thresholds: { unit: 'mm/s', warningMax: 5, criticalMax: 10 },
    baseValue: 1.5, noise: 1,
  },
  {
    name: '103동 지하 누수 감지기 #1',
    deviceKey: 'bldg103-leak-b1-01',
    sensorType: 'LEAK',
    locationDescription: '103동 지하 1층 배수로',
    thresholds: { unit: '', criticalMax: 0.5 },
    baseValue: 0, noise: 0,
  },
  {
    name: '공용 전기실 전력계 #1',
    deviceKey: 'common-pwr-elec-01',
    sensorType: 'POWER',
    locationDescription: '공용 전기실',
    thresholds: { unit: 'kW', warningMax: 80, criticalMax: 100 },
    baseValue: 45, noise: 15,
  },
  {
    name: '지하주차장 CO₂ 센서 #1',
    deviceKey: 'parking-co2-b1-01',
    sensorType: 'CO2',
    locationDescription: '지하주차장 B1 중앙부',
    thresholds: { unit: 'ppm', warningMax: 1000, criticalMax: 2000 },
    baseValue: 600, noise: 200,
  },
  {
    name: '옥상 물탱크 수위 센서 #1',
    deviceKey: 'roof-wl-tank-01',
    sensorType: 'WATER_LEVEL',
    locationDescription: '옥상 물탱크',
    thresholds: { unit: '%', warningMax: 70, criticalMax: 90 },
    baseValue: 55, noise: 10,
  },
  {
    name: '배관 압력 센서 #1',
    deviceKey: 'pipe-prs-main-01',
    sensorType: 'PRESSURE',
    locationDescription: '101동 급수 주배관',
    thresholds: { unit: 'kPa', warningMin: 80, warningMax: 110, criticalMin: 60, criticalMax: 130 },
    baseValue: 95, noise: 8,
  },
];

// ── seed: 센서 등록 + 과거 데이터 삽입 ──────────────────────────────

async function seed() {
  console.log('🌱  센서 데이터 seed 시작...\n');

  // 1. 센서 등록
  for (const s of MOCK_SENSORS) {
    const dto = {
      complexId: COMPLEX_ID,
      name: s.name,
      deviceKey: s.deviceKey,
      sensorType: s.sensorType,
      locationDescription: s.locationDescription,
      thresholds: s.thresholds,
      manufacturer: 'Acme IoT',
      model: `${s.sensorType}-X100`,
      installDate: '2026-01-15',
    };

    const result = await request('POST', '/api/v1/sensors', dto);
    if (result?.data?._id || result?._id) {
      console.log(`  ✅  센서 등록: ${s.name} (${s.deviceKey})`);
    } else {
      const msg = result?.message ?? JSON.stringify(result).slice(0, 60);
      console.log(`  ⚠️   센서 등록 건너뜀: ${s.name} — ${msg}`);
    }
  }

  // 2. 과거 시계열 데이터 삽입 (지난 6시간, 5분 간격 = 72개/센서)
  console.log('\n📊  시계열 과거 데이터 삽입 중...');
  const INTERVAL_MIN = 5;
  const HOURS = 6;
  const N = (HOURS * 60) / INTERVAL_MIN;

  const batchReadings: any[] = [];

  for (const s of MOCK_SENSORS) {
    for (let i = N; i >= 0; i--) {
      let value: number;

      // 누수 센서: 대부분 0, 가끔 이상값
      if (s.sensorType === 'LEAK') {
        value = Math.random() < 0.03 ? rand(0.6, 1.0) : 0;
      } else {
        value = parseFloat(addNoise(s.baseValue, s.noise).toFixed(1));
        // 가끔 임계치 초과 시뮬레이션
        if (Math.random() < 0.05) {
          const th = s.thresholds as any;
          value = th.criticalMax ? rand(th.criticalMax * 1.05, th.criticalMax * 1.2) : value;
        }
      }

      batchReadings.push({
        deviceKey: s.deviceKey,
        value,
        recordedAt: isoOffset(i * INTERVAL_MIN),
        quality: 'GOOD',
      });
    }
  }

  // 500개씩 나눠서 batch ingest
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < batchReadings.length; i += CHUNK) {
    const chunk = batchReadings.slice(i, i + CHUNK);
    const result = await request('POST', '/api/v1/sensor-readings/batch', { readings: chunk });
    const s = result?.data?.success ?? result?.success ?? 0;
    total += s;
    process.stdout.write(`\r  📥  ${total}/${batchReadings.length}개 수집 완료`);
  }

  console.log(`\n\n✅  Seed 완료! 총 ${total}개 측정값 저장\n`);
  console.log('👉  대시보드: http://localhost:4200/iot\n');
}

// ── batch: 1회 대량 수집 ──────────────────────────────────────────────

async function batch() {
  console.log('📦  Batch ingestion (500개) 시작...\n');
  const readings = MOCK_SENSORS.flatMap((s) =>
    Array.from({ length: 60 }, (_, i) => ({
      deviceKey: s.deviceKey,
      value: parseFloat(addNoise(s.baseValue, s.noise).toFixed(1)),
      recordedAt: isoOffset(i),
      quality: 'GOOD',
    }))
  );

  const result = await request('POST', '/api/v1/sensor-readings/batch', { readings: readings.slice(0, 500) });
  console.log('결과:', JSON.stringify(result?.data ?? result, null, 2));
}

// ── stream: 실시간 연속 전송 ──────────────────────────────────────────

async function stream() {
  console.log('🔄  Stream ingestion 시작 (5초 간격, Ctrl+C로 종료)\n');
  let tick = 0;

  const send = async () => {
    tick++;
    const now = new Date().toISOString();
    for (const s of MOCK_SENSORS) {
      const value = s.sensorType === 'LEAK'
        ? (Math.random() < 0.02 ? 1 : 0)
        : parseFloat(addNoise(s.baseValue, s.noise).toFixed(1));

      await request('POST', '/api/v1/sensor-readings/ingest', {
        deviceKey: s.deviceKey,
        value,
        recordedAt: now,
        quality: 'GOOD',
      }).catch(() => {});
    }
    console.log(`  [tick ${tick}] ${now} — ${MOCK_SENSORS.length}개 센서 전송`);
  };

  await send();
  const interval = setInterval(send, 5000);
  process.on('SIGINT', () => { clearInterval(interval); console.log('\n✅  Stream 종료'); process.exit(0); });
}

// ── entry ─────────────────────────────────────────────────────────────

(async () => {
  if (MODE === 'batch')  await batch();
  else if (MODE === 'stream') await stream();
  else await seed();
})();
