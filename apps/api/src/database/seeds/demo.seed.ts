/**
 * apps/api/src/database/seeds/demo.seed.ts
 *
 * 데모 시연용 보조 seed — 기존 seed.ts 실행 이후 추가 시나리오 데이터 투입
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seeds/demo.seed.ts
 *
 * 전제:
 *   - docker compose -f docker-compose.dev.yml up -d 실행 중
 *   - yarn workspace @ax/api ts-node src/database/seed.ts 완료
 *
 * 추가되는 시나리오 데이터:
 *   - 데모 전용 균열 측정값 (임계치 초과 2건 → Alert 확인용)
 *   - 데모 전용 민원 (처리 완료 → complaintResolutionRate 90% 이상)
 *   - 데모 전용 보고서 레코드 (COMPLETED 상태)
 *   - KPI 레코드 (이번 달)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import * as nano from 'nano';

// ── 설정 ────────────────────────────────────────────────────────────────────
const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';

const ENV         = 'dev';
const PLATFORM_DB = `ax__platform_${ENV}`;
const ORG_ID      = 'org_seed001';
const ORG_DB      = `ax_${ORG_ID}_${ENV}`;

// ── 시드 ID 상수 (seed.ts와 동일) ──────────────────────────────────────────
const COMPLEX_ID  = `housingComplex:${ORG_ID}:cplx_seed01`;
const BLDG_101    = `building:${ORG_ID}:bldg_101`;
const FLR_101_1F  = `floor:${ORG_ID}:flr_101_1f`;
const USER_ADMIN  = `user:_platform:usr_admin01`;
const USER_CMGR   = `user:_platform:usr_cmgr01`;
const USER_INSP1  = `user:_platform:usr_insp01`;

// seed.ts에서 만든 게이지 포인트 ID
const GAUGE_001   = `crackGaugePoint:${ORG_ID}:gauge_001`;
const GAUGE_002   = `crackGaugePoint:${ORG_ID}:gauge_002`;

const now = new Date().toISOString();
const today = now.slice(0, 10);

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
async function upsert(db: nano.DocumentScope<any>, doc: any): Promise<void> {
  try {
    const existing = await db.get(doc._id).catch(() => null);
    if (existing) {
      await db.insert({ ...doc, _rev: existing._rev });
      console.log(`  ↺ updated  ${doc._id}`);
    } else {
      await db.insert(doc);
      console.log(`  ✓ inserted ${doc._id}`);
    }
  } catch (err: any) {
    console.warn(`  ⚠ skip ${doc._id}: ${err.message}`);
  }
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const couch = nano({ url: COUCHDB_URL, requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } } });
  const orgDb = couch.use(ORG_DB);
  const platDb = couch.use(PLATFORM_DB);

  console.log('\n═══════════════════════════════════════════');
  console.log('  AX 데모 시드 시작');
  console.log(`  ORG_DB : ${ORG_DB}`);
  console.log('═══════════════════════════════════════════\n');

  // ── 시나리오 7: 균열 측정값 (임계치 초과 → Alert) ────────────────────────
  console.log('[Scenario 7] 균열 측정값 추가...');

  const measurements = [
    // gauge_001: 임계치(2.0mm) 초과 측정
    {
      _id: `crackMeasurement:${ORG_ID}:demo_meas_01`,
      docType: 'crackMeasurement', orgId: ORG_ID,
      gaugePointId: GAUGE_001,
      complexId: COMPLEX_ID,
      measuredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
      measuredWidthMm: 2.4,        // 임계치 2.0mm 초과
      changeFromBaselineMm: 1.2,
      changeFromLastMm: 0.3,
      exceedsThreshold: true,
      isManualOverride: false,
      autoConfidence: 0.92,
      capturedImageKey: 'demo/crack_gauge001_demo01.jpg',
      createdAt: now, updatedAt: now, createdBy: USER_INSP1, updatedBy: USER_INSP1,
    },
    // gauge_002: 정상 범위 측정 (추이용)
    {
      _id: `crackMeasurement:${ORG_ID}:demo_meas_02`,
      docType: 'crackMeasurement', orgId: ORG_ID,
      gaugePointId: GAUGE_002,
      complexId: COMPLEX_ID,
      measuredAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1시간 전
      measuredWidthMm: 0.6,
      changeFromBaselineMm: 0.1,
      changeFromLastMm: 0.0,
      exceedsThreshold: false,
      isManualOverride: false,
      autoConfidence: 0.88,
      capturedImageKey: 'demo/crack_gauge002_demo01.jpg',
      createdAt: now, updatedAt: now, createdBy: USER_INSP1, updatedBy: USER_INSP1,
    },
  ];

  for (const m of measurements) await upsert(orgDb, m);

  // 균열 임계치 초과 Alert 자동 생성 (API 경유 없이 직접 삽입)
  const crackAlert = {
    _id: `alert:${ORG_ID}:demo_alert_crack_01`,
    docType: 'alert', orgId: ORG_ID,
    alertType: 'CRACK_THRESHOLD',
    severity: 'HIGH',
    status: 'ACTIVE',
    title: '[데모] 균열 게이지 001 임계치 초과',
    message: `균열 게이지 001 최신 측정값 2.4mm — 임계치(2.0mm) 초과`,
    complexId: COMPLEX_ID,
    sourceEntityId: GAUGE_001,
    sourceEntityType: 'crackGaugePoint',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updatedAt: now, createdBy: 'system', updatedBy: 'system',
  };
  await upsert(orgDb, crackAlert);

  // ── 시나리오 6: 민원 (complaintResolutionRate 높이기) ────────────────────
  console.log('\n[Scenario 6] 데모 민원 (완료 처리)...');

  const demoComplaints = [
    {
      _id: `complaint:${ORG_ID}:demo_cmp_01`,
      docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: BLDG_101,
      unitNumber: '201호',
      category: 'WATER_LEAK',
      title: '[데모] 화장실 누수',
      description: '화장실 천장에서 물이 새고 있습니다.',
      status: 'RESOLVED',
      priority: 'HIGH',
      submittedBy: '김민준',
      submittedPhone: '010-2345-6789',
      assignedTo: USER_CMGR,
      resolutionNotes: '상층부 배관 이음 불량 교체 완료. 누수 차단 확인.',
      satisfactionScore: 5,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now, updatedAt: now, createdBy: USER_CMGR, updatedBy: USER_CMGR,
    },
    {
      _id: `complaint:${ORG_ID}:demo_cmp_02`,
      docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: BLDG_101,
      unitNumber: '305호',
      category: 'ELEVATOR',
      title: '[데모] 엘리베이터 이상 소음',
      description: '엘리베이터 운행 시 삐걱거리는 소음 발생',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      submittedBy: '이수진',
      submittedPhone: '010-3456-7890',
      assignedTo: USER_CMGR,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now, updatedAt: now, createdBy: USER_CMGR, updatedBy: USER_CMGR,
    },
    {
      _id: `complaint:${ORG_ID}:demo_cmp_03`,
      docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: BLDG_101,
      unitNumber: '102호',
      category: 'NOISE',
      title: '[데모] 층간소음 민원',
      description: '평일 저녁 윗집 걸음 소리로 수면장애 발생',
      status: 'RECEIVED',
      priority: 'MEDIUM',
      submittedBy: '박서연',
      submittedPhone: '010-4567-8901',
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now, updatedAt: now, createdBy: USER_CMGR, updatedBy: USER_CMGR,
    },
  ];

  for (const c of demoComplaints) await upsert(orgDb, c);

  // ── 시나리오 8: 보고서 레코드 (COMPLETED — 다운로드 데모용) ─────────────
  console.log('\n[Scenario 8] 완료된 보고서 레코드...');

  const reportRecord = {
    _id: `report:${ORG_ID}:demo_report_01`,
    docType: 'report', orgId: ORG_ID,
    complexId: COMPLEX_ID,
    reportType: 'INSPECTION_RESULT',
    title: '[데모] 2026년 1분기 정기점검 결과 보고서',
    status: 'COMPLETED',
    generatedBy: USER_ADMIN,
    fileSize: 1_258_291,       // 약 1.2MB
    storageKey: `reports/${ORG_ID}/demo_report_01.pdf`,
    isPublic: false,
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  };
  await upsert(orgDb, reportRecord);

  // ── 시나리오 9: KPI 레코드 (이번 달) ────────────────────────────────────
  console.log('\n[Scenario 9] KPI 레코드...');

  const periodStart = `${today.slice(0, 7)}-01`;    // 이번 달 1일
  const kpiRecord = {
    _id: `kpiRecord:${ORG_ID}:${today.slice(0, 7)}`,
    docType: 'kpiRecord', orgId: ORG_ID,
    complexId: COMPLEX_ID,
    periodStart,
    periodEnd: today,
    metrics: {
      complaintAvgProcessingHours: 18.5,     // 목표 24h 달성
      inspectionCompletionRate: 0.92,         // 목표 95% 근접
      defectRepairRate: 0.87,                 // 목표 85% 달성
      crackAlertCount: 1,                     // 목표 ≤2 달성
      preventiveMaintenanceRatio: 0.34,       // 목표 30% 달성
      preventiveMaintenanceSavingsKRW: 9_800_000,
    },
    createdAt: now, updatedAt: now, createdBy: 'system', updatedBy: 'system',
  };
  await upsert(orgDb, kpiRecord);

  // ── 완료 요약 ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  ✅ 데모 시드 완료');
  console.log('');
  console.log('  데모 계정:');
  console.log('    ORG_ADMIN  : admin@happy-housing.kr / Admin@1234');
  console.log('    INSPECTOR  : hong@happy-housing.kr  / Inspector@1234');
  console.log('    CMGR       : park@happy-housing.kr  / Cmgr@1234');
  console.log('');
  console.log('  관리자 웹: http://localhost:4200');
  console.log('  API Swagger: http://localhost:3000/api/docs');
  console.log('  CouchDB UI: http://localhost:5984/_utils');
  console.log('═══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Demo seed 실패:', err);
  process.exit(1);
});
