/**
 * seed-full.ts — 종합 샘플 데이터 (전체 기능 커버)
 *
 * 대상 모듈:
 *   점검관리, 결함관리, 균열모니터링, 민원관리,
 *   작업지시, 일정관리, 경보, 보고서, KPI, 행정자동화RPA
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seed-full.ts
 *   또는
 *   docker compose exec api node dist/src/database/seed-full.js
 */
import * as path from 'path';
try {
  // 로컬 dev: .env 로드. prod 컨테이너엔 dotenv 미설치 + .env 부재 — silent skip.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch { /* noop */ }
import * as nano from 'nano';

// ── 설정 ────────────────────────────────────────────────────────────
const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';
const ENV              = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const ORG_ID           = 'org_seed001';
const ORG_DB           = `ax_${ORG_ID}_${ENV}`;

// ── ID 상수 ──────────────────────────────────────────────────────────
const COMPLEX_ID = `housingComplex:${ORG_ID}:cplx_seed01`;
const BLDG_101   = `building:${ORG_ID}:bldg_101`;
const BLDG_102   = `building:${ORG_ID}:bldg_102`;
const BLDG_103   = `building:${ORG_ID}:bldg_103`;
const FLR_101_B2 = `floor:${ORG_ID}:flr_101_b2`;
const FLR_101_B1 = `floor:${ORG_ID}:flr_101_b1`;
const FLR_101_1F = `floor:${ORG_ID}:flr_101_1f`;
const FLR_101_2F = `floor:${ORG_ID}:flr_101_2f`;
const FLR_101_3F = `floor:${ORG_ID}:flr_101_3f`;

const USER_ADMIN    = `user:_platform:usr_admin01`;
const USER_INSP1    = `user:_platform:usr_insp01`;
const USER_INSP2    = `user:_platform:usr_insp02`;
const USER_REVIEWER = `user:_platform:usr_rev01`;
const USER_CMGR     = `user:_platform:usr_cmgr01`;

// 기존 프로젝트
const PROJ_2025_R1  = `inspectionProject:${ORG_ID}:proj_2025_r1`;
const PROJ_2025_R2  = `inspectionProject:${ORG_ID}:proj_2025_r2`;
const PROJ_2026_EMG = `inspectionProject:${ORG_ID}:proj_2026_emg`;

// 신규 프로젝트
const PROJ_2025_Q3   = `inspectionProject:${ORG_ID}:proj_2025_q3`;
const PROJ_2025_Q4   = `inspectionProject:${ORG_ID}:proj_2025_q4`;
const PROJ_2025_FIRE = `inspectionProject:${ORG_ID}:proj_2025_fire`;
const PROJ_2026_R1   = `inspectionProject:${ORG_ID}:proj_2026_r1`;
const PROJ_2026_SPE  = `inspectionProject:${ORG_ID}:proj_2026_spe`;

// 신규 세션
const SESS_103_1F   = `inspectionSession:${ORG_ID}:sess_103_1f`;
const SESS_103_RF   = `inspectionSession:${ORG_ID}:sess_103_rf`;
const SESS_102_B1   = `inspectionSession:${ORG_ID}:sess_102_b1`;
const SESS_101_RF   = `inspectionSession:${ORG_ID}:sess_101_rf`;
const SESS_FIRE_101 = `inspectionSession:${ORG_ID}:sess_fire_101`;
const SESS_FIRE_102 = `inspectionSession:${ORG_ID}:sess_fire_102`;
const SESS_FIRE_103 = `inspectionSession:${ORG_ID}:sess_fire_103`;
const SESS_2026_R1  = `inspectionSession:${ORG_ID}:sess_2026_r1`;

const client = nano({
  url: COUCHDB_URL,
  requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } },
});

const now   = new Date().toISOString();
const dAgo  = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const dFwd  = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const dDate = (d: number) => new Date(Date.now() + d * 86400000).toISOString().split('T')[0];

async function upsert(db: any, doc: any) {
  try {
    const existing = await db.get(doc._id);
    await db.insert({ ...doc, _rev: existing._rev });
    console.log(`  ~ 갱신: ${doc._id.split(':').pop()}`);
  } catch (e: any) {
    if (e.statusCode === 404) {
      await db.insert(doc);
      console.log(`  + 추가: ${doc._id.split(':').pop()}`);
    } else throw e;
  }
}

async function run() {
  const org = client.use(ORG_DB);
  console.log(`\n🌱 종합 샘플 데이터 투입 시작 — DB: ${ORG_DB}\n`);

  // ══════════════════════════════════════════════════════════
  // 1. 점검 프로젝트 (추가)
  // ══════════════════════════════════════════════════════════
  console.log('[1] 점검 프로젝트 (추가)');

  await upsert(org, {
    _id: PROJ_2025_Q3, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2025년 3분기 시설물 점검',
    round: 3, inspectionType: 'REGULAR',
    plannedStartDate: '2025-07-01', plannedEndDate: '2025-07-31',
    actualStartDate: '2025-07-02', actualEndDate: '2025-07-29',
    status: 'COMPLETED',
    leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
    description: '3분기 정기 시설물 안전점검 — 전 동 공용부 포함',
    sessionIds: [SESS_103_1F, SESS_102_B1],
    createdAt: dAgo(180), updatedAt: dAgo(130), createdBy: USER_ADMIN, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: PROJ_2025_Q4, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2025년 4분기 동절기 사전점검',
    round: 4, inspectionType: 'REGULAR',
    plannedStartDate: '2025-11-01', plannedEndDate: '2025-11-30',
    actualStartDate: '2025-11-03', actualEndDate: '2025-11-27',
    status: 'COMPLETED',
    leadInspectorId: USER_INSP2, reviewerId: USER_REVIEWER,
    description: '동절기 대비 배관·난방·외벽 사전점검',
    sessionIds: [SESS_103_RF, SESS_101_RF],
    createdAt: dAgo(90), updatedAt: dAgo(60), createdBy: USER_ADMIN, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: PROJ_2025_FIRE, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2025년 소방설비 정기점검',
    round: 1, inspectionType: 'FIRE_SAFETY',
    plannedStartDate: '2025-10-01', plannedEndDate: '2025-10-15',
    actualStartDate: '2025-10-02', actualEndDate: '2025-10-13',
    status: 'COMPLETED',
    leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
    description: '소방청 기준 연 2회 소방설비 점검 (하반기)',
    sessionIds: [SESS_FIRE_101, SESS_FIRE_102, SESS_FIRE_103],
    createdAt: dAgo(100), updatedAt: dAgo(75), createdBy: USER_ADMIN, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: PROJ_2026_R1, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2026년 상반기 정기안전점검',
    round: 1, inspectionType: 'REGULAR',
    plannedStartDate: dDate(14), plannedEndDate: dDate(45),
    status: 'PLANNED',
    leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
    description: '2026년 1차 정기안전점검 계획',
    sessionIds: [SESS_2026_R1],
    createdAt: dAgo(10), updatedAt: dAgo(5), createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  await upsert(org, {
    _id: PROJ_2026_SPE, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '102동 구조안전 정밀진단',
    round: 1, inspectionType: 'SPECIAL',
    plannedStartDate: dDate(3), plannedEndDate: dDate(17),
    actualStartDate: dDate(3),
    status: 'IN_PROGRESS',
    leadInspectorId: USER_REVIEWER, reviewerId: USER_REVIEWER,
    description: '외벽 박락·균열 집중 발생에 따른 구조안전 정밀진단 (전문업체 용역)',
    sessionIds: [],
    createdAt: dAgo(7), updatedAt: dAgo(1), createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ══════════════════════════════════════════════════════════
  // 2. 점검 세션 (추가)
  // ══════════════════════════════════════════════════════════
  console.log('\n[2] 점검 세션 (추가)');

  await upsert(org, {
    _id: SESS_103_1F, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_Q3, complexId: COMPLEX_ID,
    buildingId: BLDG_103, floorId: null,
    inspectorId: USER_INSP1, status: 'APPROVED',
    startedAt: dAgo(160), completedAt: dAgo(159),
    defectCount: 3, weatherCondition: '흐림', temperature: 26,
    checklistItems: [
      { id: 'cs_t01', category: '구조', description: '기둥·보 균열 여부', result: 'FAIL', notes: '1층 기둥 하부 0.2mm 균열 2건', order: 1 },
      { id: 'cs_t02', category: '방수', description: '지하층 방수 상태', result: 'FAIL', notes: '침수 흔적 확인', order: 2 },
      { id: 'cs_t03', category: '마감', description: '계단실 손상', result: 'PASS', order: 3 },
      { id: 'cs_t04', category: '안전', description: '비상구 확보', result: 'PASS', order: 4 },
      { id: 'cs_t05', category: '설비', description: '소화전 정상 여부', result: 'PASS', order: 5 },
      { id: 'cs_t06', category: '전기', description: '전기 패널 상태', result: 'PASS', order: 6 },
    ],
    notes: '103동 1층 공용부 기둥 균열 — 보수 조치 필요. 지하 침수 흔적 방수공사 권고.',
    createdAt: dAgo(160), updatedAt: dAgo(155), createdBy: USER_INSP1, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_103_RF, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_Q4, complexId: COMPLEX_ID,
    buildingId: BLDG_103, floorId: null,
    inspectorId: USER_INSP2, status: 'APPROVED',
    startedAt: dAgo(80), completedAt: dAgo(79),
    defectCount: 2, weatherCondition: '맑음', temperature: 5,
    checklistItems: [
      { id: 'cs_r01', category: '방수', description: '옥상 방수층 상태', result: 'FAIL', notes: '옥상 방수층 균열 및 들뜸 3구간', order: 1 },
      { id: 'cs_r02', category: '배관', description: '옥상 배수구 막힘', result: 'FAIL', notes: '배수구 2곳 낙엽·이물질 막힘', order: 2 },
      { id: 'cs_r03', category: '구조', description: '옥상 난간 안전성', result: 'PASS', order: 3 },
      { id: 'cs_r04', category: '설비', description: '냉각탑 외관 이상', result: 'PASS', order: 4 },
    ],
    notes: '옥상 방수층 보수 및 배수구 청소 긴급 조치 필요.',
    createdAt: dAgo(80), updatedAt: dAgo(75), createdBy: USER_INSP2, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_102_B1, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_Q3, complexId: COMPLEX_ID,
    buildingId: BLDG_102, floorId: null,
    inspectorId: USER_INSP2, status: 'APPROVED',
    startedAt: dAgo(162), completedAt: dAgo(162),
    defectCount: 4, weatherCondition: '맑음', temperature: 28,
    checklistItems: [
      { id: 'cs_b01', category: '구조', description: '지하층 기둥 균열', result: 'FAIL', notes: '기둥 3개소 사선 균열', order: 1 },
      { id: 'cs_b02', category: '방수', description: '지하층 누수', result: 'FAIL', notes: '지하주차장 천장 누수 4곳', order: 2 },
      { id: 'cs_b03', category: '방수', description: '외벽 방수 상태', result: 'FAIL', notes: '외벽 균열을 통한 습기 유입 흔적', order: 3 },
      { id: 'cs_b04', category: '안전', description: '비상조명 작동', result: 'PASS', order: 4 },
      { id: 'cs_b05', category: '설비', description: '환기설비 상태', result: 'FAIL', notes: '환기팬 이상음 발생', order: 5 },
    ],
    notes: '102동 지하1층 전반적 누수·균열. 방수공사 및 구조 보수 필요.',
    createdAt: dAgo(162), updatedAt: dAgo(158), createdBy: USER_INSP2, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_101_RF, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_Q4, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: null,
    inspectorId: USER_INSP1, status: 'APPROVED',
    startedAt: dAgo(82), completedAt: dAgo(81),
    defectCount: 1, weatherCondition: '구름조금', temperature: 7,
    checklistItems: [
      { id: 'cs_rf01', category: '방수', description: '옥상 방수층', result: 'PASS', order: 1 },
      { id: 'cs_rf02', category: '배관', description: '급수·배수 동결 방지', result: 'PASS', order: 2 },
      { id: 'cs_rf03', category: '설비', description: '난방설비 상태', result: 'FAIL', notes: '보일러실 팽창탱크 소음 발생', order: 3 },
      { id: 'cs_rf04', category: '안전', description: '피뢰침 상태', result: 'PASS', order: 4 },
    ],
    notes: '101동 옥상 전반 이상 없음. 보일러실 팽창탱크 점검 필요.',
    createdAt: dAgo(82), updatedAt: dAgo(78), createdBy: USER_INSP1, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_FIRE_101, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_FIRE, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: null,
    inspectorId: USER_INSP1, status: 'APPROVED',
    startedAt: dAgo(98), completedAt: dAgo(97),
    defectCount: 2, weatherCondition: '맑음', temperature: 18,
    checklistItems: [
      { id: 'cf_101_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
      { id: 'cf_101_02', category: '소방', description: '소화기 수량·유효기간', result: 'FAIL', notes: '5개 유효기간 초과', order: 2 },
      { id: 'cf_101_03', category: '소방', description: '비상벨 작동 확인', result: 'PASS', order: 3 },
      { id: 'cf_101_04', category: '소방', description: '방화문 자동 폐쇄', result: 'FAIL', notes: '3층 방화문 자동 폐쇄 불량', order: 4 },
      { id: 'cf_101_05', category: '소방', description: '피난 유도등', result: 'PASS', order: 5 },
      { id: 'cf_101_06', category: '소방', description: '소화전 수압 정상', result: 'PASS', order: 6 },
    ],
    notes: '소화기 교체 및 3층 방화문 수리 조치 필요.',
    createdAt: dAgo(98), updatedAt: dAgo(92), createdBy: USER_INSP1, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_FIRE_102, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_FIRE, complexId: COMPLEX_ID,
    buildingId: BLDG_102, floorId: null,
    inspectorId: USER_INSP2, status: 'APPROVED',
    startedAt: dAgo(96), completedAt: dAgo(95),
    defectCount: 1, weatherCondition: '맑음', temperature: 17,
    checklistItems: [
      { id: 'cf_102_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
      { id: 'cf_102_02', category: '소방', description: '소화기 수량·유효기간', result: 'PASS', order: 2 },
      { id: 'cf_102_03', category: '소방', description: '비상벨 작동 확인', result: 'FAIL', notes: '지하1층 비상벨 불량', order: 3 },
      { id: 'cf_102_04', category: '소방', description: '방화문 자동 폐쇄', result: 'PASS', order: 4 },
      { id: 'cf_102_05', category: '소방', description: '피난 유도등', result: 'PASS', order: 5 },
    ],
    notes: '102동 지하1층 비상벨 교체 필요.',
    createdAt: dAgo(96), updatedAt: dAgo(90), createdBy: USER_INSP2, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_FIRE_103, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_FIRE, complexId: COMPLEX_ID,
    buildingId: BLDG_103, floorId: null,
    inspectorId: USER_INSP1, status: 'APPROVED',
    startedAt: dAgo(94), completedAt: dAgo(93),
    defectCount: 0, weatherCondition: '맑음', temperature: 16,
    checklistItems: [
      { id: 'cf_103_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
      { id: 'cf_103_02', category: '소방', description: '소화기 수량·유효기간', result: 'PASS', order: 2 },
      { id: 'cf_103_03', category: '소방', description: '비상벨 작동 확인', result: 'PASS', order: 3 },
      { id: 'cf_103_04', category: '소방', description: '방화문 자동 폐쇄', result: 'PASS', order: 4 },
      { id: 'cf_103_05', category: '소방', description: '피난 유도등', result: 'PASS', order: 5 },
    ],
    notes: '103동 소방설비 전반 이상 없음.',
    createdAt: dAgo(94), updatedAt: dAgo(89), createdBy: USER_INSP1, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: SESS_2026_R1, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2026_R1, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: null,
    inspectorId: USER_INSP1, status: 'DRAFT',
    defectCount: 0, checklistItems: [],
    createdAt: dAgo(5), updatedAt: dAgo(5), createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ══════════════════════════════════════════════════════════
  // 3. 결함 (추가 — 다양한 동·층·유형)
  // ══════════════════════════════════════════════════════════
  console.log('\n[3] 결함 (추가)');

  const newDefects = [
    // 103동 1층 기둥
    {
      _id: `defect:${ORG_ID}:def_f01`, sessionId: SESS_103_1F, projectId: PROJ_2025_Q3,
      buildingId: BLDG_103,
      defectType: 'CRACK', severity: 'MEDIUM',
      description: '103동 1층 기둥 하부 수직 균열 (0.2mm)',
      widthMm: 0.2, lengthMm: 180, depthMm: 3,
      locationDescription: '103동 1층 공용복도 기둥 A-2 북면',
      isRepaired: true, repairedAt: dAgo(140), repairedBy: USER_INSP1,
      repairNotes: '에폭시 주입 보수 완료',
    },
    // 103동 지하1층 침수
    {
      _id: `defect:${ORG_ID}:def_f02`, sessionId: SESS_103_1F, projectId: PROJ_2025_Q3,
      buildingId: BLDG_103,
      defectType: 'LEAK', severity: 'HIGH',
      description: '103동 지하1층 침수 흔적. 방수층 손상 추정.',
      areaSqm: 3.8,
      locationDescription: '103동 지하1층 서측 벽체 하부 전반',
      isRepaired: false,
    },
    // 103동 옥상 방수
    {
      _id: `defect:${ORG_ID}:def_f03`, sessionId: SESS_103_RF, projectId: PROJ_2025_Q4,
      buildingId: BLDG_103,
      defectType: 'SPALLING', severity: 'MEDIUM',
      description: '옥상 방수층 균열 및 들뜸. 누수 위험.',
      areaSqm: 5.2,
      locationDescription: '103동 옥상 중앙부 및 파라펫 주변',
      isRepaired: false,
    },
    // 103동 옥상 배수구
    {
      _id: `defect:${ORG_ID}:def_f04`, sessionId: SESS_103_RF, projectId: PROJ_2025_Q4,
      buildingId: BLDG_103,
      defectType: 'OTHER', severity: 'LOW',
      description: '옥상 드레인 배수구 이물질 막힘.',
      locationDescription: '103동 옥상 배수구 2개소',
      isRepaired: true, repairedAt: dAgo(70), repairedBy: USER_INSP2,
      repairNotes: '배수구 청소 및 망 교체 완료',
    },
    // 102동 지하1층 기둥
    {
      _id: `defect:${ORG_ID}:def_f05`, sessionId: SESS_102_B1, projectId: PROJ_2025_Q3,
      buildingId: BLDG_102,
      defectType: 'CRACK', severity: 'HIGH',
      description: '102동 지하1층 기둥 사선 균열 3개소',
      widthMm: 0.6, lengthMm: 320, depthMm: 8,
      locationDescription: '102동 지하1층 동측 기둥 B-3, B-4, B-5',
      isRepaired: false,
    },
    // 102동 지하1층 누수
    {
      _id: `defect:${ORG_ID}:def_f06`, sessionId: SESS_102_B1, projectId: PROJ_2025_Q3,
      buildingId: BLDG_102,
      defectType: 'LEAK', severity: 'HIGH',
      description: '102동 지하1층 주차장 천장 누수 4개소',
      areaSqm: 6.5,
      locationDescription: '102동 지하1층 북측 주차구역 천장',
      isRepaired: false,
    },
    // 102동 지하1층 백태
    {
      _id: `defect:${ORG_ID}:def_f07`, sessionId: SESS_102_B1, projectId: PROJ_2025_Q3,
      buildingId: BLDG_102,
      defectType: 'EFFLORESCENCE', severity: 'MEDIUM',
      description: '지하1층 벽체 전반 백태 — 염해 가능성',
      locationDescription: '102동 지하1층 외벽 하부 전반',
      isRepaired: false,
    },
    // 102동 지하1층 환기팬 부식
    {
      _id: `defect:${ORG_ID}:def_f08`, sessionId: SESS_102_B1, projectId: PROJ_2025_Q3,
      buildingId: BLDG_102,
      defectType: 'CORROSION', severity: 'MEDIUM',
      description: '지하주차장 환기팬 프레임 부식 — 이상음 발생',
      locationDescription: '102동 지하1층 환기설비 북측',
      isRepaired: false,
    },
    // 101동 옥상 보일러
    {
      _id: `defect:${ORG_ID}:def_f09`, sessionId: SESS_101_RF, projectId: PROJ_2025_Q4,
      buildingId: BLDG_101,
      defectType: 'OTHER', severity: 'MEDIUM',
      description: '보일러실 팽창탱크 소음 — 내부 부품 마모 추정',
      locationDescription: '101동 옥상 보일러실',
      isRepaired: false,
    },
    // 101동 소화기 유효기간
    {
      _id: `defect:${ORG_ID}:def_f10`, sessionId: SESS_FIRE_101, projectId: PROJ_2025_FIRE,
      buildingId: BLDG_101,
      defectType: 'OTHER', severity: 'HIGH',
      description: '소화기 유효기간 초과 5개',
      locationDescription: '101동 3층·5층·7층·9층·11층 계단실',
      isRepaired: true, repairedAt: dAgo(87), repairedBy: USER_INSP2,
      repairNotes: '소화기 5개 신품 교체 완료',
    },
    // 101동 방화문 불량
    {
      _id: `defect:${ORG_ID}:def_f11`, sessionId: SESS_FIRE_101, projectId: PROJ_2025_FIRE,
      buildingId: BLDG_101,
      defectType: 'DEFORMATION', severity: 'HIGH',
      description: '3층 방화문 자동 폐쇄 장치 불량',
      locationDescription: '101동 3층 방화문 (계단실 측)',
      isRepaired: true, repairedAt: dAgo(85), repairedBy: USER_INSP1,
      repairNotes: '방화문 클로저 교체 완료. 자동 폐쇄 정상 확인.',
    },
    // 102동 비상벨
    {
      _id: `defect:${ORG_ID}:def_f12`, sessionId: SESS_FIRE_102, projectId: PROJ_2025_FIRE,
      buildingId: BLDG_102,
      defectType: 'OTHER', severity: 'HIGH',
      description: '지하1층 비상벨 작동 불량',
      locationDescription: '102동 지하1층 비상벨 (북측)',
      isRepaired: true, repairedAt: dAgo(83), repairedBy: USER_INSP2,
      repairNotes: '비상벨 수신기 교체 및 선로 점검 완료',
    },
    // 신규 — 침하 (103동)
    {
      _id: `defect:${ORG_ID}:def_f13`, sessionId: SESS_103_1F, projectId: PROJ_2025_Q3,
      buildingId: BLDG_103,
      defectType: 'SETTLEMENT', severity: 'LOW',
      description: '103동 외부 보도블록 침하 및 들뜸',
      locationDescription: '103동 정면 보행로 진입구 앞 2m 구간',
      isRepaired: false,
    },
    // 신규 — 외벽 부식 (103동)
    {
      _id: `defect:${ORG_ID}:def_f14`, sessionId: SESS_103_1F, projectId: PROJ_2025_Q3,
      buildingId: BLDG_103,
      defectType: 'CORROSION', severity: 'MEDIUM',
      description: '103동 외벽 철제 창틀 부식 및 녹물 흔적',
      locationDescription: '103동 1~5층 남측 외벽 창틀',
      isRepaired: false,
    },
    // 신규 — 외벽 균열 (102동 긴급진단 연계)
    {
      _id: `defect:${ORG_ID}:def_f15`, sessionId: null, projectId: PROJ_2026_SPE,
      buildingId: BLDG_102,
      defectType: 'CRACK', severity: 'CRITICAL',
      description: '102동 북측 외벽 구조 균열 — 거동 중 (진행형)',
      widthMm: 2.1, lengthMm: 680, depthMm: 25,
      locationDescription: '102동 북측 외벽 8~12층 수직 균열',
      isRepaired: false,
    },
  ];

  for (const d of newDefects) {
    await upsert(org, {
      _id: d._id, docType: 'defect', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: d.buildingId,
      sessionId: d.sessionId, projectId: d.projectId,
      defectType: d.defectType, severity: d.severity,
      description: d.description,
      ...(d.widthMm  !== undefined && { widthMm:  d.widthMm }),
      ...(d.lengthMm !== undefined && { lengthMm: d.lengthMm }),
      ...(d.depthMm  !== undefined && { depthMm:  d.depthMm }),
      ...(d.areaSqm  !== undefined && { areaSqm:  d.areaSqm }),
      locationDescription: d.locationDescription,
      isRepaired: d.isRepaired ?? false,
      ...(d.repairedAt  && { repairedAt:  d.repairedAt }),
      ...(d.repairedBy  && { repairedBy:  d.repairedBy }),
      ...(d.repairNotes && { repairNotes: d.repairNotes }),
      mediaIds: [],
      createdAt: dAgo(160), updatedAt: dAgo(160), createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 4. 균열 게이지 + 측정 이력 (추가)
  // ══════════════════════════════════════════════════════════
  console.log('\n[4] 균열 게이지·측정 이력 (추가)');

  const newGauges = [
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_011`,
      name: 'GP-102-B1-N', description: '102동 지하1층 북측 벽체',
      buildingId: BLDG_102, baseline: 0.25, threshold: 0.9,
      location: '102동 지하1층 북측 외벽', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_012`,
      name: 'GP-103-1F-A2', description: '103동 1층 기둥 A-2',
      buildingId: BLDG_103, baseline: 0.15, threshold: 0.6,
      location: '103동 1층 공용복도 기둥 A-2', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_013`,
      name: 'GP-102-N8F', description: '102동 북측 외벽 8층 — 정밀진단 연계',
      buildingId: BLDG_102, baseline: 0.5, threshold: 1.5,
      location: '102동 북측 외벽 8~12층 구조균열', isActive: true,
    },
  ];

  for (const g of newGauges) {
    await upsert(org, {
      _id: g._id, docType: 'crackGaugePoint', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: g.buildingId,
      name: g.name, description: g.description,
      qrCode: `AX:${g._id}`,
      installDate: '2026-01-10',
      baselineWidthMm: g.baseline, thresholdMm: g.threshold,
      location: g.location, isActive: g.isActive,
      createdAt: dAgo(20), updatedAt: now,
      createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // 신규 측정 이력
  const newMeasurements = [
    // gauge_011 — 102동 지하1층 북측: 빠른 진전
    { gp: `crackGaugePoint:${ORG_ID}:gauge_011`, daysAgo: 18, width: 0.27, change: 0.02, exceeds: false, conf: 0.94 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_011`, daysAgo: 12, width: 0.48, change: 0.21, exceeds: false, conf: 0.91 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_011`, daysAgo:  6, width: 0.75, change: 0.27, exceeds: false, conf: 0.89 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_011`, daysAgo:  1, width: 0.94, change: 0.19, exceeds: true,  conf: 0.85 },
    // gauge_012 — 103동 1층 기둥: 수리 후 안정
    { gp: `crackGaugePoint:${ORG_ID}:gauge_012`, daysAgo: 160, width: 0.20, change: 0.05, exceeds: false, conf: 0.95 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_012`, daysAgo: 140, width: 0.18, change: -0.02, exceeds: false, conf: 0.96 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_012`, daysAgo:  30, width: 0.16, change: -0.02, exceeds: false, conf: 0.97 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_012`, daysAgo:   0, width: 0.15, change: -0.01, exceeds: false, conf: 0.97 },
    // gauge_013 — 102동 북측 8층: 급속 진전 (위험)
    { gp: `crackGaugePoint:${ORG_ID}:gauge_013`, daysAgo: 14, width: 0.55, change: 0.05, exceeds: false, conf: 0.90 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_013`, daysAgo:  7, width: 1.10, change: 0.55, exceeds: false, conf: 0.85 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_013`, daysAgo:  3, width: 1.68, change: 0.58, exceeds: true,  conf: 0.80 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_013`, daysAgo:  0, width: 2.10, change: 0.42, exceeds: true,  conf: 0.76 },
  ];

  for (let i = 0; i < newMeasurements.length; i++) {
    const m = newMeasurements[i];
    const id = `crackMeasurement:${ORG_ID}:meas_full_${String(i + 1).padStart(3, '0')}`;
    await upsert(org, {
      _id: id, docType: 'crackMeasurement', orgId: ORG_ID,
      complexId: COMPLEX_ID, gaugePointId: m.gp,
      measuredBy: USER_INSP1, measuredAt: dAgo(m.daysAgo),
      capturedImageKey: `mock/crack/${id}.jpg`,
      roiImageKey: `mock/crack/${id}_roi.jpg`,
      measuredWidthMm: m.width,
      changeFromBaselineMm: m.change,
      isManualOverride: false,
      autoConfidence: m.conf,
      graduationCount: Math.round(m.width * 10),
      scaleMmPerGraduation: 0.1,
      exceedsThreshold: m.exceeds,
      notes: m.exceeds ? '임계치 초과 — 모니터링 강화' : '',
      createdAt: dAgo(m.daysAgo), updatedAt: dAgo(m.daysAgo),
      createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 5. 민원 (추가 — 다양한 카테고리·상태·건물)
  // ══════════════════════════════════════════════════════════
  console.log('\n[5] 민원 (추가)');

  const fullComplaints = [
    {
      _id: `complaint:${ORG_ID}:comp_full_001`,
      category: 'SAFETY', priority: 'URGENT', status: 'IN_PROGRESS',
      buildingId: BLDG_102,
      title: '102동 북측 외벽 대형 균열 — 추락 위험',
      desc: '102동 북측 외벽 8~12층에 큰 균열이 생겼고 조각이 떨어질 것 같습니다. 즉각 안전 조치 바랍니다.',
      submittedBy: '입주민 곽○○', phone: '010-1010-2020', unit: '102동 1201호',
      submittedAt: dAgo(5), dueDate: dDate(0),
      assignedTo: USER_CMGR, assignedAt: dAgo(4),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_002`,
      category: 'FACILITY', priority: 'HIGH', status: 'RESOLVED',
      buildingId: BLDG_101,
      title: '101동 보일러 소음으로 수면 방해',
      desc: '새벽 2~5시 보일러 소음이 너무 심합니다.',
      submittedBy: '입주민 마○○', phone: '010-2020-3030', unit: '101동 1501호',
      submittedAt: dAgo(90), dueDate: dAgo(85),
      assignedTo: USER_CMGR, assignedAt: dAgo(89),
      resolvedAt: dAgo(82), resolutionNotes: '팽창탱크 내부 부품 교체. 소음 해소 확인.',
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_003`,
      category: 'ELEVATOR', priority: 'HIGH', status: 'CLOSED',
      buildingId: BLDG_103,
      title: '103동 엘리베이터 1호기 진동 및 이상음',
      desc: '103동 엘리베이터 1호기가 운행 중 심하게 진동하고 금속 마찰음이 납니다.',
      submittedBy: '입주민 나○○', phone: '010-3030-4040', unit: '103동 401호',
      submittedAt: dAgo(120), dueDate: dAgo(115),
      assignedTo: USER_CMGR, assignedAt: dAgo(119),
      resolvedAt: dAgo(112), closedAt: dAgo(108),
      resolutionNotes: '엘리베이터 가이드 레일 오일 주입 및 조정 완료. 정상 운행 확인.',
      satisfactionScore: 4,
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_004`,
      category: 'FACILITY', priority: 'MEDIUM', status: 'RECEIVED',
      buildingId: BLDG_103,
      title: '103동 옥상 방수 불량 — 10층 천장 누수',
      desc: '비가 올 때마다 10층 거실 천장에서 물이 새어 벽지가 다 상했습니다.',
      submittedBy: '입주민 표○○', phone: '010-4040-5050', unit: '103동 1001호',
      submittedAt: dAgo(2), dueDate: dDate(8),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_005`,
      category: 'NOISE', priority: 'LOW', status: 'RECEIVED',
      buildingId: BLDG_101,
      title: '주차장 차량 배기 소음 — 지하층 거주민 민원',
      desc: '야간 차량 시동 소리가 지하주차장을 통해 1층까지 크게 울립니다.',
      submittedBy: '입주민 채○○', phone: '010-5050-6060', unit: '101동 103호',
      submittedAt: dAgo(7), dueDate: dDate(14),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_006`,
      category: 'PARKING', priority: 'MEDIUM', status: 'ASSIGNED',
      buildingId: BLDG_102,
      title: '장애인 주차구역 경사로 파손',
      desc: '장애인 주차구역 진입 경사로 아스팔트가 파여 휠체어 진입이 어렵습니다.',
      submittedBy: '입주민 천○○', phone: '010-6060-7070', unit: '102동 201호',
      submittedAt: dAgo(10), dueDate: dDate(5),
      assignedTo: USER_CMGR, assignedAt: dAgo(9),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_007`,
      category: 'SANITATION', priority: 'HIGH', status: 'IN_PROGRESS',
      buildingId: BLDG_102,
      title: '102동 지하주차장 하수구 역류 — 악취·오물',
      desc: '비가 오면 지하주차장 하수구가 역류해 오물이 넘칩니다. 차량 오염 및 악취 극심.',
      submittedBy: '입주민 탁○○', phone: '010-7070-8080', unit: '102동 101호',
      submittedAt: dAgo(8), dueDate: dDate(1),
      assignedTo: USER_CMGR, assignedAt: dAgo(7),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_008`,
      category: 'FACILITY', priority: 'MEDIUM', status: 'TRIAGED',
      buildingId: BLDG_101,
      title: '101동 공용 복도 LED 조명 교체 요청',
      desc: '복도 형광등이 너무 어두워서 야간에 불편합니다. LED 교체 부탁드립니다.',
      submittedBy: '입주민 판○○', phone: '010-8080-9090', unit: '101동 801호',
      submittedAt: dAgo(14), dueDate: dDate(20),
      assignedTo: USER_CMGR, assignedAt: dAgo(13),
      aiSuggestion: '전기설비 교체 작업지시 권장. 에너지 절감 효과 기대.',
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_009`,
      category: 'SAFETY', priority: 'HIGH', status: 'ASSIGNED',
      buildingId: BLDG_103,
      title: '103동 지하층 바닥 침수·결빙 — 미끄럼 낙상 위험',
      desc: '겨울철 지하층 바닥이 얼어서 미끄럽습니다. 노인이 넘어질 위험이 있습니다.',
      submittedBy: '입주민 하○○', phone: '010-9090-0101', unit: '103동 102호',
      submittedAt: dAgo(3), dueDate: dDate(2),
      assignedTo: USER_CMGR, assignedAt: dAgo(2),
    },
    {
      _id: `complaint:${ORG_ID}:comp_full_010`,
      category: 'FACILITY', priority: 'MEDIUM', status: 'RESOLVED',
      buildingId: BLDG_101,
      title: '101동 우편함 자물쇠 파손',
      desc: '101동 현관 우편함 자물쇠가 파손되어 우편물 도난 우려가 있습니다.',
      submittedBy: '입주민 홍○○', phone: '010-0101-1212', unit: '101동 305호',
      submittedAt: dAgo(40), dueDate: dAgo(35),
      assignedTo: USER_CMGR, assignedAt: dAgo(39),
      resolvedAt: dAgo(36), resolutionNotes: '우편함 자물쇠 10개 일괄 교체 완료.',
    },
  ];

  for (const c of fullComplaints) {
    const timeline: any[] = [
      { timestamp: c.submittedAt, fromStatus: null, toStatus: 'RECEIVED', actorId: 'system' },
    ];
    if ((c as any).assignedTo) {
      timeline.push({ timestamp: (c as any).assignedAt, fromStatus: 'RECEIVED', toStatus: c.status === 'TRIAGED' ? 'TRIAGED' : 'ASSIGNED', actorId: USER_CMGR });
    }
    if (c.status === 'IN_PROGRESS') {
      timeline.push({ timestamp: dAgo(3), fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', actorId: USER_CMGR });
    }
    if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
      timeline.push({ timestamp: (c as any).resolvedAt, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', actorId: USER_CMGR, notes: (c as any).resolutionNotes });
    }
    if (c.status === 'CLOSED') {
      timeline.push({ timestamp: (c as any).closedAt, fromStatus: 'RESOLVED', toStatus: 'CLOSED', actorId: USER_ADMIN, notes: '입주민 확인 완료 → 종결' });
    }

    await upsert(org, {
      _id: c._id, docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: c.buildingId,
      category: c.category, status: c.status, priority: c.priority,
      title: c.title, description: c.desc,
      submittedBy: c.submittedBy, submittedPhone: c.phone,
      unitNumber: c.unit, submittedAt: c.submittedAt,
      ...((c as any).assignedTo   && { assignedTo: (c as any).assignedTo, assignedAt: (c as any).assignedAt }),
      ...((c as any).dueDate      && { dueDate: (c as any).dueDate }),
      ...((c as any).resolvedAt   && { resolvedAt: (c as any).resolvedAt, resolutionNotes: (c as any).resolutionNotes }),
      ...((c as any).closedAt     && { closedAt: (c as any).closedAt }),
      ...((c as any).satisfactionScore && { satisfactionScore: (c as any).satisfactionScore }),
      ...((c as any).aiSuggestion && { aiSuggestion: (c as any).aiSuggestion }),
      mediaIds: [], timeline,
      createdAt: c.submittedAt, updatedAt: now,
      createdBy: 'system', updatedBy: USER_CMGR,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 6. 작업지시 (Work Orders)
  // ══════════════════════════════════════════════════════════
  console.log('\n[6] 작업지시');

  const workOrders = [
    {
      _id: `workOrder:${ORG_ID}:wo_full_001`,
      complaintId: `complaint:${ORG_ID}:comp_full_001`,
      defectId: `defect:${ORG_ID}:def_f15`,
      title: '102동 북측 외벽 구조균열 긴급 보강 및 안전 통제',
      description: '크랙 범위 측정 후 에폭시 주입 + 위험 구역 안전 펜스 설치. 정밀진단 용역 연계.',
      buildingId: BLDG_102,
      assignedTo: USER_INSP1, scheduledDate: dDate(1),
      status: 'IN_PROGRESS', priority: 'URGENT',
      estimatedCost: 4500000, vendor: '(주)한국구조안전연구소',
      startedAt: dAgo(2),
      daysAgoCreated: 5,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_002`,
      complaintId: `complaint:${ORG_ID}:comp_full_007`,
      defectId: null,
      title: '102동 지하주차장 하수구 준설 및 역류 방지',
      description: '하수구 3개소 준설 및 역류 방지 밸브 설치.',
      buildingId: BLDG_102,
      assignedTo: USER_INSP2, scheduledDate: dDate(2),
      status: 'OPEN', priority: 'HIGH',
      estimatedCost: 1800000, vendor: '한국환경서비스(주)',
      daysAgoCreated: 6,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_003`,
      complaintId: `complaint:${ORG_ID}:comp_full_004`,
      defectId: `defect:${ORG_ID}:def_f03`,
      title: '103동 옥상 방수층 긴급 보수',
      description: '방수층 균열 부위 우레탄 방수재 도포. 배수구 청소 포함.',
      buildingId: BLDG_103,
      assignedTo: USER_INSP1, scheduledDate: dDate(5),
      status: 'OPEN', priority: 'HIGH',
      estimatedCost: 3200000, vendor: '(주)방수전문건설',
      daysAgoCreated: 1,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_004`,
      complaintId: `complaint:${ORG_ID}:comp_full_006`,
      defectId: null,
      title: '102동 장애인 주차구역 경사로 아스팔트 보수',
      description: '경사로 파손 구간 아스팔트 포장 복구.',
      buildingId: BLDG_102,
      assignedTo: USER_INSP2, scheduledDate: dDate(7),
      status: 'OPEN', priority: 'MEDIUM',
      estimatedCost: 850000,
      daysAgoCreated: 8,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_005`,
      complaintId: `complaint:${ORG_ID}:comp_full_002`,
      defectId: `defect:${ORG_ID}:def_f09`,
      title: '101동 옥상 보일러실 팽창탱크 점검·교체',
      description: '팽창탱크 내부 다이어프램 교체 및 계통 점검.',
      buildingId: BLDG_101,
      assignedTo: USER_INSP1, scheduledDate: dAgo(83),
      status: 'COMPLETED', priority: 'MEDIUM',
      estimatedCost: 1200000, actualCost: 980000,
      vendor: '(주)성진기계설비',
      startedAt: dAgo(84), completedAt: dAgo(82),
      actionNotes: '팽창탱크 다이어프램 교체 완료. 소음 해소 및 수압 정상 확인.',
      daysAgoCreated: 90,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_006`,
      complaintId: `complaint:${ORG_ID}:comp_full_003`,
      defectId: null,
      title: '103동 엘리베이터 1호기 가이드 레일 정비',
      description: '가이드 레일 오일 주입, 상태 점검, 진동 원인 제거.',
      buildingId: BLDG_103,
      assignedTo: USER_INSP2, scheduledDate: dAgo(114),
      status: 'COMPLETED', priority: 'HIGH',
      estimatedCost: 550000, actualCost: 480000,
      vendor: '현대엘리베이터(주)',
      startedAt: dAgo(115), completedAt: dAgo(112),
      actionNotes: '레일 4개소 오일 주입 완료. 이상음 및 진동 소멸 확인.',
      daysAgoCreated: 120,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_007`,
      complaintId: null,
      defectId: `defect:${ORG_ID}:def_f05`,
      title: '102동 지하1층 기둥 사선 균열 에폭시 주입',
      description: '균열 세척 → 에폭시 주입 → 표면 마감. B-3, B-4, B-5 기둥.',
      buildingId: BLDG_102,
      assignedTo: USER_INSP1, scheduledDate: dDate(10),
      status: 'OPEN', priority: 'HIGH',
      estimatedCost: 2100000, vendor: '(주)한국보수전문',
      daysAgoCreated: 5,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_008`,
      complaintId: `complaint:${ORG_ID}:comp_full_009`,
      defectId: `defect:${ORG_ID}:def_f02`,
      title: '103동 지하1층 방수 공사 및 배수 개선',
      description: '서측 벽체 방수층 재시공 + 바닥 경사 정비',
      buildingId: BLDG_103,
      assignedTo: USER_INSP2, scheduledDate: dDate(15),
      status: 'OPEN', priority: 'HIGH',
      estimatedCost: 5600000, vendor: '(주)방수전문건설',
      daysAgoCreated: 2,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_009`,
      complaintId: `complaint:${ORG_ID}:comp_full_008`,
      defectId: null,
      title: '101동 공용 복도 형광등 → LED 교체',
      description: '전 동 공용 복도 형광등 LED 교체 (총 80개 교체 예상)',
      buildingId: BLDG_101,
      assignedTo: USER_INSP1, scheduledDate: dDate(12),
      status: 'OPEN', priority: 'MEDIUM',
      estimatedCost: 2400000, vendor: '삼성물산 전기공사팀',
      daysAgoCreated: 12,
    },
    {
      _id: `workOrder:${ORG_ID}:wo_full_010`,
      complaintId: null,
      defectId: `defect:${ORG_ID}:def_f14`,
      title: '103동 외벽 창틀 부식 도장 및 코킹 보수',
      description: '남측 1~5층 창틀 부식 부위 녹 제거 → 방청 도장 → 코킹 재시공',
      buildingId: BLDG_103,
      assignedTo: USER_INSP2, scheduledDate: dDate(25),
      status: 'OPEN', priority: 'MEDIUM',
      estimatedCost: 3800000,
      daysAgoCreated: 3,
    },
  ];

  for (const wo of workOrders) {
    const woTimeline: any[] = [
      { timestamp: dAgo(wo.daysAgoCreated), fromStatus: null, toStatus: 'OPEN', actorId: USER_ADMIN, notes: '작업지시 생성' },
    ];
    if (wo.status === 'IN_PROGRESS' || wo.status === 'COMPLETED') {
      woTimeline.push({ timestamp: wo.startedAt ?? dAgo(wo.daysAgoCreated - 1), fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actorId: wo.assignedTo, notes: '현장 조치 시작' });
    }
    if (wo.status === 'COMPLETED') {
      woTimeline.push({ timestamp: wo.completedAt ?? dAgo(wo.daysAgoCreated - 3), fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', actorId: wo.assignedTo, notes: wo.actionNotes ?? '조치 완료' });
    }

    await upsert(org, {
      _id: wo._id, docType: 'workOrder', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: wo.buildingId,
      ...(wo.complaintId && { complaintId: wo.complaintId }),
      ...(wo.defectId    && { defectId:    wo.defectId }),
      title: wo.title, description: wo.description,
      assignedTo: wo.assignedTo, scheduledDate: wo.scheduledDate,
      status: wo.status, priority: wo.priority,
      estimatedCost: wo.estimatedCost,
      ...(wo.actualCost  && { actualCost:  wo.actualCost }),
      ...(wo.vendor      && { vendor:      wo.vendor }),
      ...(wo.startedAt   && { startedAt:   wo.startedAt }),
      ...(wo.completedAt && { completedAt: wo.completedAt }),
      ...(wo.actionNotes && { actionNotes: wo.actionNotes }),
      mediaIds: [], timeline: woTimeline,
      createdAt: dAgo(wo.daysAgoCreated), updatedAt: now,
      createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 7. 일정관리 (Schedules)
  // ══════════════════════════════════════════════════════════
  console.log('\n[7] 일정관리');

  const schedules = [
    {
      _id: `schedule:${ORG_ID}:sched_full_001`,
      scheduleType: 'REGULAR_INSPECTION', recurrence: 'QUARTERLY',
      title: '분기별 공용부 일제 점검 (101동)',
      nextOccurrence: dFwd(15), lastOccurrence: dAgo(77),
      isActive: true, overdueAlertDays: 5,
      linkedProjectId: PROJ_2026_R1,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_002`,
      scheduleType: 'REGULAR_INSPECTION', recurrence: 'QUARTERLY',
      title: '분기별 공용부 일제 점검 (102동)',
      nextOccurrence: dFwd(15), lastOccurrence: dAgo(77),
      isActive: true, overdueAlertDays: 5,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_003`,
      scheduleType: 'REGULAR_INSPECTION', recurrence: 'QUARTERLY',
      title: '분기별 공용부 일제 점검 (103동)',
      nextOccurrence: dFwd(15), lastOccurrence: dAgo(77),
      isActive: true, overdueAlertDays: 5,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_004`,
      scheduleType: 'MAINTENANCE', recurrence: 'MONTHLY',
      title: '월간 엘리베이터 정기 점검 (3개 동)',
      nextOccurrence: dFwd(8), lastOccurrence: dAgo(23),
      isActive: true, overdueAlertDays: 3,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_005`,
      scheduleType: 'FIRE_SAFETY', recurrence: 'ANNUALLY',
      title: '소방설비 정기점검 (상반기)',
      nextOccurrence: dFwd(90), lastOccurrence: dAgo(98),
      isActive: true, overdueAlertDays: 14,
      linkedProjectId: PROJ_2025_FIRE,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_006`,
      scheduleType: 'MAINTENANCE', recurrence: 'WEEKLY',
      title: '주간 균열 게이지 순회 점검',
      nextOccurrence: dFwd(4), lastOccurrence: dAgo(3),
      isActive: true, overdueAlertDays: 2,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_007`,
      scheduleType: 'CONTRACT_RENEWAL', recurrence: 'ANNUALLY',
      title: '엘리베이터 유지보수 계약 갱신',
      nextOccurrence: dFwd(45), lastOccurrence: dAgo(320),
      isActive: true, overdueAlertDays: 30,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_008`,
      scheduleType: 'MAINTENANCE', recurrence: 'QUARTERLY',
      title: '급수·배수 배관 정기 점검',
      nextOccurrence: dFwd(20), lastOccurrence: dAgo(72),
      isActive: true, overdueAlertDays: 7,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_009`,
      scheduleType: 'REGULAR_INSPECTION', recurrence: 'ANNUALLY',
      title: '전기 설비 정기 검사 (한국전기안전공사)',
      nextOccurrence: dFwd(60), lastOccurrence: dAgo(305),
      isActive: true, overdueAlertDays: 14,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_010`,
      scheduleType: 'MAINTENANCE', recurrence: 'ONCE',
      title: '102동 구조안전 정밀진단 착수',
      nextOccurrence: dFwd(3), lastOccurrence: null,
      isActive: true, overdueAlertDays: 1,
      linkedProjectId: PROJ_2026_SPE,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_011`,
      scheduleType: 'REGULAR_INSPECTION', recurrence: 'ANNUALLY',
      title: '단지 내 CCTV 카메라 정기 점검',
      nextOccurrence: dDate(35), lastOccurrence: dAgo(330),
      isActive: true, overdueAlertDays: 7,
    },
    {
      _id: `schedule:${ORG_ID}:sched_full_012`,
      scheduleType: 'CONTRACT_RENEWAL', recurrence: 'ANNUALLY',
      title: '청소용역 계약 갱신',
      nextOccurrence: dFwd(-8), lastOccurrence: dAgo(373), // 기한초과
      isActive: true, overdueAlertDays: 14,
    },
  ];

  for (const s of schedules) {
    await upsert(org, {
      _id: s._id, docType: 'schedule', orgId: ORG_ID,
      complexId: COMPLEX_ID, title: s.title,
      scheduleType: s.scheduleType, recurrence: s.recurrence,
      nextOccurrence: s.nextOccurrence,
      ...(s.lastOccurrence && { lastOccurrence: s.lastOccurrence }),
      assignedTo: [USER_INSP1, USER_ADMIN], isActive: s.isActive,
      overdueAlertDays: s.overdueAlertDays,
      ...(s.linkedProjectId && { linkedProjectId: s.linkedProjectId }),
      createdAt: dAgo(30), updatedAt: now,
      createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 8. 경보 (Alerts)
  // ══════════════════════════════════════════════════════════
  console.log('\n[8] 경보');

  const alerts = [
    {
      _id: `alert:${ORG_ID}:alert_full_001`,
      alertType: 'CRACK_THRESHOLD', severity: 'CRITICAL', status: 'ACTIVE',
      title: '[긴급] GP-102-N8F 구조균열 2.10mm — 즉각 대피 검토',
      message: '102동 북측 외벽 8~12층 균열 2.10mm(임계치 1.5mm 초과). 7일간 0.55mm 급진전. 전문가 긴급 출동 필요.',
      sourceEntityType: 'crackGaugePoint',
      sourceEntityId: `crackGaugePoint:${ORG_ID}:gauge_013`,
      severity2: 'CRITICAL',
      createdAt: dAgo(1),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_002`,
      alertType: 'DEFECT_CRITICAL', severity: 'CRITICAL', status: 'ACTIVE',
      title: '[긴급] 102동 북측 외벽 구조균열 — 낙하 위험',
      message: '102동 북측 외벽 8~12층 구조균열 2.1mm(진행형). 보행자 안전 통제 즉시 시행.',
      sourceEntityType: 'defect',
      sourceEntityId: `defect:${ORG_ID}:def_f15`,
      createdAt: dAgo(1),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_003`,
      alertType: 'CRACK_THRESHOLD', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] GP-102-B1-N 균열 0.94mm 임계치 초과',
      message: '102동 지하1층 북측 벽체 균열이 임계치(0.9mm)를 초과했습니다. 방수공사 시급.',
      sourceEntityType: 'crackGaugePoint',
      sourceEntityId: `crackGaugePoint:${ORG_ID}:gauge_011`,
      createdAt: dAgo(1),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_004`,
      alertType: 'COMPLAINT_OVERDUE', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] 기한초과 민원 3건 — 즉시 처리 요망',
      message: '처리 기한을 초과한 민원이 3건 있습니다 (comp_full_001 포함). 담당자 즉시 확인 바랍니다.',
      sourceEntityType: 'complaint',
      sourceEntityId: `complaint:${ORG_ID}:comp_full_001`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_005`,
      alertType: 'INSPECTION_OVERDUE', severity: 'MEDIUM', status: 'ACTIVE',
      title: '[보통] 청소용역 계약 갱신 기한 8일 초과',
      message: '청소용역 계약 갱신 일정(sched_full_012)이 8일 초과됐습니다. 계약 담당자 확인 필요.',
      sourceEntityType: 'schedule',
      sourceEntityId: `schedule:${ORG_ID}:sched_full_012`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_006`,
      alertType: 'RPA_FAILURE', severity: 'MEDIUM', status: 'ACKNOWLEDGED',
      title: '[보통] RPA 관리비 고지서 생성 일부 실패',
      message: '3월분 관리비 고지서 자동 생성 시 5건 처리 오류 발생. 수동 확인 필요.',
      sourceEntityType: 'rpaTask',
      sourceEntityId: `rpaTask:${ORG_ID}:rpa_full_002`,
      acknowledgedBy: USER_ADMIN, acknowledgedAt: dAgo(5),
      createdAt: dAgo(6),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_007`,
      alertType: 'INSPECTION_OVERDUE', severity: 'MEDIUM', status: 'RESOLVED',
      title: '[완료] 2026년 상반기 점검 계획 수립 촉구',
      message: '2026년 상반기 정기안전점검 계획이 기한 내 수립됐습니다.',
      sourceEntityType: 'inspectionProject',
      sourceEntityId: PROJ_2026_R1,
      resolvedAt: dAgo(5), resolvedBy: USER_ADMIN,
      createdAt: dAgo(12),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_008`,
      alertType: 'CONTRACT_EXPIRY', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] 소방설비 점검 계약 만료 45일 전',
      message: '소방설비 유지보수 계약이 45일 후 만료됩니다. 조기 갱신 또는 재입찰 절차 시작 권고.',
      sourceEntityType: 'schedule',
      sourceEntityId: `schedule:${ORG_ID}:sched_full_005`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_009`,
      alertType: 'DRONE_DEFECT', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] 드론 AI — 103동 외벽 박락 의심 탐지',
      message: '드론 비전 AI가 103동 남측 외벽 3층에서 콘크리트 박락 의심 구간을 탐지했습니다. 현장 확인 필요.',
      sourceEntityType: 'droneMission',
      sourceEntityId: `droneMission:${ORG_ID}:drone_001`,
      createdAt: dAgo(2),
    },
    {
      _id: `alert:${ORG_ID}:alert_full_010`,
      alertType: 'DEFECT_CRITICAL', severity: 'HIGH', status: 'ACKNOWLEDGED',
      title: '[높음] 102동 지하1층 천장 누수 — 차량 피해 지속',
      message: '102동 지하1층 천장 누수 4개소 작업지시 미착수 상태. 차량 피해 민원 반복 접수 중.',
      sourceEntityType: 'defect',
      sourceEntityId: `defect:${ORG_ID}:def_f06`,
      acknowledgedBy: USER_CMGR, acknowledgedAt: dAgo(3),
      createdAt: dAgo(5),
    },
  ];

  for (const a of alerts) {
    await upsert(org, {
      _id: a._id, docType: 'alert', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      alertType: a.alertType, severity: a.severity, status: a.status,
      title: a.title, message: a.message,
      sourceEntityType: a.sourceEntityType,
      sourceEntityId: a.sourceEntityId,
      isRead: a.status !== 'ACTIVE',
      assignedTo: [USER_ADMIN, USER_REVIEWER],
      ...((a as any).acknowledgedBy && { acknowledgedBy: (a as any).acknowledgedBy, acknowledgedAt: (a as any).acknowledgedAt }),
      ...((a as any).resolvedAt     && { resolvedAt: (a as any).resolvedAt, resolvedBy: (a as any).resolvedBy }),
      createdAt: a.createdAt, updatedAt: now,
      createdBy: 'system', updatedBy: 'system',
    });
  }

  // ══════════════════════════════════════════════════════════
  // 9. 보고서 (Reports)
  // ══════════════════════════════════════════════════════════
  console.log('\n[9] 보고서');

  const reports = [
    {
      _id: `report:${ORG_ID}:rpt_full_001`,
      reportType: 'INSPECTION_RESULT',
      title: '2025년 1차 정기안전점검 결과 보고서',
      projectId: PROJ_2025_R1, sessionId: null,
      generatedBy: USER_REVIEWER, generatedAt: dAgo(55),
      fileKey: 'reports/rpt_full_001.pdf', fileSize: 2048576,
      isPublic: true,
      parameters: { includePhotos: true, locale: 'ko', pageSize: 'A4', notes: '외부 제출용' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_002`,
      reportType: 'DEFECT_LIST',
      title: '2025년 결함 현황 목록 (전 동)',
      projectId: null, sessionId: null,
      generatedBy: USER_ADMIN, generatedAt: dAgo(40),
      fileKey: 'reports/rpt_full_002.pdf', fileSize: 1024000,
      isPublic: false,
      parameters: { locale: 'ko', pageSize: 'A4' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_003`,
      reportType: 'PHOTO_SHEET',
      title: '102동 긴급점검 사진 대지',
      projectId: PROJ_2026_EMG, sessionId: `inspectionSession:${ORG_ID}:sess_2026_emg`,
      generatedBy: USER_INSP1, generatedAt: dAgo(30),
      fileKey: 'reports/rpt_full_003.pdf', fileSize: 5242880,
      isPublic: false,
      parameters: { includePhotos: true, photosPerPage: 4, locale: 'ko', pageSize: 'A4' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_004`,
      reportType: 'CRACK_TREND',
      title: '균열 추이 분석 보고서 (2025.Q3~Q4)',
      projectId: null, sessionId: null,
      generatedBy: USER_REVIEWER, generatedAt: dAgo(20),
      fileKey: 'reports/rpt_full_004.pdf', fileSize: 1536000,
      isPublic: false,
      parameters: { includeCrackTrend: true, locale: 'ko', dateFrom: '2025-07-01', dateTo: '2025-12-31' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_005`,
      reportType: 'SUMMARY',
      title: '2025년 운영 요약 보고서 (연간)',
      projectId: null, sessionId: null,
      generatedBy: USER_ADMIN, generatedAt: dAgo(15),
      fileKey: 'reports/rpt_full_005.pdf', fileSize: 3072000,
      isPublic: true,
      parameters: { locale: 'ko', pageSize: 'A4', dateFrom: '2025-01-01', dateTo: '2025-12-31' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_006`,
      reportType: 'COMPLAINT_ANALYSIS',
      title: '2025년 민원 분석 보고서 (4분기)',
      projectId: null, sessionId: null,
      generatedBy: USER_CMGR, generatedAt: dAgo(10),
      fileKey: 'reports/rpt_full_006.pdf', fileSize: 768000,
      isPublic: false,
      parameters: { locale: 'ko', dateFrom: '2025-10-01', dateTo: '2025-12-31' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_007`,
      reportType: 'MAINTENANCE_PLAN',
      title: '2026년 장기수선계획 (안)',
      projectId: null, sessionId: null,
      generatedBy: USER_REVIEWER, generatedAt: dAgo(7),
      fileKey: 'reports/rpt_full_007.pdf', fileSize: 4096000,
      isPublic: true,
      parameters: { locale: 'ko', pageSize: 'A4', notes: '관할 지자체 제출용' },
    },
    {
      _id: `report:${ORG_ID}:rpt_full_008`,
      reportType: 'XAI_ASSESSMENT',
      title: 'XAI 책임 평가 보고서 (KICT 기준)',
      projectId: null, sessionId: null,
      generatedBy: USER_REVIEWER, generatedAt: dAgo(3),
      fileKey: 'reports/rpt_full_008.pdf', fileSize: 2560000,
      isPublic: false,
      parameters: { locale: 'ko', notes: 'AX-SPRINT R&D 과제 제출용 (KICT 평가 기준)' },
    },
  ];

  for (const r of reports) {
    await upsert(org, {
      _id: r._id, docType: 'report', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      ...(r.projectId && { projectId: r.projectId }),
      ...(r.sessionId && { sessionId: r.sessionId }),
      reportType: r.reportType, title: r.title,
      generatedBy: r.generatedBy, generatedAt: r.generatedAt,
      fileKey: r.fileKey, fileSize: r.fileSize,
      isPublic: r.isPublic, parameters: r.parameters,
      createdAt: r.generatedAt, updatedAt: r.generatedAt,
      createdBy: r.generatedBy, updatedBy: r.generatedBy,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 10. KPI 레코드 (월별 시계열 — 추이 차트용)
  // ══════════════════════════════════════════════════════════
  console.log('\n[10] KPI 레코드');

  const kpiMonthly = [
    // 2025년 7월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_07`,
      periodStart: '2025-07-01', periodEnd: '2025-07-31',
      totalComplaints: 22, resolvedComplaints: 19,
      avgResolutionHours: 19.8, complaintResolutionRate: 0.864,
      totalInspections: 2, completedInspections: 2, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 6.5,
      totalDefects: 14, criticalDefects: 2, repairedDefects: 8,
      defectRepairRate: 0.571,
      preventiveMaintenanceCost: 1800000, correctiveMaintenanceCost: 2200000,
      avgSatisfactionScore: 4.2,
    },
    // 2025년 8월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_08`,
      periodStart: '2025-08-01', periodEnd: '2025-08-31',
      totalComplaints: 28, resolvedComplaints: 24,
      avgResolutionHours: 22.1, complaintResolutionRate: 0.857,
      totalInspections: 1, completedInspections: 0, overdueInspections: 1,
      inspectionCompletionRate: 0.0, avgInspectionHours: 0,
      totalDefects: 8, criticalDefects: 1, repairedDefects: 5,
      defectRepairRate: 0.625,
      preventiveMaintenanceCost: 1200000, correctiveMaintenanceCost: 3100000,
      avgSatisfactionScore: 3.9,
    },
    // 2025년 9월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_09`,
      periodStart: '2025-09-01', periodEnd: '2025-09-30',
      totalComplaints: 17, resolvedComplaints: 16,
      avgResolutionHours: 16.4, complaintResolutionRate: 0.941,
      totalInspections: 1, completedInspections: 1, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 5.2,
      totalDefects: 7, criticalDefects: 0, repairedDefects: 6,
      defectRepairRate: 0.857,
      preventiveMaintenanceCost: 2400000, correctiveMaintenanceCost: 900000,
      avgSatisfactionScore: 4.5,
    },
    // 2025년 10월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_10`,
      periodStart: '2025-10-01', periodEnd: '2025-10-31',
      totalComplaints: 20, resolvedComplaints: 18,
      avgResolutionHours: 17.6, complaintResolutionRate: 0.900,
      totalInspections: 3, completedInspections: 3, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 4.1,
      totalDefects: 10, criticalDefects: 1, repairedDefects: 8,
      defectRepairRate: 0.800,
      preventiveMaintenanceCost: 3100000, correctiveMaintenanceCost: 1400000,
      avgSatisfactionScore: 4.3,
    },
    // 2025년 11월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_11`,
      periodStart: '2025-11-01', periodEnd: '2025-11-30',
      totalComplaints: 16, resolvedComplaints: 15,
      avgResolutionHours: 14.2, complaintResolutionRate: 0.938,
      totalInspections: 2, completedInspections: 2, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 5.8,
      totalDefects: 9, criticalDefects: 0, repairedDefects: 8,
      defectRepairRate: 0.889,
      preventiveMaintenanceCost: 2800000, correctiveMaintenanceCost: 750000,
      avgSatisfactionScore: 4.6,
    },
    // 2025년 12월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2025_12`,
      periodStart: '2025-12-01', periodEnd: '2025-12-31',
      totalComplaints: 13, resolvedComplaints: 11,
      avgResolutionHours: 18.9, complaintResolutionRate: 0.846,
      totalInspections: 1, completedInspections: 1, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 4.5,
      totalDefects: 6, criticalDefects: 0, repairedDefects: 5,
      defectRepairRate: 0.833,
      preventiveMaintenanceCost: 1500000, correctiveMaintenanceCost: 600000,
      avgSatisfactionScore: 4.4,
    },
    // 2026년 1월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2026_01`,
      periodStart: '2026-01-01', periodEnd: '2026-01-31',
      totalComplaints: 18, resolvedComplaints: 14,
      avgResolutionHours: 24.7, complaintResolutionRate: 0.778,
      totalInspections: 1, completedInspections: 0, overdueInspections: 0,
      inspectionCompletionRate: 0.0, avgInspectionHours: 0,
      totalDefects: 12, criticalDefects: 2, repairedDefects: 7,
      defectRepairRate: 0.583,
      preventiveMaintenanceCost: 1200000, correctiveMaintenanceCost: 2800000,
      avgSatisfactionScore: 3.7,
    },
    // 2026년 2월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2026_02`,
      periodStart: '2026-02-01', periodEnd: '2026-02-28',
      totalComplaints: 21, resolvedComplaints: 17,
      avgResolutionHours: 21.3, complaintResolutionRate: 0.810,
      totalInspections: 1, completedInspections: 1, overdueInspections: 0,
      inspectionCompletionRate: 1.0, avgInspectionHours: 6.0,
      totalDefects: 15, criticalDefects: 3, repairedDefects: 9,
      defectRepairRate: 0.600,
      preventiveMaintenanceCost: 1600000, correctiveMaintenanceCost: 3400000,
      avgSatisfactionScore: 3.9,
    },
    // 2026년 3월
    {
      _id: `kpiRecord:${ORG_ID}:kpi_2026_03`,
      periodStart: '2026-03-01', periodEnd: '2026-03-31',
      totalComplaints: 25, resolvedComplaints: 20,
      avgResolutionHours: 20.1, complaintResolutionRate: 0.800,
      totalInspections: 2, completedInspections: 1, overdueInspections: 0,
      inspectionCompletionRate: 0.5, avgInspectionHours: 5.0,
      totalDefects: 18, criticalDefects: 4, repairedDefects: 10,
      defectRepairRate: 0.556,
      preventiveMaintenanceCost: 2000000, correctiveMaintenanceCost: 4200000,
      avgSatisfactionScore: 3.8,
    },
  ];

  for (const k of kpiMonthly) {
    await upsert(org, {
      _id: k._id, docType: 'kpiRecord', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      periodStart: k.periodStart, periodEnd: k.periodEnd,
      totalComplaints: k.totalComplaints,
      resolvedComplaints: k.resolvedComplaints,
      avgResolutionHours: k.avgResolutionHours,
      complaintResolutionRate: k.complaintResolutionRate,
      totalInspections: k.totalInspections,
      completedInspections: k.completedInspections,
      overdueInspections: k.overdueInspections,
      inspectionCompletionRate: k.inspectionCompletionRate,
      avgInspectionHours: k.avgInspectionHours,
      totalDefects: k.totalDefects,
      criticalDefects: k.criticalDefects,
      repairedDefects: k.repairedDefects,
      defectRepairRate: k.defectRepairRate,
      preventiveMaintenanceCost: k.preventiveMaintenanceCost,
      correctiveMaintenanceCost: k.correctiveMaintenanceCost,
      avgSatisfactionScore: k.avgSatisfactionScore,
      createdAt: k.periodEnd + 'T00:00:00.000Z', updatedAt: now,
      createdBy: 'system', updatedBy: 'system',
    });
  }

  // ══════════════════════════════════════════════════════════
  // 11. 행정자동화 RPA 작업 이력
  // ══════════════════════════════════════════════════════════
  console.log('\n[11] RPA 작업 이력');

  const rpaTasks = [
    // 관리비 고지서 생성 (매월 1일 08:00)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_001`,
      taskType: 'BILL_GENERATION', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 8 1 * *',
      executedAt: '2026-04-01T08:00:12.000Z',
      processedCount: 500, automatedCount: 495, manualCount: 0, errorCount: 5,
      automationRate: 0.990, durationMs: 18420,
      summary: '4월 관리비 고지서 495세대 생성 완료. 5건 주소 오류로 수동 확인 필요.',
      payload: { month: '2026-04', complexId: COMPLEX_ID },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_002`,
      taskType: 'BILL_GENERATION', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 8 1 * *',
      executedAt: '2026-03-01T08:00:08.000Z',
      processedCount: 500, automatedCount: 495, manualCount: 5, errorCount: 5,
      automationRate: 0.990, durationMs: 19100,
      summary: '3월 관리비 고지서 495세대 생성. 5건 처리 오류 발생.',
      payload: { month: '2026-03', complexId: COMPLEX_ID },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_003`,
      taskType: 'BILL_GENERATION', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 8 1 * *',
      executedAt: '2026-02-01T08:00:05.000Z',
      processedCount: 500, automatedCount: 500, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 15800,
      summary: '2월 관리비 고지서 500세대 전량 자동 생성 완료.',
      payload: { month: '2026-02', complexId: COMPLEX_ID },
    },
    // 계약 만료 알림 (매일 09:00)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_004`,
      taskType: 'CONTRACT_EXPIRY_NOTICE', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 9 * * *',
      executedAt: dAgo(0).replace('T', ' ').slice(0, 19) + '.000Z',
      processedCount: 15, automatedCount: 15, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 3240,
      summary: '계약 만료 임박 15건 알림 발송 완료 (90일 이내). 소방설비·청소용역 포함.',
      payload: { daysBeforeExpiry: 90 },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_005`,
      taskType: 'CONTRACT_EXPIRY_NOTICE', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 9 * * *',
      executedAt: dAgo(1).replace('T', ' ').slice(0, 19) + '.000Z',
      processedCount: 14, automatedCount: 14, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 2980,
      summary: '계약 만료 임박 14건 알림 발송 완료.',
      payload: { daysBeforeExpiry: 90 },
    },
    // 민원 자동 접수·분류 (이벤트 트리거)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_006`,
      taskType: 'COMPLAINT_INTAKE', status: 'COMPLETED',
      triggerType: 'EVENT',
      executedAt: dAgo(0),
      processedCount: 8, automatedCount: 6, manualCount: 2, errorCount: 0,
      automationRate: 0.750, durationMs: 4120,
      summary: '오늘 민원 8건 AI 자동 분류. 6건 자동 처리(카테고리·우선순위·담당자 배정), 2건 수동 확인 필요.',
      payload: { date: dDate(0), complexId: COMPLEX_ID },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_007`,
      taskType: 'COMPLAINT_INTAKE', status: 'COMPLETED',
      triggerType: 'EVENT',
      executedAt: dAgo(1),
      processedCount: 5, automatedCount: 4, manualCount: 1, errorCount: 0,
      automationRate: 0.800, durationMs: 3800,
      summary: '어제 민원 5건 AI 분류. 4건 자동 처리, 1건 모호 — 수동 검토 필요.',
      payload: { date: dDate(-1), complexId: COMPLEX_ID },
    },
    // 정기 점검 일정 자동 생성 (분기별)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_008`,
      taskType: 'INSPECTION_SCHEDULE', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 7 1 1,4,7,10 *',
      executedAt: '2026-04-01T07:00:15.000Z',
      processedCount: 12, automatedCount: 11, manualCount: 1, errorCount: 0,
      automationRate: 0.917, durationMs: 8650,
      summary: '2026년 2분기 점검 일정 12건 생성. 11건 자동 등록, 1건 담당자 미배정으로 수동 확인 필요.',
      payload: { quarter: '2026-Q2', complexId: COMPLEX_ID },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_009`,
      taskType: 'INSPECTION_SCHEDULE', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 7 1 1,4,7,10 *',
      executedAt: '2026-01-01T07:00:10.000Z',
      processedCount: 10, automatedCount: 10, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 7200,
      summary: '2026년 1분기 점검 일정 10건 전량 자동 등록 완료.',
      payload: { quarter: '2026-Q1', complexId: COMPLEX_ID },
    },
    // 법정 보고 자동 제출 (분기별)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_010`,
      taskType: 'REPORT_SUBMISSION', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 10 5 1,4,7,10 *',
      executedAt: '2026-04-05T10:00:30.000Z',
      processedCount: 3, automatedCount: 3, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 12400,
      summary: '2026년 1분기 안전관리계획 보고서 3건 지자체 포털 자동 제출 완료.',
      payload: { quarter: '2026-Q1', complexId: COMPLEX_ID },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_011`,
      taskType: 'REPORT_SUBMISSION', status: 'FAILED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 10 5 1,4,7,10 *',
      executedAt: '2025-10-05T10:00:22.000Z',
      processedCount: 3, automatedCount: 2, manualCount: 0, errorCount: 1,
      automationRate: 0.667, durationMs: 25000,
      summary: '2025년 3분기 보고서 제출 중 포털 연결 오류로 1건 실패. 재시도 필요.',
      errorDetails: ['포털 API 응답 없음 (타임아웃 25초)'],
      payload: { quarter: '2025-Q3', complexId: COMPLEX_ID },
    },
    // 마일리지 지급 (월말)
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_012`,
      taskType: 'MILEAGE_GRANT', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 11 28 * *',
      executedAt: '2026-03-28T11:00:05.000Z',
      processedCount: 87, automatedCount: 87, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 5100,
      summary: '3월 클린하우스 마일리지 87세대 지급 완료. 총 43,500점.',
      payload: { month: '2026-03', totalPoints: 43500 },
    },
    {
      _id: `rpaTask:${ORG_ID}:rpa_full_013`,
      taskType: 'MILEAGE_GRANT', status: 'COMPLETED',
      triggerType: 'SCHEDULED', scheduleExpression: '0 11 28 * *',
      executedAt: '2026-02-28T11:00:03.000Z',
      processedCount: 92, automatedCount: 92, manualCount: 0, errorCount: 0,
      automationRate: 1.0, durationMs: 4900,
      summary: '2월 클린하우스 마일리지 92세대 지급 완료. 총 46,000점.',
      payload: { month: '2026-02', totalPoints: 46000 },
    },
  ];

  for (const rpa of rpaTasks) {
    await upsert(org, {
      _id: rpa._id, docType: 'rpaTask', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      taskType: rpa.taskType, status: rpa.status,
      triggerType: rpa.triggerType,
      ...(rpa.scheduleExpression && { scheduleExpression: rpa.scheduleExpression }),
      executedAt: rpa.executedAt,
      processedCount: rpa.processedCount, automatedCount: rpa.automatedCount,
      manualCount: rpa.manualCount, errorCount: rpa.errorCount,
      automationRate: rpa.automationRate, durationMs: rpa.durationMs,
      summary: rpa.summary,
      ...(rpa.errorDetails && { errorDetails: rpa.errorDetails }),
      payload: rpa.payload,
      createdAt: rpa.executedAt, updatedAt: rpa.executedAt,
      createdBy: 'system', updatedBy: 'system',
    });
  }

  // ══════════════════════════════════════════════════════════
  // 완료 요약
  // ══════════════════════════════════════════════════════════
  console.log(`
✅ 종합 샘플 데이터 투입 완료!

  📊 투입 데이터 요약:
  ┌──────────────────────────────────────┬──────┐
  │  항목                                │  건수 │
  ├──────────────────────────────────────┼──────┤
  │  점검 프로젝트 (추가)                │  +5  │
  │  점검 세션 (추가)                    │  +8  │
  │  결함 (추가)                         │  +15 │
  │  균열 게이지 포인트 (추가)           │  +3  │
  │  균열 측정 이력 (추가)               │  +12 │
  │  민원 (추가)                         │  +10 │
  │  작업지시                            │  +10 │
  │  일정                                │  +12 │
  │  경보                                │  +10 │
  │  보고서                              │  +8  │
  │  KPI 레코드 (월별)                   │  +9  │
  │  RPA 작업 이력                       │  +13 │
  └──────────────────────────────────────┴──────┘
`);
}

run().catch((e) => { console.error('❌ 오류:', e.message); process.exit(1); });
