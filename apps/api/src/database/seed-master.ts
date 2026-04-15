/**
 * seed-master.ts — AX 플랫폼 통합 마스터 시드 (단일 진입점)
 *
 * ✅ 이 파일 하나로 모든 마스터·샘플 데이터를 일괄 투입합니다.
 *    (기존 seed.ts / seed-extra.ts / seed-full.ts / seeds/*.seed.ts 통합)
 *
 * ── 포함 데이터 ──────────────────────────────────────────────────────
 *   마스터  : 기관 1 · 사용자 6 · 단지 1 · 동 3 · 층 5 · 구역 4
 *   점검관리 : 프로젝트 8 · 세션 13
 *   결함관리 : 결함 30
 *   균열모니터링: 게이지 13 · 측정이력 56
 *   민원관리 : 민원 37
 *   작업지시 : 12
 *   일정관리 : 16
 *   경  보  : 23
 *   보고서  : 9
 *   KPI     : 13 (월별 시계열)
 *   RPA     : 13
 *
 * ── 실행 ─────────────────────────────────────────────────────────────
 *   yarn workspace @ax/api seed:master
 *   # 또는
 *   docker compose exec api node dist/src/database/seed-master.js
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import * as nano from 'nano';
import * as bcrypt from 'bcrypt';

// ── 환경 설정 ─────────────────────────────────────────────────────────
const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';
const ENV              = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

const PLATFORM_DB = `ax__platform_${ENV}`;
const ORG_ID      = 'org_seed001';
const ORG_DB      = `ax_${ORG_ID}_${ENV}`;

// ── ID 상수 ───────────────────────────────────────────────────────────
const USER_SUPER    = `user:_platform:usr_super01`;
const USER_ADMIN    = `user:_platform:usr_admin01`;
const USER_INSP1    = `user:_platform:usr_insp01`;
const USER_INSP2    = `user:_platform:usr_insp02`;
const USER_REVIEWER = `user:_platform:usr_rev01`;
const USER_CMGR     = `user:_platform:usr_cmgr01`;

const COMPLEX_ID  = `housingComplex:${ORG_ID}:cplx_seed01`;
const BLDG_101    = `building:${ORG_ID}:bldg_101`;
const BLDG_102    = `building:${ORG_ID}:bldg_102`;
const BLDG_103    = `building:${ORG_ID}:bldg_103`;
const FLR_101_B2  = `floor:${ORG_ID}:flr_101_b2`;
const FLR_101_B1  = `floor:${ORG_ID}:flr_101_b1`;
const FLR_101_1F  = `floor:${ORG_ID}:flr_101_1f`;
const FLR_101_2F  = `floor:${ORG_ID}:flr_101_2f`;
const FLR_101_3F  = `floor:${ORG_ID}:flr_101_3f`;
const ZONE_PKG_A  = `zone:${ORG_ID}:zone_pkg_a`;
const ZONE_PKG_B  = `zone:${ORG_ID}:zone_pkg_b`;
const ZONE_LOBBY  = `zone:${ORG_ID}:zone_lobby`;
const ZONE_STAIRS = `zone:${ORG_ID}:zone_stairs`;

// Gauge points
const G = (n: string) => `crackGaugePoint:${ORG_ID}:gauge_${n}`;
const GAUGE_001 = G('001'); const GAUGE_002 = G('002'); const GAUGE_003 = G('003');
const GAUGE_004 = G('004'); const GAUGE_005 = G('005');

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────
const now    = new Date().toISOString();
const dAgo   = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const dFwd   = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const dDate  = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const thisMonth = now.slice(0, 7); // YYYY-MM

// ── Nano 클라이언트 ───────────────────────────────────────────────────
const client = nano({
  url: COUCHDB_URL,
  requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } },
});

// ── 유틸 ─────────────────────────────────────────────────────────────
async function upsert(db: nano.DocumentScope<any>, doc: any) {
  try {
    const existing = await db.get(doc._id);
    await db.insert({ ...doc, _rev: existing._rev });
    process.stdout.write('~');
  } catch (e: any) {
    if (e.statusCode === 404) { await db.insert(doc); process.stdout.write('+'); }
    else console.warn(`\n  ! ${doc._id}: ${e.message}`);
  }
}

async function ensureDb(name: string) {
  try { await client.db.create(name); console.log(`  created: ${name}`); }
  catch (e: any) { if (e.statusCode !== 412) throw e; }
}

async function createIndexes(db: nano.DocumentScope<any>) {
  const idxs = [
    { index: { fields: ['docType','orgId','createdAt'] },               name: 'idx-type-org-created' },
    { index: { fields: ['docType','complexId','createdAt'] },            name: 'idx-type-complex-created' },
    { index: { fields: ['docType','buildingId'] },                       name: 'idx-type-building' },
    { index: { fields: ['docType','floorId'] },                          name: 'idx-type-floor' },
    { index: { fields: ['docType','severity','isRepaired'] },            name: 'idx-defect-severity' },
    { index: { fields: ['docType','status','createdAt'] },               name: 'idx-status-created' },
    { index: { fields: ['docType','status','dueDate'] },                 name: 'idx-status-due' },
    { index: { fields: ['docType','exceedsThreshold','measuredAt'] },    name: 'idx-crack-threshold' },
    { index: { fields: ['docType','isActive'] },                         name: 'idx-active' },
    { index: { fields: ['email'] },                                      name: 'idx-email' },
    { index: { fields: ['docType','gaugePointId','measuredAt'] },        name: 'idx-measurement-gauge' },
    { index: { fields: ['docType','projectId'] },                        name: 'idx-type-project' },
    { index: { fields: ['docType','sessionId'] },                        name: 'idx-type-session' },
    { index: { fields: ['docType','orgId','complexId'] },                name: 'idx-type-org-complex' },
    { index: { fields: ['docType','reportType','generatedAt'] },         name: 'idx-report-type' },
    { index: { fields: ['docType','periodStart'] },                      name: 'idx-kpi-period' },
    { index: { fields: ['docType','taskType','executedAt'] },            name: 'idx-rpa-type' },
  ];
  for (const idx of idxs) { try { await (db as any).createIndex(idx); } catch {} }
}

// ── 민원 타임라인 빌더 ─────────────────────────────────────────────────
function buildTimeline(c: any): any[] {
  const tl: any[] = [{ timestamp: c.submittedAt, fromStatus: null, toStatus: 'RECEIVED', actorId: 'system' }];
  if (c.triagedAt) tl.push({ timestamp: c.triagedAt,  fromStatus: 'RECEIVED',    toStatus: 'TRIAGED',     actorId: USER_CMGR });
  if (c.assignedAt) tl.push({ timestamp: c.assignedAt, fromStatus: c.triagedAt ? 'TRIAGED' : 'RECEIVED', toStatus: 'ASSIGNED', actorId: USER_CMGR });
  if (c.inProgressAt) tl.push({ timestamp: c.inProgressAt, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', actorId: USER_CMGR });
  if (c.resolvedAt) tl.push({ timestamp: c.resolvedAt, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', actorId: USER_CMGR, notes: c.resolutionNotes });
  if (c.closedAt) tl.push({ timestamp: c.closedAt, fromStatus: 'RESOLVED', toStatus: 'CLOSED', actorId: USER_ADMIN, notes: '입주민 확인 완료 → 종결' });
  return tl;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   AX 플랫폼 통합 마스터 시드 시작                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ══ 0. DB 생성 및 인덱스 ════════════════════════════════════════════
  console.log('[0] DB 생성 및 인덱스');
  for (const db of ['_users', '_replicator', PLATFORM_DB, ORG_DB]) await ensureDb(db);
  const platform = client.use(PLATFORM_DB);
  const org      = client.use(ORG_DB);
  await createIndexes(platform);
  await createIndexes(org);

  // ══ 1. 기관 ═════════════════════════════════════════════════════════
  console.log('\n[1] 기관');
  await upsert(platform, {
    _id: `organization:_platform:${ORG_ID}`, docType: 'organization', orgId: '_platform',
    name: '행복주택관리공단', businessNumber: '123-45-67890',
    address: '서울특별시 강남구 테헤란로 521',
    contactName: '김관리', contactEmail: 'admin@happy-housing.kr', contactPhone: '02-1234-5678',
    plan: 'PRO', dbName: ORG_DB, isActive: true,
    contractStartDate: '2024-01-01', contractEndDate: '2026-12-31',
    createdAt: now, updatedAt: now, createdBy: USER_SUPER, updatedBy: USER_SUPER,
  });

  // ══ 2. 사용자 ════════════════════════════════════════════════════════
  console.log('\n[2] 사용자');
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const users = [
    { _id: USER_SUPER,    email: 'super@ax-platform.kr',   pw: 'Super@1234',     role: 'SUPER_ADMIN',   name: '슈퍼관리자',         orgId: '_platform' },
    { _id: USER_ADMIN,    email: 'admin@happy-housing.kr', pw: 'Admin@1234',     role: 'ORG_ADMIN',     name: '김관리 (관리자)',     orgId: ORG_ID },
    { _id: USER_INSP1,    email: 'hong@happy-housing.kr',  pw: 'Inspector@1234', role: 'INSPECTOR',     name: '홍길동 (점검원)',     orgId: ORG_ID, phone: '010-2345-6789' },
    { _id: USER_INSP2,    email: 'lee@happy-housing.kr',   pw: 'Inspector@1234', role: 'INSPECTOR',     name: '이현장 (점검원)',     orgId: ORG_ID, phone: '010-3456-7890' },
    { _id: USER_REVIEWER, email: 'choi@happy-housing.kr',  pw: 'Reviewer@1234',  role: 'REVIEWER',      name: '최기술 (책임기술자)', orgId: ORG_ID, phone: '010-4567-8901' },
    { _id: USER_CMGR,     email: 'park@happy-housing.kr',  pw: 'Cmgr@1234',      role: 'COMPLAINT_MGR', name: '박민원 (민원담당)',   orgId: ORG_ID, phone: '010-5678-9012' },
  ];
  for (const u of users) {
    await upsert(platform, {
      _id: u._id, docType: 'user', orgId: '_platform',
      email: u.email, passwordHash: await hash(u.pw),
      name: u.name, role: u.role, phone: u.phone ?? null,
      organizationId: u.orgId,
      assignedComplexIds: u.orgId === ORG_ID ? [COMPLEX_ID] : [],
      isActive: true, refreshTokenHash: null, lastLoginAt: null,
      createdAt: now, updatedAt: now, createdBy: USER_SUPER, updatedBy: USER_SUPER,
    });
  }

  // ══ 3. 단지 · 동 · 층 · 구역 ═════════════════════════════════════════
  console.log('\n[3] 단지·동·층·구역');
  await upsert(org, {
    _id: COMPLEX_ID, docType: 'housingComplex', orgId: ORG_ID,
    name: '행복마을 1단지', address: '서울특별시 강남구 개포동 1200',
    totalUnits: 300, totalBuildings: 3, builtYear: 1998,
    managedBy: USER_ADMIN, latitude: 37.4848, longitude: 127.0577,
    qrCode: `AX:${COMPLEX_ID}`, tags: ['아파트', '재건축예정', '안전점검대상'],
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });
  const buildings = [
    { _id: BLDG_101, name: '101동', code: 'B101', units: 100 },
    { _id: BLDG_102, name: '102동', code: 'B102', units: 100 },
    { _id: BLDG_103, name: '103동', code: 'B103', units: 100 },
  ];
  for (const b of buildings) await upsert(org, {
    _id: b._id, docType: 'building', orgId: ORG_ID, complexId: COMPLEX_ID,
    name: b.name, code: b.code, totalFloors: 15, undergroundFloors: 2,
    totalUnits: b.units, builtDate: '1998-06-30', structureType: '철근콘크리트조',
    qrCode: `AX:${b._id}`, floorPlanUrls: {},
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });
  const floors = [
    { _id: FLR_101_B2, fn: -2, name: 'B2', area: 800 },
    { _id: FLR_101_B1, fn: -1, name: 'B1', area: 850 },
    { _id: FLR_101_1F, fn:  1, name: '1F', area: 320 },
    { _id: FLR_101_2F, fn:  2, name: '2F', area: 320 },
    { _id: FLR_101_3F, fn:  3, name: '3F', area: 320 },
  ];
  for (const f of floors) await upsert(org, {
    _id: f._id, docType: 'floor', orgId: ORG_ID, buildingId: BLDG_101, complexId: COMPLEX_ID,
    floorNumber: f.fn, floorName: f.name, area: f.area, zones: [],
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });
  const zones = [
    { _id: ZONE_PKG_A,  floorId: FLR_101_B2, name: '지하주차장 A구역', code: 'Z-B2-A', desc: '지하2층 북측 (50대)' },
    { _id: ZONE_PKG_B,  floorId: FLR_101_B2, name: '지하주차장 B구역', code: 'Z-B2-B', desc: '지하2층 남측 (50대)' },
    { _id: ZONE_LOBBY,  floorId: FLR_101_1F, name: '1층 로비',         code: 'Z-1F-L', desc: '출입구 및 우편함' },
    { _id: ZONE_STAIRS, floorId: FLR_101_1F, name: '계단실 A',         code: 'Z-1F-S', desc: '비상계단 북측' },
  ];
  for (const z of zones) await upsert(org, {
    _id: z._id, docType: 'zone', orgId: ORG_ID, floorId: z.floorId, buildingId: BLDG_101, complexId: COMPLEX_ID,
    name: z.name, code: z.code, description: z.desc, qrCode: `AX:${z._id}`,
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ══ 4. 점검 프로젝트 (8건) ══════════════════════════════════════════
  console.log('\n[4] 점검 프로젝트');
  const projects = [
    // ── seed.ts 원본 (3건) ──────────────────────────────────────────
    {
      _id: `inspectionProject:${ORG_ID}:proj_2025_r1`,
      name: '2025년 1차 정기안전점검', round: 1, inspectionType: 'REGULAR',
      plannedStartDate: '2025-03-01', plannedEndDate: '2025-03-31',
      actualStartDate: '2025-03-03', actualEndDate: '2025-03-28', status: 'COMPLETED',
      leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
      description: '연 1회 정기 안전점검 (봄)',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_101_b2`, `inspectionSession:${ORG_ID}:sess_101_1f`],
      createdAt: dAgo(400), updatedAt: dAgo(350),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2025_r2`,
      name: '2025년 2차 정기안전점검', round: 2, inspectionType: 'REGULAR',
      plannedStartDate: dDate(-390), plannedEndDate: dDate(-345),
      actualStartDate: dDate(-385), actualEndDate: dDate(-350), status: 'COMPLETED',
      leadInspectorId: USER_INSP2, reviewerId: USER_REVIEWER,
      description: '연 2회 정기 안전점검 (가을)',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_101_3f`, `inspectionSession:${ORG_ID}:sess_102_ext`],
      createdAt: dAgo(420), updatedAt: dAgo(340),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2026_emg`,
      name: '102동 외벽 긴급점검', round: 1, inspectionType: 'EMERGENCY',
      plannedStartDate: dDate(-5), plannedEndDate: dDate(5),
      actualStartDate: dDate(-3), status: 'PENDING_REVIEW',
      leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
      description: '102동 외벽 콘크리트 박락 발견 후 긴급 점검',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_2026_emg`],
      createdAt: dAgo(7), updatedAt: dAgo(2),
    },
    // ── seed-full.ts 추가 (5건) ──────────────────────────────────────
    {
      _id: `inspectionProject:${ORG_ID}:proj_2025_q3`,
      name: '2025년 3분기 시설물 점검', round: 3, inspectionType: 'REGULAR',
      plannedStartDate: '2025-07-01', plannedEndDate: '2025-07-31',
      actualStartDate: '2025-07-02', actualEndDate: '2025-07-29', status: 'COMPLETED',
      leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
      description: '3분기 정기 시설물 안전점검 — 전 동 공용부 포함',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_103_1f`, `inspectionSession:${ORG_ID}:sess_102_b1`],
      createdAt: dAgo(280), updatedAt: dAgo(230),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2025_q4`,
      name: '2025년 4분기 동절기 사전점검', round: 4, inspectionType: 'REGULAR',
      plannedStartDate: '2025-11-01', plannedEndDate: '2025-11-30',
      actualStartDate: '2025-11-03', actualEndDate: '2025-11-27', status: 'COMPLETED',
      leadInspectorId: USER_INSP2, reviewerId: USER_REVIEWER,
      description: '동절기 대비 배관·난방·외벽 사전점검',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_103_rf`, `inspectionSession:${ORG_ID}:sess_101_rf`],
      createdAt: dAgo(190), updatedAt: dAgo(160),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2025_fire`,
      name: '2025년 소방설비 정기점검', round: 1, inspectionType: 'FIRE_SAFETY',
      plannedStartDate: '2025-10-01', plannedEndDate: '2025-10-15',
      actualStartDate: '2025-10-02', actualEndDate: '2025-10-13', status: 'COMPLETED',
      leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
      description: '소방청 기준 연 2회 소방설비 점검 (하반기)',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_fire_101`, `inspectionSession:${ORG_ID}:sess_fire_102`, `inspectionSession:${ORG_ID}:sess_fire_103`],
      createdAt: dAgo(200), updatedAt: dAgo(175),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2026_r1`,
      name: '2026년 상반기 정기안전점검', round: 1, inspectionType: 'REGULAR',
      plannedStartDate: dDate(14), plannedEndDate: dDate(45), status: 'PLANNED',
      leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
      description: '2026년 1차 정기안전점검 계획',
      sessionIds: [`inspectionSession:${ORG_ID}:sess_2026_r1`],
      createdAt: dAgo(10), updatedAt: dAgo(5),
    },
    {
      _id: `inspectionProject:${ORG_ID}:proj_2026_spe`,
      name: '102동 구조안전 정밀진단', round: 1, inspectionType: 'SPECIAL',
      plannedStartDate: dDate(3), plannedEndDate: dDate(17),
      actualStartDate: dFwd(3), status: 'IN_PROGRESS',
      leadInspectorId: USER_REVIEWER, reviewerId: USER_REVIEWER,
      description: '외벽 박락·균열 집중 발생에 따른 구조안전 정밀진단 (전문업체 용역)',
      sessionIds: [],
      createdAt: dAgo(7), updatedAt: dAgo(1),
    },
  ];
  for (const p of projects) await upsert(org, {
    ...p, docType: 'inspectionProject', orgId: ORG_ID, complexId: COMPLEX_ID,
    createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ══ 5. 점검 세션 (13건) ═════════════════════════════════════════════
  console.log('\n[5] 점검 세션');
  const sessions = [
    // ── seed.ts (5건) ───────────────────────────────────────────────
    {
      _id: `inspectionSession:${ORG_ID}:sess_101_b2`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_r1`, buildingId: BLDG_101,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A, inspectorId: USER_INSP1,
      status: 'COMPLETED', startedAt: dAgo(380), completedAt: dAgo(379), defectCount: 5,
      weatherCondition: '맑음', temperature: 12,
      checklistItems: [
        { id: 'ci_001', category: '구조', description: '기둥 균열 여부', result: 'FAIL', notes: '균열 3건 발견', order: 1 },
        { id: 'ci_002', category: '구조', description: '보 처짐 여부', result: 'PASS', order: 2 },
        { id: 'ci_003', category: '방수', description: '바닥 누수 흔적', result: 'FAIL', notes: '누수 2건', order: 3 },
        { id: 'ci_004', category: '안전', description: '비상구 확보', result: 'PASS', order: 4 },
        { id: 'ci_005', category: '안전', description: '소화기 비치', result: 'PASS', order: 5 },
      ],
      notes: '지하주차장 북측 기둥 다수 균열 확인. 즉시 보수 필요.',
      createdAt: dAgo(380), updatedAt: dAgo(379),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_101_1f`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_r1`, buildingId: BLDG_101,
      floorId: FLR_101_1F, zoneId: ZONE_LOBBY, inspectorId: USER_INSP1,
      status: 'COMPLETED', startedAt: dAgo(378), completedAt: dAgo(378), defectCount: 2,
      weatherCondition: '맑음', temperature: 13,
      checklistItems: [
        { id: 'ci_006', category: '마감', description: '바닥 타일 균열', result: 'FAIL', notes: '출입구 앞 타일 3장 파손', order: 1 },
        { id: 'ci_007', category: '창호', description: '창문 개폐 상태', result: 'PASS', order: 2 },
        { id: 'ci_008', category: '방수', description: '외벽 누수 흔적', result: 'PASS', order: 3 },
      ],
      notes: '로비 타일 교체 완료.',
      createdAt: dAgo(378), updatedAt: dAgo(378),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_101_3f`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_r2`, buildingId: BLDG_101,
      floorId: FLR_101_3F, inspectorId: USER_INSP2,
      status: 'SUBMITTED', startedAt: dAgo(360), completedAt: dAgo(358), defectCount: 1,
      checklistItems: [
        { id: 'ci_009', category: '구조', description: '슬래브 균열', result: 'FAIL', notes: '3F 복도 슬래브 균열 확인', order: 1 },
        { id: 'ci_010', category: '방수', description: '욕실 방수', result: 'PASS', order: 2 },
        { id: 'ci_011', category: '설비', description: '배관 누수', result: 'PASS', order: 3 },
      ],
      createdAt: dAgo(360), updatedAt: dAgo(355),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_102_ext`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_r2`, buildingId: BLDG_102,
      inspectorId: USER_INSP2, status: 'COMPLETED', startedAt: dAgo(355), completedAt: dAgo(353), defectCount: 0,
      checklistItems: [
        { id: 'ci_012', category: '외벽', description: '외벽 상태', result: 'PASS', order: 1 },
        { id: 'ci_013', category: '구조', description: '구조 균열', result: 'PASS', order: 2 },
      ],
      createdAt: dAgo(360), updatedAt: dAgo(353),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_2026_emg`,
      projectId: `inspectionProject:${ORG_ID}:proj_2026_emg`, buildingId: BLDG_102,
      inspectorId: USER_INSP1, status: 'PENDING_REVIEW',
      startedAt: dAgo(3), completedAt: dAgo(2), defectCount: 4,
      weatherCondition: '흐림', temperature: 9,
      checklistItems: [
        { id: 'ci_014', category: '외벽', description: '외벽 콘크리트 박락', result: 'FAIL', notes: '102동 남측 외벽 박락 다수', order: 1 },
        { id: 'ci_015', category: '구조', description: '외벽 균열', result: 'FAIL', notes: '0.5mm 이상 균열 5건', order: 2 },
        { id: 'ci_016', category: '방수', description: '옥상 방수', result: 'PASS', order: 3 },
      ],
      notes: '긴급 조치 권고. 낙하물 위험으로 출입 통제 필요.',
      createdAt: dAgo(3), updatedAt: dAgo(2),
    },
    // ── seed-full.ts 추가 (8건) ──────────────────────────────────────
    {
      _id: `inspectionSession:${ORG_ID}:sess_103_1f`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_q3`, buildingId: BLDG_103,
      inspectorId: USER_INSP1, status: 'APPROVED',
      startedAt: dAgo(260), completedAt: dAgo(259), defectCount: 3,
      weatherCondition: '흐림', temperature: 26,
      checklistItems: [
        { id: 'cs_t01', category: '구조', description: '기둥·보 균열 여부', result: 'FAIL', notes: '1층 기둥 하부 0.2mm 균열 2건', order: 1 },
        { id: 'cs_t02', category: '방수', description: '지하층 방수 상태', result: 'FAIL', notes: '침수 흔적 확인', order: 2 },
        { id: 'cs_t03', category: '마감', description: '계단실 손상', result: 'PASS', order: 3 },
        { id: 'cs_t04', category: '안전', description: '비상구 확보', result: 'PASS', order: 4 },
        { id: 'cs_t05', category: '설비', description: '소화전 정상 여부', result: 'PASS', order: 5 },
      ],
      notes: '103동 1층 공용부 기둥 균열 — 보수 조치 필요.',
      createdAt: dAgo(260), updatedAt: dAgo(255),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_103_rf`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_q4`, buildingId: BLDG_103,
      inspectorId: USER_INSP2, status: 'APPROVED',
      startedAt: dAgo(180), completedAt: dAgo(179), defectCount: 2,
      weatherCondition: '맑음', temperature: 5,
      checklistItems: [
        { id: 'cs_r01', category: '방수', description: '옥상 방수층 상태', result: 'FAIL', notes: '옥상 방수층 균열 및 들뜸 3구간', order: 1 },
        { id: 'cs_r02', category: '배관', description: '옥상 배수구 막힘', result: 'FAIL', notes: '배수구 2곳 이물질 막힘', order: 2 },
        { id: 'cs_r03', category: '구조', description: '옥상 난간 안전성', result: 'PASS', order: 3 },
      ],
      notes: '옥상 방수층 보수 및 배수구 청소 긴급 조치 필요.',
      createdAt: dAgo(180), updatedAt: dAgo(175),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_102_b1`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_q3`, buildingId: BLDG_102,
      inspectorId: USER_INSP2, status: 'APPROVED',
      startedAt: dAgo(262), completedAt: dAgo(262), defectCount: 4,
      weatherCondition: '맑음', temperature: 28,
      checklistItems: [
        { id: 'cs_b01', category: '구조', description: '지하층 기둥 균열', result: 'FAIL', notes: '기둥 3개소 사선 균열', order: 1 },
        { id: 'cs_b02', category: '방수', description: '지하층 누수', result: 'FAIL', notes: '지하주차장 천장 누수 4곳', order: 2 },
        { id: 'cs_b03', category: '설비', description: '환기설비 상태', result: 'FAIL', notes: '환기팬 이상음 발생', order: 3 },
        { id: 'cs_b04', category: '안전', description: '비상조명 작동', result: 'PASS', order: 4 },
      ],
      notes: '102동 지하1층 전반적 누수·균열. 방수공사 및 구조 보수 필요.',
      createdAt: dAgo(262), updatedAt: dAgo(258),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_101_rf`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_q4`, buildingId: BLDG_101,
      inspectorId: USER_INSP1, status: 'APPROVED',
      startedAt: dAgo(182), completedAt: dAgo(181), defectCount: 1,
      weatherCondition: '구름조금', temperature: 7,
      checklistItems: [
        { id: 'cs_rf01', category: '방수', description: '옥상 방수층', result: 'PASS', order: 1 },
        { id: 'cs_rf02', category: '배관', description: '급수·배수 동결 방지', result: 'PASS', order: 2 },
        { id: 'cs_rf03', category: '설비', description: '난방설비 상태', result: 'FAIL', notes: '보일러실 팽창탱크 소음 발생', order: 3 },
      ],
      notes: '보일러실 팽창탱크 점검 필요.',
      createdAt: dAgo(182), updatedAt: dAgo(178),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_fire_101`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_fire`, buildingId: BLDG_101,
      inspectorId: USER_INSP1, status: 'APPROVED',
      startedAt: dAgo(198), completedAt: dAgo(197), defectCount: 2,
      weatherCondition: '맑음', temperature: 18,
      checklistItems: [
        { id: 'cf_101_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
        { id: 'cf_101_02', category: '소방', description: '소화기 수량·유효기간', result: 'FAIL', notes: '5개 유효기간 초과', order: 2 },
        { id: 'cf_101_03', category: '소방', description: '비상벨 작동 확인', result: 'PASS', order: 3 },
        { id: 'cf_101_04', category: '소방', description: '방화문 자동 폐쇄', result: 'FAIL', notes: '3층 방화문 자동 폐쇄 불량', order: 4 },
        { id: 'cf_101_05', category: '소방', description: '피난 유도등', result: 'PASS', order: 5 },
      ],
      notes: '소화기 교체 및 3층 방화문 수리 조치 필요.',
      createdAt: dAgo(198), updatedAt: dAgo(192),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_fire_102`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_fire`, buildingId: BLDG_102,
      inspectorId: USER_INSP2, status: 'APPROVED',
      startedAt: dAgo(196), completedAt: dAgo(195), defectCount: 1,
      weatherCondition: '맑음', temperature: 17,
      checklistItems: [
        { id: 'cf_102_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
        { id: 'cf_102_02', category: '소방', description: '소화기 수량·유효기간', result: 'PASS', order: 2 },
        { id: 'cf_102_03', category: '소방', description: '비상벨 작동 확인', result: 'FAIL', notes: '지하1층 비상벨 불량', order: 3 },
        { id: 'cf_102_04', category: '소방', description: '방화문 자동 폐쇄', result: 'PASS', order: 4 },
      ],
      notes: '102동 지하1층 비상벨 교체 필요.',
      createdAt: dAgo(196), updatedAt: dAgo(190),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_fire_103`,
      projectId: `inspectionProject:${ORG_ID}:proj_2025_fire`, buildingId: BLDG_103,
      inspectorId: USER_INSP1, status: 'APPROVED',
      startedAt: dAgo(194), completedAt: dAgo(193), defectCount: 0,
      weatherCondition: '맑음', temperature: 16,
      checklistItems: [
        { id: 'cf_103_01', category: '소방', description: '스프링클러 작동 상태', result: 'PASS', order: 1 },
        { id: 'cf_103_02', category: '소방', description: '소화기 수량·유효기간', result: 'PASS', order: 2 },
        { id: 'cf_103_03', category: '소방', description: '비상벨 작동 확인', result: 'PASS', order: 3 },
        { id: 'cf_103_04', category: '소방', description: '방화문 자동 폐쇄', result: 'PASS', order: 4 },
      ],
      notes: '103동 소방설비 전반 이상 없음.',
      createdAt: dAgo(194), updatedAt: dAgo(189),
    },
    {
      _id: `inspectionSession:${ORG_ID}:sess_2026_r1`,
      projectId: `inspectionProject:${ORG_ID}:proj_2026_r1`, buildingId: BLDG_101,
      inspectorId: USER_INSP1, status: 'DRAFT', defectCount: 0, checklistItems: [],
      createdAt: dAgo(5), updatedAt: dAgo(5),
    },
  ];
  for (const s of sessions) await upsert(org, {
    ...s, docType: 'inspectionSession', orgId: ORG_ID, complexId: COMPLEX_ID,
    createdBy: s.inspectorId, updatedBy: s.inspectorId,
  });

  // ══ 6. 결함 (30건) ══════════════════════════════════════════════════
  console.log('\n[6] 결함');
  const defects = [
    // ── seed.ts (15건) ─────────────────────────────────────────────────
    { _id: 'def_001', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_A, type: 'CRACK',         sev: 'CRITICAL', rep: false, w: 1.8, l: 450, d: 15,  desc: '지하주차장 A구역 기둥 C-3 수직 균열. 철근 노출 징후.',       loc: '101동 지하2층 A구역 C-3 기둥 북면 하단' },
    { _id: 'def_002', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_A, type: 'CRACK',         sev: 'HIGH',     rep: false, w: 0.8, l: 280, d: 5,   desc: '지하주차장 기둥 D-4 사선 균열',                             loc: '101동 지하2층 A구역 D-4 기둥 동면' },
    { _id: 'def_003', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_A, type: 'LEAK',          sev: 'HIGH',     rep: false, a: 2.5,             desc: '지하주차장 천장 누수. 우천 시 물고임.',                     loc: '101동 지하2층 A구역 주차 6번 칸 천장' },
    { _id: 'def_004', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_B, type: 'EFFLORESCENCE', sev: 'MEDIUM',   rep: true,  repAt: dAgo(320), repBy: USER_INSP1, repNote: '표면 세척 및 방수 도포 완료', desc: '기둥 하단부 백태. 염해 가능성.', loc: '101동 지하2층 B구역 기둥 전반' },
    { _id: 'def_005', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_A, type: 'CORROSION',     sev: 'HIGH',     rep: false, desc: '주차장 철제 난간 부식. 안전 위험.',                         loc: '101동 지하2층 A구역 차량 진출입로 난간' },
    { _id: 'def_006', bldg: BLDG_101, sess: 'sess_101_1f', proj: 'proj_2025_r1', fl: FLR_101_1F, zn: ZONE_LOBBY, type: 'SPALLING',      sev: 'MEDIUM',   rep: true,  repAt: dAgo(370), repBy: USER_INSP1, repNote: '타일 3장 교체 완료', a: 0.3, desc: '로비 바닥 타일 파손.', loc: '101동 1층 로비 주출입구 앞 3m' },
    { _id: 'def_007', bldg: BLDG_101, sess: 'sess_101_1f', proj: 'proj_2025_r1', fl: FLR_101_1F, zn: ZONE_STAIRS, type: 'CRACK',        sev: 'MEDIUM',   rep: false, w: 0.3, l: 120,       desc: '계단실 벽체 균열',                                         loc: '101동 1층 계단실 A 북벽 1.2m 높이' },
    { _id: 'def_008', bldg: BLDG_101, sess: 'sess_101_3f', proj: 'proj_2025_r2', fl: FLR_101_3F,             type: 'CRACK',             sev: 'HIGH',     rep: false, w: 0.6, l: 200,       desc: '3층 복도 슬래브 균열. 방수층 손상 우려.',                   loc: '101동 3층 복도 중앙부 천장 슬래브' },
    { _id: 'def_009', bldg: BLDG_102, sess: 'sess_2026_emg', proj: 'proj_2026_emg',               type: 'SPALLING',                     sev: 'CRITICAL', rep: false, a: 4.2, d: 30,         desc: '102동 외벽 콘크리트 박락. 보행자 낙하물 위험.',             loc: '102동 남측 외벽 5~7층 구간' },
    { _id: 'def_010', bldg: BLDG_102, sess: 'sess_2026_emg', proj: 'proj_2026_emg',               type: 'CRACK',                        sev: 'HIGH',     rep: false, w: 0.7, l: 380,       desc: '외벽 균열 (0.5mm 이상)',                                   loc: '102동 외벽 3~4층 접합부' },
    { _id: 'def_011', bldg: BLDG_102, sess: 'sess_2026_emg', proj: 'proj_2026_emg',               type: 'CRACK',                        sev: 'CRITICAL', rep: false, w: 1.2, l: 290,       desc: '외벽-슬래브 접합부 균열 및 백태',                           loc: '102동 동측 외벽 6층 슬래브 접합부' },
    { _id: 'def_012', bldg: BLDG_102, sess: 'sess_2026_emg', proj: 'proj_2026_emg',               type: 'LEAK',                         sev: 'HIGH',     rep: false, desc: '외벽 균열 통한 누수 흔적',                                  loc: '102동 내부 복도 6층 창틀 하부' },
    { _id: 'def_013', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2, zn: ZONE_PKG_B, type: 'DEFORMATION',  sev: 'MEDIUM',   rep: false, desc: '주차구획 경계블록 변형 및 침하',                            loc: '101동 지하2층 B구역 남측 경계' },
    { _id: 'def_014', bldg: BLDG_101, sess: 'sess_101_b2', proj: 'proj_2025_r1', fl: FLR_101_B2,             type: 'EFFLORESCENCE',     sev: 'LOW',      rep: false, desc: '지하주차장 바닥 줄눈 백태',                                 loc: '101동 지하2층 전반적' },
    { _id: 'def_015', bldg: BLDG_101, sess: 'sess_101_1f', proj: 'proj_2025_r1', fl: FLR_101_1F,             type: 'SETTLEMENT',        sev: 'LOW',      rep: true,  repAt: dAgo(365), repBy: USER_INSP2, repNote: '그라우팅 처리 완료', desc: '로비 바닥 경미한 침하', loc: '101동 1층 로비 중앙' },
    // ── seed-full.ts 추가 (15건) ──────────────────────────────────────
    { _id: 'def_f01', bldg: BLDG_103, sess: 'sess_103_1f', proj: 'proj_2025_q3', type: 'CRACK',         sev: 'MEDIUM',   rep: true,  repAt: dAgo(240), repBy: USER_INSP1, repNote: '에폭시 주입 보수 완료', w: 0.2, l: 180, d: 3, desc: '103동 1층 기둥 하부 수직 균열 (0.2mm)', loc: '103동 1층 공용복도 기둥 A-2 북면' },
    { _id: 'def_f02', bldg: BLDG_103, sess: 'sess_103_1f', proj: 'proj_2025_q3', type: 'LEAK',          sev: 'HIGH',     rep: false, a: 3.8,       desc: '103동 지하1층 침수 흔적. 방수층 손상 추정.',             loc: '103동 지하1층 서측 벽체 하부 전반' },
    { _id: 'def_f03', bldg: BLDG_103, sess: 'sess_103_rf', proj: 'proj_2025_q4', type: 'SPALLING',      sev: 'MEDIUM',   rep: false, a: 5.2,       desc: '옥상 방수층 균열 및 들뜸. 누수 위험.',                   loc: '103동 옥상 중앙부 및 파라펫 주변' },
    { _id: 'def_f04', bldg: BLDG_103, sess: 'sess_103_rf', proj: 'proj_2025_q4', type: 'OTHER',         sev: 'LOW',      rep: true,  repAt: dAgo(170), repBy: USER_INSP2, repNote: '배수구 청소 및 망 교체 완료', desc: '옥상 드레인 배수구 이물질 막힘', loc: '103동 옥상 배수구 2개소' },
    { _id: 'def_f05', bldg: BLDG_102, sess: 'sess_102_b1', proj: 'proj_2025_q3', type: 'CRACK',         sev: 'HIGH',     rep: false, w: 0.6, l: 320, d: 8, desc: '102동 지하1층 기둥 사선 균열 3개소', loc: '102동 지하1층 동측 기둥 B-3, B-4, B-5' },
    { _id: 'def_f06', bldg: BLDG_102, sess: 'sess_102_b1', proj: 'proj_2025_q3', type: 'LEAK',          sev: 'HIGH',     rep: false, a: 6.5,       desc: '102동 지하1층 주차장 천장 누수 4개소',                   loc: '102동 지하1층 북측 주차구역 천장' },
    { _id: 'def_f07', bldg: BLDG_102, sess: 'sess_102_b1', proj: 'proj_2025_q3', type: 'EFFLORESCENCE', sev: 'MEDIUM',   rep: false, desc: '지하1층 벽체 전반 백태 — 염해 가능성',                    loc: '102동 지하1층 외벽 하부 전반' },
    { _id: 'def_f08', bldg: BLDG_102, sess: 'sess_102_b1', proj: 'proj_2025_q3', type: 'CORROSION',     sev: 'MEDIUM',   rep: false, desc: '지하주차장 환기팬 프레임 부식 — 이상음 발생',              loc: '102동 지하1층 환기설비 북측' },
    { _id: 'def_f09', bldg: BLDG_101, sess: 'sess_101_rf', proj: 'proj_2025_q4', type: 'OTHER',         sev: 'MEDIUM',   rep: false, desc: '보일러실 팽창탱크 소음 — 내부 부품 마모 추정',            loc: '101동 옥상 보일러실' },
    { _id: 'def_f10', bldg: BLDG_101, sess: 'sess_fire_101', proj: 'proj_2025_fire', type: 'OTHER',     sev: 'HIGH',     rep: true,  repAt: dAgo(187), repBy: USER_INSP2, repNote: '소화기 5개 신품 교체 완료', desc: '소화기 유효기간 초과 5개', loc: '101동 3·5·7·9·11층 계단실' },
    { _id: 'def_f11', bldg: BLDG_101, sess: 'sess_fire_101', proj: 'proj_2025_fire', type: 'DEFORMATION',sev: 'HIGH',    rep: true,  repAt: dAgo(185), repBy: USER_INSP1, repNote: '방화문 클로저 교체 완료', desc: '3층 방화문 자동 폐쇄 장치 불량', loc: '101동 3층 방화문 (계단실 측)' },
    { _id: 'def_f12', bldg: BLDG_102, sess: 'sess_fire_102', proj: 'proj_2025_fire', type: 'OTHER',     sev: 'HIGH',     rep: true,  repAt: dAgo(183), repBy: USER_INSP2, repNote: '비상벨 수신기 교체 및 선로 점검 완료', desc: '지하1층 비상벨 작동 불량', loc: '102동 지하1층 비상벨 (북측)' },
    { _id: 'def_f13', bldg: BLDG_103, sess: 'sess_103_1f', proj: 'proj_2025_q3', type: 'SETTLEMENT',    sev: 'LOW',      rep: false, desc: '103동 외부 보도블록 침하 및 들뜸',                         loc: '103동 정면 보행로 진입구 앞 2m 구간' },
    { _id: 'def_f14', bldg: BLDG_103, sess: 'sess_103_1f', proj: 'proj_2025_q3', type: 'CORROSION',     sev: 'MEDIUM',   rep: false, desc: '103동 외벽 철제 창틀 부식 및 녹물 흔적',                  loc: '103동 1~5층 남측 외벽 창틀' },
    { _id: 'def_f15', bldg: BLDG_102, sess: null,          proj: 'proj_2026_spe', type: 'CRACK',         sev: 'CRITICAL', rep: false, w: 2.1, l: 680, d: 25, desc: '102동 북측 외벽 구조 균열 — 거동 중 (진행형)', loc: '102동 북측 외벽 8~12층 수직 균열' },
  ];
  for (const d of defects) {
    const sid = d.sess ? `inspectionSession:${ORG_ID}:${d.sess}` : undefined;
    const pid = `inspectionProject:${ORG_ID}:${d.proj}`;
    const did = `defect:${ORG_ID}:${d._id}`;
    await upsert(org, {
      _id: did, docType: 'defect', orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: d.bldg,
      ...(sid && { sessionId: sid }), projectId: pid,
      ...(d.fl && { floorId: d.fl }), ...(d.zn && { zoneId: d.zn }),
      defectType: d.type, severity: d.sev, description: d.desc, locationDescription: d.loc,
      ...(d.w !== undefined && { widthMm: d.w }), ...(d.l !== undefined && { lengthMm: d.l }),
      ...(d.d !== undefined && { depthMm: d.d }), ...(d.a !== undefined && { areaSqm: d.a }),
      isRepaired: d.rep ?? false,
      ...(d.repAt   && { repairedAt: d.repAt }),
      ...(d.repBy   && { repairedBy: d.repBy }),
      ...(d.repNote && { repairNotes: d.repNote }),
      mediaIds: [],
      createdAt: dAgo(260), updatedAt: dAgo(260), createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // ══ 7. 균열 게이지 포인트 (13개) ════════════════════════════════════
  console.log('\n[7] 균열 게이지 포인트');
  const gauges = [
    // seed.ts (5개)
    { id: 'gauge_001', name: 'GP-B2-C3-N',    bldg: BLDG_101, fl: FLR_101_B2, zn: ZONE_PKG_A, base: 0.3, thr: 1.0, inst: '2025-03-05', loc: '101동 지하2층 A구역 C-3기둥' },
    { id: 'gauge_002', name: 'GP-B2-D4-E',    bldg: BLDG_101, fl: FLR_101_B2, zn: ZONE_PKG_A, base: 0.2, thr: 0.8, inst: '2025-03-05', loc: '101동 지하2층 A구역 D-4기둥' },
    { id: 'gauge_003', name: 'GP-1F-STR-W',   bldg: BLDG_101, fl: FLR_101_1F, zn: ZONE_STAIRS,base: 0.1, thr: 0.5, inst: '2025-03-05', loc: '101동 1층 계단실 서벽' },
    { id: 'gauge_004', name: 'GP-102-S5F',    bldg: BLDG_102,                                   base: 0.4, thr: 1.0, inst: '2025-03-05', loc: '102동 남측 외벽 5층' },
    { id: 'gauge_005', name: 'GP-102-E6F',    bldg: BLDG_102,                                   base: 0.5, thr: 1.0, inst: '2025-03-05', loc: '102동 동측 외벽 6층' },
    // seed-extra.ts (5개)
    { id: 'gauge_006', name: 'GP-103-B1-W',   bldg: BLDG_103,                                   base: 0.2, thr: 0.8, inst: '2025-06-01', loc: '103동 지하1층 서측 벽체' },
    { id: 'gauge_007', name: 'GP-102-RF-C',   bldg: BLDG_102,                                   base: 0.3, thr: 1.0, inst: '2025-06-01', loc: '102동 옥상층 슬래브 중앙' },
    { id: 'gauge_008', name: 'GP-101-3F-N',   bldg: BLDG_101, fl: FLR_101_3F,                  base: 0.1, thr: 0.5, inst: '2025-06-01', loc: '101동 3층 북측 계단실' },
    { id: 'gauge_009', name: 'GP-103-2F-E',   bldg: BLDG_103,                                   base: 0.2, thr: 0.7, inst: '2025-06-01', loc: '103동 2층 동측 외벽' },
    { id: 'gauge_010', name: 'GP-101-B1-PIPE',bldg: BLDG_101, fl: FLR_101_B1,                  base: 0.15,thr: 0.6, inst: '2025-06-01', loc: '101동 지하1층 배관 관통부 좌측' },
    // seed-full.ts (3개)
    { id: 'gauge_011', name: 'GP-102-B1-N',   bldg: BLDG_102,                                   base: 0.25,thr: 0.9, inst: '2026-01-10', loc: '102동 지하1층 북측 외벽' },
    { id: 'gauge_012', name: 'GP-103-1F-A2',  bldg: BLDG_103,                                   base: 0.15,thr: 0.6, inst: '2026-01-10', loc: '103동 1층 공용복도 기둥 A-2' },
    { id: 'gauge_013', name: 'GP-102-N8F',    bldg: BLDG_102,                                   base: 0.5, thr: 1.5, inst: '2026-01-10', loc: '102동 북측 외벽 8~12층 구조균열' },
  ];
  for (const g of gauges) await upsert(org, {
    _id: `crackGaugePoint:${ORG_ID}:${g.id}`, docType: 'crackGaugePoint', orgId: ORG_ID,
    complexId: COMPLEX_ID, buildingId: g.bldg,
    ...(g.fl && { floorId: g.fl }), ...(g.zn && { zoneId: g.zn }),
    name: g.name, description: g.name,
    qrCode: `AX:crackGaugePoint:${ORG_ID}:${g.id}`,
    installDate: g.inst, baselineWidthMm: g.base, thresholdMm: g.thr,
    location: g.loc, isActive: true,
    createdAt: dAgo(60), updatedAt: now, createdBy: USER_INSP1, updatedBy: USER_INSP1,
  });

  // ══ 8. 균열 측정 이력 (56건) ════════════════════════════════════════
  console.log('\n[8] 균열 측정 이력');
  // compact: { gp, d(daysAgo), w(width), ch(change), ex(exceeds), cf(confidence), measBy? }
  type MR = { gp: string; d: number; w: number; ch: number; ex: boolean; cf: number; by?: string };
  const G_ = (n: string) => `crackGaugePoint:${ORG_ID}:gauge_${n}`;

  const measGroups: { prefix: string; by: string; rows: MR[] }[] = [
    { prefix: 'meas', by: USER_INSP1, rows: [
      // GAUGE_001 (임계치 1.0mm 초과, 현재 1.82mm)
      { gp: G_('001'), d: 55, w: 0.35, ch: 0.05, ex: false, cf: 0.95 },
      { gp: G_('001'), d: 42, w: 0.52, ch: 0.17, ex: false, cf: 0.94 },
      { gp: G_('001'), d: 28, w: 0.78, ch: 0.26, ex: false, cf: 0.92 },
      { gp: G_('001'), d: 14, w: 1.10, ch: 0.32, ex: true,  cf: 0.88 },
      { gp: G_('001'), d:  3, w: 1.45, ch: 0.35, ex: true,  cf: 0.91 },
      { gp: G_('001'), d:  0, w: 1.82, ch: 0.37, ex: true,  cf: 0.89 },
      // GAUGE_002 (임계치 0.8mm 초과)
      { gp: G_('002'), d: 55, w: 0.22, ch: 0.02, ex: false, cf: 0.96 },
      { gp: G_('002'), d: 28, w: 0.55, ch: 0.33, ex: false, cf: 0.93 },
      { gp: G_('002'), d:  7, w: 0.85, ch: 0.30, ex: true,  cf: 0.87 },
      { gp: G_('002'), d:  0, w: 0.92, ch: 0.07, ex: true,  cf: 0.90 },
      // GAUGE_003 (정상)
      { gp: G_('003'), d: 42, w: 0.12, ch: 0.02, ex: false, cf: 0.97 },
      { gp: G_('003'), d: 14, w: 0.18, ch: 0.06, ex: false, cf: 0.95 },
      { gp: G_('003'), d:  0, w: 0.21, ch: 0.03, ex: false, cf: 0.96 },
      // GAUGE_004 (102동 외벽)
      { gp: G_('004'), d: 10, w: 0.55, ch: 0.15, ex: false, cf: 0.88 },
      { gp: G_('004'), d:  3, w: 0.90, ch: 0.35, ex: false, cf: 0.85 },
      { gp: G_('004'), d:  0, w: 1.15, ch: 0.25, ex: true,  cf: 0.83 },
      // GAUGE_005 (102동 슬래브)
      { gp: G_('005'), d: 10, w: 0.52, ch: 0.02, ex: false, cf: 0.91 },
      { gp: G_('005'), d:  5, w: 0.88, ch: 0.36, ex: false, cf: 0.86 },
      { gp: G_('005'), d:  2, w: 1.22, ch: 0.34, ex: true,  cf: 0.80 },
      { gp: G_('005'), d:  0, w: 1.48, ch: 0.26, ex: true,  cf: 0.78 },
    ]},
    { prefix: 'meas_ex', by: USER_INSP2, rows: [
      // GAUGE_006 (103동 지하1층 임계치 초과)
      { gp: G_('006'), d: 60, w: 0.21, ch: 0.01, ex: false, cf: 0.96 },
      { gp: G_('006'), d: 45, w: 0.35, ch: 0.14, ex: false, cf: 0.94 },
      { gp: G_('006'), d: 30, w: 0.52, ch: 0.17, ex: false, cf: 0.93 },
      { gp: G_('006'), d: 15, w: 0.71, ch: 0.19, ex: false, cf: 0.91 },
      { gp: G_('006'), d:  5, w: 0.85, ch: 0.14, ex: true,  cf: 0.88 },
      { gp: G_('006'), d:  0, w: 0.93, ch: 0.08, ex: true,  cf: 0.86 },
      // GAUGE_007 (102동 옥상 급진전)
      { gp: G_('007'), d: 40, w: 0.32, ch: 0.02, ex: false, cf: 0.95 },
      { gp: G_('007'), d: 20, w: 0.58, ch: 0.26, ex: false, cf: 0.92 },
      { gp: G_('007'), d:  7, w: 0.87, ch: 0.29, ex: false, cf: 0.89 },
      { gp: G_('007'), d:  2, w: 1.12, ch: 0.25, ex: true,  cf: 0.85 },
      { gp: G_('007'), d:  0, w: 1.38, ch: 0.26, ex: true,  cf: 0.82 },
      // GAUGE_008 (101동 3층 정상)
      { gp: G_('008'), d: 50, w: 0.11, ch: 0.01, ex: false, cf: 0.98 },
      { gp: G_('008'), d: 25, w: 0.15, ch: 0.04, ex: false, cf: 0.97 },
      { gp: G_('008'), d:  0, w: 0.18, ch: 0.03, ex: false, cf: 0.97 },
      // GAUGE_009 (103동 2층 경계 접근)
      { gp: G_('009'), d: 30, w: 0.22, ch: 0.02, ex: false, cf: 0.95 },
      { gp: G_('009'), d: 15, w: 0.41, ch: 0.19, ex: false, cf: 0.92 },
      { gp: G_('009'), d:  5, w: 0.58, ch: 0.17, ex: false, cf: 0.90 },
      { gp: G_('009'), d:  0, w: 0.65, ch: 0.07, ex: false, cf: 0.91 },
      // GAUGE_010 (101동 배관 소폭 진행)
      { gp: G_('010'), d: 20, w: 0.17, ch: 0.02, ex: false, cf: 0.96 },
      { gp: G_('010'), d:  0, w: 0.23, ch: 0.06, ex: false, cf: 0.95 },
    ]},
    { prefix: 'meas_full', by: USER_INSP1, rows: [
      // GAUGE_011 (102동 지하1층 임계치 초과)
      { gp: G_('011'), d: 18, w: 0.27, ch: 0.02, ex: false, cf: 0.94 },
      { gp: G_('011'), d: 12, w: 0.48, ch: 0.21, ex: false, cf: 0.91 },
      { gp: G_('011'), d:  6, w: 0.75, ch: 0.27, ex: false, cf: 0.89 },
      { gp: G_('011'), d:  1, w: 0.94, ch: 0.19, ex: true,  cf: 0.85 },
      // GAUGE_012 (103동 1층 수리 후 안정)
      { gp: G_('012'), d:160, w: 0.20, ch:  0.05, ex: false, cf: 0.95 },
      { gp: G_('012'), d:140, w: 0.18, ch: -0.02, ex: false, cf: 0.96 },
      { gp: G_('012'), d: 30, w: 0.16, ch: -0.02, ex: false, cf: 0.97 },
      { gp: G_('012'), d:  0, w: 0.15, ch: -0.01, ex: false, cf: 0.97 },
      // GAUGE_013 (102동 북측 급속 진전 — 위험)
      { gp: G_('013'), d: 14, w: 0.55, ch: 0.05, ex: false, cf: 0.90 },
      { gp: G_('013'), d:  7, w: 1.10, ch: 0.55, ex: false, cf: 0.85 },
      { gp: G_('013'), d:  3, w: 1.68, ch: 0.58, ex: true,  cf: 0.80 },
      { gp: G_('013'), d:  0, w: 2.10, ch: 0.42, ex: true,  cf: 0.76 },
    ]},
    { prefix: 'demo_meas', by: USER_INSP1, rows: [
      // 데모 — gauge_001 임계치 초과 확인용
      { gp: G_('001'), d: 0, w: 2.4, ch: 0.58, ex: true,  cf: 0.92 },
      // 데모 — gauge_002 정상 추이용
      { gp: G_('002'), d: 0, w: 0.6, ch: 0.10, ex: false, cf: 0.88 },
    ]},
  ];

  for (const grp of measGroups) {
    for (let i = 0; i < grp.rows.length; i++) {
      const m = grp.rows[i];
      const id = `crackMeasurement:${ORG_ID}:${grp.prefix}_${String(i + 1).padStart(3, '0')}`;
      const ALERT_001 = `alert:${ORG_ID}:alert_001`;
      await upsert(org, {
        _id: id, docType: 'crackMeasurement', orgId: ORG_ID,
        complexId: COMPLEX_ID, gaugePointId: m.gp,
        measuredBy: grp.by, measuredAt: dAgo(m.d),
        capturedImageKey: `mock/crack/${id}.jpg`, roiImageKey: `mock/crack/${id}_roi.jpg`,
        measuredWidthMm: m.w, changeFromBaselineMm: m.ch,
        isManualOverride: false, autoConfidence: m.cf,
        graduationCount: Math.round(m.w * 10), scaleMmPerGraduation: 0.1,
        exceedsThreshold: m.ex,
        ...(m.ex && grp.prefix === 'meas' && { alertId: ALERT_001 }),
        notes: m.ex ? '임계치 초과 — 즉시 점검 필요' : '',
        createdAt: dAgo(m.d), updatedAt: dAgo(m.d),
        createdBy: grp.by, updatedBy: grp.by,
      });
    }
  }

  // ══ 9. 민원 (37건) ═════════════════════════════════════════════════
  console.log('\n[9] 민원');
  const allComplaints: any[] = [
    // ── seed.ts (8건) ─────────────────────────────────────────────────
    { _id: 'comp_001', bldg: BLDG_101, cat: 'SAFETY',     pri: 'URGENT', sta: 'RECEIVED',
      title: '지하주차장 기둥 균열 위험 — 즉시 조치 요청',
      desc: '지하주차장 C구역 기둥에 큰 균열이 생겼습니다. 안전이 걱정됩니다.',
      by: '입주민 김○○', phone: '010-1234-5678', unit: '101동 503호', submittedAt: dAgo(3), due: dDate(2) },
    { _id: 'comp_002', bldg: BLDG_102, cat: 'FACILITY',   pri: 'HIGH',   sta: 'ASSIGNED',
      title: '102동 외벽에서 콘크리트 조각 낙하',
      desc: '주차 중 차량 위로 콘크리트 조각이 떨어졌습니다.',
      by: '입주민 박○○', phone: '010-2345-6789', unit: '102동 201호', submittedAt: dAgo(5), due: dDate(0), assignedAt: dAgo(4) },
    { _id: 'comp_003', bldg: BLDG_101, cat: 'FACILITY',   pri: 'HIGH',   sta: 'IN_PROGRESS',
      title: '지하주차장 천장 누수로 차량 피해',
      desc: '비가 오면 지하주차장 6번 칸 위에서 물이 떨어져 차량이 젖습니다.',
      by: '입주민 이○○', phone: '010-3456-7890', unit: '101동 305호', submittedAt: dAgo(10), due: dAgo(3), assignedAt: dAgo(9), inProgressAt: dAgo(7) },
    { _id: 'comp_004', bldg: BLDG_101, cat: 'NOISE',      pri: 'MEDIUM', sta: 'ASSIGNED',
      title: '윗층 소음 — 층간소음 측정 요청',
      desc: '매일 밤 10시 이후 윗집에서 쿵쿵거리는 소리가 납니다.',
      by: '입주민 최○○', phone: '010-4567-8901', unit: '101동 802호', submittedAt: dAgo(7), due: dDate(7), assignedAt: dAgo(6) },
    { _id: 'comp_005', bldg: BLDG_101, cat: 'ELEVATOR',   pri: 'HIGH',   sta: 'RESOLVED',
      title: '엘리베이터 오작동 — 갑자기 멈춤',
      desc: '엘리베이터가 7층에서 갑자기 멈춰 30분간 갇혀 있었습니다.',
      by: '입주민 한○○', phone: '010-5678-9012', unit: '101동 701호', submittedAt: dAgo(20), due: dAgo(17),
      assignedAt: dAgo(19), inProgressAt: dAgo(18), resolvedAt: dAgo(17), resolutionNotes: '엘리베이터 제어반 점검 및 수리 완료.' },
    { _id: 'comp_006', bldg: BLDG_101, cat: 'SANITATION', pri: 'MEDIUM', sta: 'RESOLVED',
      title: '지하층 악취 발생',
      desc: '지하주차장 환기구 주변에서 악취가 납니다.',
      by: '입주민 오○○', phone: '010-6789-0123', unit: '101동 101호', submittedAt: dAgo(30), due: dAgo(23),
      assignedAt: dAgo(29), inProgressAt: dAgo(27), resolvedAt: dAgo(22), resolutionNotes: '하수관 청소 및 방향제 설치 완료.' },
    { _id: 'comp_007', bldg: BLDG_101, cat: 'PARKING',    pri: 'LOW',    sta: 'RECEIVED',
      title: '주차 구획선 희미해서 불법주차 빈번',
      desc: '지하주차장 B구역 구획선이 마모되어 주차 혼란이 있습니다.',
      by: '입주민 정○○', phone: '010-7890-1234', unit: '101동 402호', submittedAt: dAgo(2), due: dDate(12) },
    { _id: 'comp_008', bldg: BLDG_101, cat: 'FACILITY',   pri: 'MEDIUM', sta: 'IN_PROGRESS',
      title: '로비 조명 수시로 깜빡임',
      desc: '1층 로비 형광등이 깜빡여서 눈이 아픕니다.',
      by: '입주민 강○○', phone: '010-8901-2345', unit: '101동 102호', submittedAt: dAgo(6), due: dDate(4), assignedAt: dAgo(5), inProgressAt: dAgo(4) },
    // ── seeds/complaints.seed.ts (6건) ────────────────────────────────
    { _id: 'cmp_seed_001', bldg: BLDG_101, cat: 'FACILITY', pri: 'URGENT', sta: 'ASSIGNED',
      title: '3층 화장실 배관 누수',
      desc: '3층 화장실 천장에서 물이 새고 있습니다. 긴급 수리 필요합니다.',
      by: '김입주민', phone: '010-1234-5678', unit: '203호', submittedAt: dAgo(3), due: dAgo(1),
      triagedAt: dAgo(2), assignedAt: dAgo(2), classificationHint: '누수' },
    { _id: 'cmp_seed_002', bldg: BLDG_101, cat: 'SAFETY',   pri: 'HIGH',   sta: 'IN_PROGRESS',
      title: '외벽 균열 발견 (101동 3층)',
      desc: '101동 3층 외벽에 큰 균열이 있습니다. 콘크리트 조각이 떨어질 위험.',
      by: '이주민', phone: null, unit: null, submittedAt: dAgo(5), due: dDate(2),
      triagedAt: dAgo(4), assignedAt: dAgo(4), inProgressAt: dAgo(3), classificationHint: '균열' },
    { _id: 'cmp_seed_003', bldg: BLDG_102, cat: 'NOISE',    pri: 'MEDIUM', sta: 'OPEN',
      title: '층간 소음 심각 (새벽 시간대)',
      desc: '윗집에서 새벽 2~3시 사이에 심한 소음이 발생합니다.',
      by: '박입주', phone: '010-9876-5432', unit: '501호', submittedAt: dAgo(1), due: dDate(7), classificationHint: '소음' },
    { _id: 'cmp_seed_004', bldg: null,     cat: 'FACILITY', pri: 'HIGH',   sta: 'TRIAGED',
      title: '지하 주차장 조명 불량 (A구역)',
      desc: '지하 주차장 A구역 조명 5개 중 3개가 소등 상태입니다.',
      by: '최관리', phone: null, unit: null, submittedAt: dAgo(2), due: dDate(3),
      triagedAt: dAgo(1), aiSuggestion: '전기 설비 점검 필요 — 공용부 조명 교체 작업지시 권장', classificationHint: '공용부 파손' },
    { _id: 'cmp_seed_005', bldg: BLDG_101, cat: 'FACILITY', pri: 'MEDIUM', sta: 'RESOLVED',
      title: '현관문 잠금장치 고장',
      desc: '현관 도어록 배터리 교체 후에도 인식이 되지 않습니다.',
      by: '정입주', phone: null, unit: '102호', submittedAt: dAgo(10), due: dAgo(8),
      assignedAt: dAgo(9), inProgressAt: dAgo(8), resolvedAt: dAgo(7), resolutionNotes: '도어록 교체 완료. Samsung SHS-2920.' },
    { _id: 'cmp_seed_006', bldg: BLDG_102, cat: 'ELEVATOR', pri: 'HIGH',   sta: 'CLOSED',
      title: '엘리베이터 오작동 (2호기)',
      desc: '2호기 엘리베이터가 3층에서 문이 열리지 않는 현상이 발생합니다.',
      by: '강입주', phone: null, unit: '301호', submittedAt: dAgo(20), due: dAgo(18),
      assignedAt: dAgo(19), inProgressAt: dAgo(18), resolvedAt: dAgo(17), closedAt: dAgo(15),
      resolutionNotes: '엘리베이터 안전 센서 교체 및 정비 완료.', satisfactionScore: 5 },
    // ── seed-extra.ts (10건) ───────────────────────────────────────────
    { _id: 'comp_ex_001', bldg: BLDG_103, cat: 'SAFETY',     pri: 'URGENT', sta: 'ASSIGNED',
      title: '103동 계단 난간 파손 — 낙상 위험',
      desc: '103동 3층 계단 난간이 흔들리고 일부 볼트가 빠져있어 위험합니다.',
      by: '입주민 황○○', phone: '010-1111-2222', unit: '103동 302호', submittedAt: dAgo(1), due: dDate(1), assignedAt: dAgo(0) },
    { _id: 'comp_ex_002', bldg: BLDG_102, cat: 'FACILITY',   pri: 'HIGH',   sta: 'IN_PROGRESS',
      title: '102동 지하주차장 천장 누수 — 차량 피해',
      desc: '102동 지하주차장 B구역 14번 칸 천장에서 빗물이 새어 차량 실내가 물에 젖었습니다.',
      by: '입주민 남○○', phone: '010-2222-3333', unit: '102동 504호', submittedAt: dAgo(4), due: dDate(1), assignedAt: dAgo(3), inProgressAt: dAgo(2) },
    { _id: 'comp_ex_003', bldg: BLDG_103, cat: 'ELEVATOR',   pri: 'HIGH',   sta: 'RECEIVED',
      title: '103동 엘리베이터 버튼 3개 고장',
      desc: '103동 엘리베이터 내부 4층, 7층, 옥상 버튼이 눌리지 않습니다.',
      by: '입주민 서○○', phone: '010-3333-4444', unit: '103동 801호', submittedAt: dAgo(0), due: dDate(3) },
    { _id: 'comp_ex_004', bldg: BLDG_101, cat: 'FACILITY',   pri: 'MEDIUM', sta: 'RESOLVED',
      title: '101동 현관 자동문 센서 오작동',
      desc: '현관 자동문이 사람이 없어도 계속 열렸다 닫혔다를 반복합니다.',
      by: '입주민 문○○', phone: '010-4444-5555', unit: '101동 201호', submittedAt: dAgo(15), due: dAgo(12),
      assignedAt: dAgo(14), inProgressAt: dAgo(12), resolvedAt: dAgo(11), resolutionNotes: '자동문 적외선 센서 교체 완료.' },
    { _id: 'comp_ex_005', bldg: BLDG_101, cat: 'NOISE',      pri: 'MEDIUM', sta: 'ASSIGNED',
      title: '지하주차장 환기팬 소음 — 새벽 시간대',
      desc: '새벽 1~3시에 지하주차장 환기팬에서 심한 소음이 납니다.',
      by: '입주민 조○○', phone: '010-5555-6666', unit: '101동 102호', submittedAt: dAgo(6), due: dDate(4), assignedAt: dAgo(5) },
    { _id: 'comp_ex_006', bldg: BLDG_102, cat: 'SANITATION', pri: 'LOW',    sta: 'RECEIVED',
      title: '102동 쓰레기 분리수거장 악취',
      desc: '더운 날씨에 분리수거장에서 악취가 심하게 납니다.',
      by: '입주민 윤○○', phone: '010-6666-7777', unit: '102동 101호', submittedAt: dAgo(2), due: dDate(7) },
    { _id: 'comp_ex_007', bldg: BLDG_103, cat: 'SAFETY',     pri: 'HIGH',   sta: 'IN_PROGRESS',
      title: '103동 옥상 방수층 균열 — 누수 우려',
      desc: '옥상 바닥 방수층에 균열이 여러 곳 생겼습니다.',
      by: '입주민 장○○', phone: '010-7777-8888', unit: '103동 901호', submittedAt: dAgo(8), due: dDate(2), assignedAt: dAgo(7), inProgressAt: dAgo(5) },
    { _id: 'comp_ex_008', bldg: BLDG_102, cat: 'PARKING',    pri: 'MEDIUM', sta: 'RESOLVED',
      title: '장애인 주차구역 불법주차 반복',
      desc: '장애인 전용 주차구역에 일반 차량이 반복적으로 주차합니다.',
      by: '입주민 임○○', phone: '010-8888-9999', unit: '102동 301호', submittedAt: dAgo(25), due: dAgo(18),
      assignedAt: dAgo(24), inProgressAt: dAgo(22), resolvedAt: dAgo(17), resolutionNotes: '장애인 주차구역 안내 표지판 추가 설치 완료.' },
    { _id: 'comp_ex_009', bldg: BLDG_101, cat: 'FACILITY',   pri: 'HIGH',   sta: 'ASSIGNED',
      title: '101동 급수관 누수 — 수압 저하',
      desc: '최근 일주일간 아침 시간대에 수압이 크게 낮아졌습니다.',
      by: '입주민 권○○', phone: '010-9999-0000', unit: '101동 602호', submittedAt: dAgo(3), due: dDate(2), assignedAt: dAgo(2) },
    { _id: 'comp_ex_010', bldg: BLDG_102, cat: 'SAFETY',     pri: 'MEDIUM', sta: 'RECEIVED',
      title: '외부 산책로 바닥 타일 들뜸 — 걸려 넘어짐 위험',
      desc: '단지 내 산책로 타일이 여러 곳 들떠 있어 걸려 넘어질 위험이 있습니다.',
      by: '입주민 배○○', phone: '010-0000-1111', unit: '102동 401호', submittedAt: dAgo(1), due: dDate(10) },
    // ── seed-full.ts (10건) ───────────────────────────────────────────
    { _id: 'comp_full_001', bldg: BLDG_102, cat: 'SAFETY',     pri: 'URGENT', sta: 'IN_PROGRESS',
      title: '102동 북측 외벽 대형 균열 — 추락 위험',
      desc: '102동 북측 외벽 8~12층에 큰 균열이 생겼고 조각이 떨어질 것 같습니다.',
      by: '입주민 곽○○', phone: '010-1010-2020', unit: '102동 1201호', submittedAt: dAgo(5), due: dDate(0), assignedAt: dAgo(4), inProgressAt: dAgo(3) },
    { _id: 'comp_full_002', bldg: BLDG_101, cat: 'FACILITY',   pri: 'HIGH',   sta: 'RESOLVED',
      title: '101동 보일러 소음으로 수면 방해',
      desc: '새벽 2~5시 보일러 소음이 너무 심합니다.',
      by: '입주민 마○○', phone: '010-2020-3030', unit: '101동 1501호', submittedAt: dAgo(90), due: dAgo(85),
      assignedAt: dAgo(89), inProgressAt: dAgo(87), resolvedAt: dAgo(82), resolutionNotes: '팽창탱크 내부 부품 교체. 소음 해소 확인.' },
    { _id: 'comp_full_003', bldg: BLDG_103, cat: 'ELEVATOR',   pri: 'HIGH',   sta: 'CLOSED',
      title: '103동 엘리베이터 1호기 진동 및 이상음',
      desc: '103동 엘리베이터 1호기가 운행 중 심하게 진동하고 금속 마찰음이 납니다.',
      by: '입주민 나○○', phone: '010-3030-4040', unit: '103동 401호', submittedAt: dAgo(120), due: dAgo(115),
      assignedAt: dAgo(119), inProgressAt: dAgo(117), resolvedAt: dAgo(112), closedAt: dAgo(108),
      resolutionNotes: '엘리베이터 가이드 레일 오일 주입 및 조정 완료.', satisfactionScore: 4 },
    { _id: 'comp_full_004', bldg: BLDG_103, cat: 'FACILITY',   pri: 'MEDIUM', sta: 'RECEIVED',
      title: '103동 옥상 방수 불량 — 10층 천장 누수',
      desc: '비가 올 때마다 10층 거실 천장에서 물이 새어 벽지가 다 상했습니다.',
      by: '입주민 표○○', phone: '010-4040-5050', unit: '103동 1001호', submittedAt: dAgo(2), due: dDate(8) },
    { _id: 'comp_full_005', bldg: BLDG_101, cat: 'NOISE',      pri: 'LOW',    sta: 'RECEIVED',
      title: '주차장 차량 배기 소음 — 지하층 거주민 민원',
      desc: '야간 차량 시동 소리가 지하주차장을 통해 1층까지 크게 울립니다.',
      by: '입주민 채○○', phone: '010-5050-6060', unit: '101동 103호', submittedAt: dAgo(7), due: dDate(14) },
    { _id: 'comp_full_006', bldg: BLDG_102, cat: 'PARKING',    pri: 'MEDIUM', sta: 'ASSIGNED',
      title: '장애인 주차구역 경사로 파손',
      desc: '장애인 주차구역 진입 경사로 아스팔트가 파여 휠체어 진입이 어렵습니다.',
      by: '입주민 천○○', phone: '010-6060-7070', unit: '102동 201호', submittedAt: dAgo(10), due: dDate(5), assignedAt: dAgo(9) },
    { _id: 'comp_full_007', bldg: BLDG_102, cat: 'SANITATION', pri: 'HIGH',   sta: 'IN_PROGRESS',
      title: '102동 지하주차장 하수구 역류 — 악취·오물',
      desc: '비가 오면 지하주차장 하수구가 역류해 오물이 넘칩니다.',
      by: '입주민 탁○○', phone: '010-7070-8080', unit: '102동 101호', submittedAt: dAgo(8), due: dDate(1), assignedAt: dAgo(7), inProgressAt: dAgo(6) },
    { _id: 'comp_full_008', bldg: BLDG_101, cat: 'FACILITY',   pri: 'MEDIUM', sta: 'TRIAGED',
      title: '101동 공용 복도 LED 조명 교체 요청',
      desc: '복도 형광등이 너무 어두워서 야간에 불편합니다.',
      by: '입주민 판○○', phone: '010-8080-9090', unit: '101동 801호', submittedAt: dAgo(14), due: dDate(20),
      triagedAt: dAgo(13), aiSuggestion: '전기설비 교체 작업지시 권장.' },
    { _id: 'comp_full_009', bldg: BLDG_103, cat: 'SAFETY',     pri: 'HIGH',   sta: 'ASSIGNED',
      title: '103동 지하층 바닥 침수·결빙 — 미끄럼 낙상 위험',
      desc: '겨울철 지하층 바닥이 얼어서 미끄럽습니다.',
      by: '입주민 하○○', phone: '010-9090-0101', unit: '103동 102호', submittedAt: dAgo(3), due: dDate(2), assignedAt: dAgo(2) },
    { _id: 'comp_full_010', bldg: BLDG_101, cat: 'FACILITY',   pri: 'MEDIUM', sta: 'RESOLVED',
      title: '101동 우편함 자물쇠 파손',
      desc: '101동 현관 우편함 자물쇠가 파손되어 우편물 도난 우려가 있습니다.',
      by: '입주민 홍○○', phone: '010-0101-1212', unit: '101동 305호', submittedAt: dAgo(40), due: dAgo(35),
      assignedAt: dAgo(39), inProgressAt: dAgo(37), resolvedAt: dAgo(36), resolutionNotes: '우편함 자물쇠 10개 일괄 교체 완료.' },
    // ── seeds/demo.seed.ts (3건) ───────────────────────────────────────
    { _id: 'demo_cmp_01', bldg: BLDG_101, cat: 'FACILITY',   pri: 'HIGH',   sta: 'RESOLVED',
      title: '[데모] 화장실 누수',
      desc: '화장실 천장에서 물이 새고 있습니다.',
      by: '김민준', phone: '010-2345-6789', unit: '201호', submittedAt: dAgo(5), due: dAgo(1),
      assignedAt: dAgo(4), inProgressAt: dAgo(3), resolvedAt: dAgo(2), resolutionNotes: '상층부 배관 이음 불량 교체 완료.', satisfactionScore: 5 },
    { _id: 'demo_cmp_02', bldg: BLDG_101, cat: 'ELEVATOR',   pri: 'MEDIUM', sta: 'IN_PROGRESS',
      title: '[데모] 엘리베이터 이상 소음',
      desc: '엘리베이터 운행 시 삐걱거리는 소음 발생',
      by: '이수진', phone: '010-3456-7890', unit: '305호', submittedAt: dAgo(2), due: dDate(3), assignedAt: dAgo(1), inProgressAt: dAgo(1) },
    { _id: 'demo_cmp_03', bldg: BLDG_101, cat: 'NOISE',      pri: 'MEDIUM', sta: 'RECEIVED',
      title: '[데모] 층간소음 민원',
      desc: '평일 저녁 윗집 걸음 소리로 수면장애 발생',
      by: '박서연', phone: '010-4567-8901', unit: '102호', submittedAt: dAgo(0), due: dDate(7) },
  ];

  for (const c of allComplaints) {
    const id = `complaint:${ORG_ID}:${c._id}`;
    const tl = buildTimeline({ ...c, submittedAt: c.submittedAt });
    await upsert(org, {
      _id: id, docType: 'complaint', orgId: ORG_ID, complexId: COMPLEX_ID,
      buildingId: c.bldg ?? null,
      category: c.cat, status: c.sta, priority: c.pri,
      title: c.title, description: c.desc,
      submittedBy: c.by, submittedPhone: c.phone ?? null,
      unitNumber: c.unit ?? null, submittedAt: c.submittedAt,
      dueDate: c.due,
      ...(c.assignedAt  && { assignedTo: USER_CMGR, assignedAt: c.assignedAt }),
      ...(c.resolvedAt  && { resolvedAt: c.resolvedAt, resolutionNotes: c.resolutionNotes }),
      ...(c.closedAt    && { closedAt: c.closedAt }),
      ...(c.satisfactionScore && { satisfactionScore: c.satisfactionScore }),
      ...(c.aiSuggestion      && { aiSuggestion: c.aiSuggestion }),
      ...(c.classificationHint && { classificationHint: c.classificationHint }),
      mediaIds: [], timeline: tl,
      createdAt: c.submittedAt, updatedAt: now, createdBy: 'system', updatedBy: USER_CMGR,
    });
  }

  // ══ 10. 작업지시 (12건) ═════════════════════════════════════════════
  console.log('\n[10] 작업지시');
  const woTimeline = (sta: string, created: number, started?: number, completed?: number) => {
    const tl: any[] = [{ timestamp: dAgo(created), fromStatus: null, toStatus: 'OPEN', actorId: USER_ADMIN, notes: '작업지시 생성' }];
    if (started !== undefined) tl.push({ timestamp: dAgo(started), fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actorId: USER_INSP1, notes: '현장 조치 시작' });
    if (completed !== undefined) tl.push({ timestamp: dAgo(completed), fromStatus: 'IN_PROGRESS', toStatus: 'COMPLETED', actorId: USER_INSP1, notes: '조치 완료' });
    return tl;
  };
  const workOrders = [
    // seeds/complaints.seed.ts (2건)
    { _id: 'wo_seed_001', bldg: BLDG_101, comp: 'cmp_seed_002', def: null,
      title: '101동 3층 외벽 균열 긴급 점검 및 보수',
      desc: '균열 범위 측정 후 에폭시 주입 보수. 위험 구역 안전 테이프 설치.',
      assigned: USER_INSP1, sched: dDate(1), sta: 'IN_PROGRESS', pri: 'HIGH', est: 850000,
      created: 3, started: 2 },
    { _id: 'wo_seed_002', bldg: BLDG_101, comp: 'cmp_seed_001', def: null,
      title: '3층 화장실 배관 누수 긴급 수리',
      desc: '누수 배관 교체 및 실링 처리.',
      assigned: USER_INSP1, sched: dDate(0), sta: 'OPEN', pri: 'URGENT', est: 400000, vendor: '(주)한국배관공사',
      created: 1 },
    // seed-full.ts (10건)
    { _id: 'wo_full_001', bldg: BLDG_102, comp: 'comp_full_001', def: 'def_f15',
      title: '102동 북측 외벽 구조균열 긴급 보강 및 안전 통제',
      desc: '크랙 범위 측정 후 에폭시 주입 + 위험 구역 안전 펜스 설치.',
      assigned: USER_INSP1, sched: dDate(1), sta: 'IN_PROGRESS', pri: 'URGENT', est: 4500000, vendor: '(주)한국구조안전연구소',
      created: 5, started: 2 },
    { _id: 'wo_full_002', bldg: BLDG_102, comp: 'comp_full_007', def: null,
      title: '102동 지하주차장 하수구 준설 및 역류 방지',
      desc: '하수구 3개소 준설 및 역류 방지 밸브 설치.',
      assigned: USER_INSP2, sched: dDate(2), sta: 'OPEN', pri: 'HIGH', est: 1800000, vendor: '한국환경서비스(주)',
      created: 6 },
    { _id: 'wo_full_003', bldg: BLDG_103, comp: 'comp_full_004', def: 'def_f03',
      title: '103동 옥상 방수층 긴급 보수',
      desc: '방수층 균열 부위 우레탄 방수재 도포.',
      assigned: USER_INSP1, sched: dDate(5), sta: 'OPEN', pri: 'HIGH', est: 3200000, vendor: '(주)방수전문건설',
      created: 1 },
    { _id: 'wo_full_004', bldg: BLDG_102, comp: 'comp_full_006', def: null,
      title: '102동 장애인 주차구역 경사로 아스팔트 보수',
      desc: '경사로 파손 구간 아스팔트 포장 복구.',
      assigned: USER_INSP2, sched: dDate(7), sta: 'OPEN', pri: 'MEDIUM', est: 850000,
      created: 8 },
    { _id: 'wo_full_005', bldg: BLDG_101, comp: 'comp_full_002', def: 'def_f09',
      title: '101동 옥상 보일러실 팽창탱크 점검·교체',
      desc: '팽창탱크 내부 다이어프램 교체 및 계통 점검.',
      assigned: USER_INSP1, sched: dAgo(184), sta: 'COMPLETED', pri: 'MEDIUM', est: 1200000, actual: 980000, vendor: '(주)성진기계설비',
      actionNotes: '팽창탱크 다이어프램 교체 완료. 소음 해소 및 수압 정상 확인.',
      created: 190, started: 184, completed: 182 },
    { _id: 'wo_full_006', bldg: BLDG_103, comp: 'comp_full_003', def: null,
      title: '103동 엘리베이터 1호기 가이드 레일 정비',
      desc: '가이드 레일 오일 주입, 상태 점검, 진동 원인 제거.',
      assigned: USER_INSP2, sched: dAgo(114), sta: 'COMPLETED', pri: 'HIGH', est: 550000, actual: 480000, vendor: '현대엘리베이터(주)',
      actionNotes: '레일 오일 주입 완료. 이상음 및 진동 소멸 확인.',
      created: 120, started: 115, completed: 112 },
    { _id: 'wo_full_007', bldg: BLDG_102, comp: null, def: 'def_f05',
      title: '102동 지하1층 기둥 사선 균열 에폭시 주입',
      desc: '균열 세척 → 에폭시 주입 → 표면 마감. B-3, B-4, B-5 기둥.',
      assigned: USER_INSP1, sched: dDate(10), sta: 'OPEN', pri: 'HIGH', est: 2100000, vendor: '(주)한국보수전문',
      created: 5 },
    { _id: 'wo_full_008', bldg: BLDG_103, comp: 'comp_full_009', def: 'def_f02',
      title: '103동 지하1층 방수 공사 및 배수 개선',
      desc: '서측 벽체 방수층 재시공 + 바닥 경사 정비',
      assigned: USER_INSP2, sched: dDate(15), sta: 'OPEN', pri: 'HIGH', est: 5600000, vendor: '(주)방수전문건설',
      created: 2 },
    { _id: 'wo_full_009', bldg: BLDG_101, comp: 'comp_full_008', def: null,
      title: '101동 공용 복도 형광등 → LED 교체',
      desc: '전 동 공용 복도 형광등 LED 교체 (총 80개 교체 예상)',
      assigned: USER_INSP1, sched: dDate(12), sta: 'OPEN', pri: 'MEDIUM', est: 2400000,
      created: 12 },
    { _id: 'wo_full_010', bldg: BLDG_103, comp: null, def: 'def_f14',
      title: '103동 외벽 창틀 부식 도장 및 코킹 보수',
      desc: '남측 1~5층 창틀 부식 부위 녹 제거 → 방청 도장 → 코킹 재시공',
      assigned: USER_INSP2, sched: dDate(25), sta: 'OPEN', pri: 'MEDIUM', est: 3800000,
      created: 3 },
  ];
  for (const wo of workOrders) {
    await upsert(org, {
      _id: `workOrder:${ORG_ID}:${wo._id}`, docType: 'workOrder', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: wo.bldg,
      ...(wo.comp && { complaintId: `complaint:${ORG_ID}:${wo.comp}` }),
      ...(wo.def  && { defectId: `defect:${ORG_ID}:${wo.def}` }),
      title: wo.title, description: wo.desc,
      assignedTo: wo.assigned, scheduledDate: wo.sched,
      status: wo.sta, priority: wo.pri,
      estimatedCost: wo.est,
      ...(wo.actual      && { actualCost: wo.actual }),
      ...(wo.vendor      && { vendor: wo.vendor }),
      ...(wo.actionNotes && { actionNotes: wo.actionNotes }),
      ...(wo.started !== undefined    && { startedAt:   dAgo(wo.started) }),
      ...(wo.completed !== undefined  && { completedAt: dAgo(wo.completed) }),
      mediaIds: [],
      timeline: woTimeline(wo.sta, wo.created, wo.started, wo.completed),
      createdAt: dAgo(wo.created), updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ══ 11. 일정 (16건) ════════════════════════════════════════════════
  console.log('\n[11] 일정');
  const schedules = [
    // seed.ts (4건)
    { _id: 'sched_001', type: 'REGULAR_INSPECTION', rec: 'ANNUALLY',  title: '연간 정기 안전점검 (봄)',              next: dDate(75),  last: '2025-03-28', proj: 'proj_2025_r1' },
    { _id: 'sched_002', type: 'REGULAR_INSPECTION', rec: 'ANNUALLY',  title: '연간 정기 안전점검 (가을)',            next: dDate(15),  last: dDate(-365) },
    { _id: 'sched_003', type: 'MAINTENANCE',        rec: 'QUARTERLY', title: '소방 설비 점검',                       next: dDate(8),   last: dDate(-83) },
    { _id: 'sched_004', type: 'CONTRACT_RENEWAL',   rec: 'ANNUALLY',  title: '시설물 안전관리 용역 계약 갱신',       next: dDate(-5),  last: '2025-01-01' }, // 기한초과!
    // seed-full.ts (12건)
    { _id: 'sched_full_001', type: 'REGULAR_INSPECTION', rec: 'QUARTERLY', title: '분기별 공용부 일제 점검 (101동)', next: dFwd(15), last: dAgo(77), proj: 'proj_2026_r1' },
    { _id: 'sched_full_002', type: 'REGULAR_INSPECTION', rec: 'QUARTERLY', title: '분기별 공용부 일제 점검 (102동)', next: dFwd(15), last: dAgo(77) },
    { _id: 'sched_full_003', type: 'REGULAR_INSPECTION', rec: 'QUARTERLY', title: '분기별 공용부 일제 점검 (103동)', next: dFwd(15), last: dAgo(77) },
    { _id: 'sched_full_004', type: 'MAINTENANCE',        rec: 'MONTHLY',   title: '월간 엘리베이터 정기 점검 (3개 동)', next: dFwd(8), last: dAgo(23) },
    { _id: 'sched_full_005', type: 'FIRE_SAFETY',        rec: 'ANNUALLY',  title: '소방설비 정기점검 (상반기)', next: dFwd(90), last: dAgo(198), proj: 'proj_2025_fire' },
    { _id: 'sched_full_006', type: 'MAINTENANCE',        rec: 'WEEKLY',    title: '주간 균열 게이지 순회 점검', next: dFwd(4), last: dAgo(3) },
    { _id: 'sched_full_007', type: 'CONTRACT_RENEWAL',   rec: 'ANNUALLY',  title: '엘리베이터 유지보수 계약 갱신', next: dFwd(45), last: dAgo(320) },
    { _id: 'sched_full_008', type: 'MAINTENANCE',        rec: 'QUARTERLY', title: '급수·배수 배관 정기 점검', next: dFwd(20), last: dAgo(72) },
    { _id: 'sched_full_009', type: 'REGULAR_INSPECTION', rec: 'ANNUALLY',  title: '전기 설비 정기 검사 (한국전기안전공사)', next: dFwd(60), last: dAgo(305) },
    { _id: 'sched_full_010', type: 'MAINTENANCE',        rec: 'ONCE',      title: '102동 구조안전 정밀진단 착수', next: dFwd(3), proj: 'proj_2026_spe' },
    { _id: 'sched_full_011', type: 'REGULAR_INSPECTION', rec: 'ANNUALLY',  title: '단지 내 CCTV 카메라 정기 점검', next: dDate(35), last: dAgo(330) },
    { _id: 'sched_full_012', type: 'CONTRACT_RENEWAL',   rec: 'ANNUALLY',  title: '청소용역 계약 갱신', next: dFwd(-8), last: dAgo(373) }, // 기한초과!
  ];
  for (const s of schedules) await upsert(org, {
    _id: `schedule:${ORG_ID}:${s._id}`, docType: 'schedule', orgId: ORG_ID, complexId: COMPLEX_ID,
    title: s.title, scheduleType: s.type, recurrence: s.rec,
    nextOccurrence: s.next,
    ...(s.last && { lastOccurrence: s.last }),
    ...(s.proj && { linkedProjectId: `inspectionProject:${ORG_ID}:${s.proj}` }),
    assignedTo: [USER_INSP1, USER_ADMIN], isActive: true, overdueAlertDays: 7,
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ══ 12. 경보 (23건) ════════════════════════════════════════════════
  console.log('\n[12] 경보');
  const alerts = [
    // seed.ts (7건)
    { _id: 'alert_001', type: 'CRACK_THRESHOLD', sev: 'CRITICAL', sta: 'ACTIVE',
      title: '[긴급] GP-B2-C3-N 균열 임계치 초과 (1.82mm)',
      msg: '101동 지하2층 C-3 기둥 균열폭이 임계치(1.0mm)를 83% 초과했습니다.',
      entType: 'crackGaugePoint', entId: 'gauge_001', at: dAgo(3) },
    { _id: 'alert_002', type: 'DEFECT_CRITICAL', sev: 'CRITICAL', sta: 'ACTIVE',
      title: '[긴급] 102동 외벽 콘크리트 박락 — 낙하 위험',
      msg: '102동 남측 외벽 5~7층 구간 콘크리트 박락(면적 4.2m²). 보행자 통로 즉시 통제 권고.',
      entType: 'defect', entId: 'def_009', at: dAgo(3) },
    { _id: 'alert_003', type: 'DEFECT_CRITICAL', sev: 'CRITICAL', sta: 'ACKNOWLEDGED',
      title: '[긴급] 102동 외벽-슬래브 접합부 균열 1.2mm',
      msg: '102동 동측 외벽 6층 슬래브 접합부 균열폭 1.2mm 측정.',
      entType: 'defect', entId: 'def_011', at: dAgo(3), ackBy: USER_REVIEWER, ackAt: dAgo(2) },
    { _id: 'alert_004', type: 'CRACK_THRESHOLD', sev: 'HIGH', sta: 'ACTIVE',
      title: 'GP-102-S5F 균열 임계치 초과 (1.15mm)',
      msg: '102동 남측 외벽 5층 균열폭이 임계치(1.0mm)를 초과했습니다.',
      entType: 'crackGaugePoint', entId: 'gauge_004', at: dAgo(0) },
    { _id: 'alert_005', type: 'CRACK_THRESHOLD', sev: 'HIGH', sta: 'ACTIVE',
      title: 'GP-102-E6F 균열 급격 진전 (1.48mm)',
      msg: '102동 동측 6층 슬래브 접합부 균열이 최근 5일간 0.96mm 증가했습니다.',
      entType: 'crackGaugePoint', entId: 'gauge_005', at: dAgo(0) },
    { _id: 'alert_006', type: 'COMPLAINT_OVERDUE', sev: 'HIGH', sta: 'ACTIVE',
      title: '민원 처리 기한 초과 — 지하주차장 누수',
      msg: '민원 comp_003 (지하주차장 누수) 처리 기한이 3일 경과했습니다.',
      entType: 'complaint', entId: 'comp_003', at: dAgo(2) },
    { _id: 'alert_007', type: 'INSPECTION_OVERDUE', sev: 'MEDIUM', sta: 'ACTIVE',
      title: '2025년 2차 점검 — 102동 세션 미착수',
      msg: '2025년 2차 정기점검 102동 세션이 계획일 경과 후에도 미착수 상태입니다.',
      entType: 'inspectionProject', entId: 'proj_2025_r2', at: dAgo(5) },
    // seed-extra.ts (5건)
    { _id: 'alert_ex_001', type: 'CRACK_THRESHOLD', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] GP-103-B1-W 균열 임계치 초과 (0.93mm)',
      msg: '103동 지하1층 서측 벽체 균열폭이 임계치(0.8mm)를 초과했습니다.',
      entType: 'crackGaugePoint', entId: 'gauge_006', at: dAgo(0) },
    { _id: 'alert_ex_002', type: 'CRACK_THRESHOLD', sev: 'CRITICAL', sta: 'ACTIVE',
      title: '[긴급] GP-102-RF-C 균열 급진전 (1.38mm) — 옥상 슬래브',
      msg: '102동 옥상 슬래브 균열이 2일간 0.26mm 급진전. 즉각 점검 필요.',
      entType: 'crackGaugePoint', entId: 'gauge_007', at: dAgo(0) },
    { _id: 'alert_ex_003', type: 'COMPLAINT_OVERDUE', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] 기한초과 민원 2건 — 즉시 처리 필요',
      msg: '민원 처리 기한이 초과된 건이 2건 있습니다.',
      entType: 'complaint', entId: 'comp_003', at: dAgo(1) },
    { _id: 'alert_ex_004', type: 'INSPECTION_OVERDUE', sev: 'MEDIUM', sta: 'ACKNOWLEDGED',
      title: '[보통] 103동 정기점검 일정 도래 (7일 후)',
      msg: '103동 반기 정기안전점검 예정일이 7일 후입니다.',
      entType: 'schedule', entId: 'sched_001', at: dAgo(0), ackBy: USER_ADMIN, ackAt: dAgo(0) },
    { _id: 'alert_ex_005', type: 'DEFECT_CRITICAL', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] 103동 난간 파손 — 입주민 안전사고 위험',
      msg: '103동 3층 계단 난간 파손 민원 접수. 긴급 조치 및 현장 통제 권고.',
      entType: 'complaint', entId: 'comp_ex_001', at: dAgo(1) },
    // seed-full.ts (10건)
    { _id: 'alert_full_001', type: 'CRACK_THRESHOLD', sev: 'CRITICAL', sta: 'ACTIVE',
      title: '[긴급] GP-102-N8F 구조균열 2.10mm — 즉각 대피 검토',
      msg: '102동 북측 외벽 8~12층 균열 2.10mm(임계치 1.5mm 초과). 전문가 긴급 출동 필요.',
      entType: 'crackGaugePoint', entId: 'gauge_013', at: dAgo(1) },
    { _id: 'alert_full_002', type: 'DEFECT_CRITICAL', sev: 'CRITICAL', sta: 'ACTIVE',
      title: '[긴급] 102동 북측 외벽 구조균열 — 낙하 위험',
      msg: '102동 북측 외벽 8~12층 구조균열 2.1mm(진행형). 보행자 안전 통제 즉시 시행.',
      entType: 'defect', entId: 'def_f15', at: dAgo(1) },
    { _id: 'alert_full_003', type: 'CRACK_THRESHOLD', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] GP-102-B1-N 균열 0.94mm 임계치 초과',
      msg: '102동 지하1층 북측 벽체 균열이 임계치(0.9mm)를 초과했습니다.',
      entType: 'crackGaugePoint', entId: 'gauge_011', at: dAgo(1) },
    { _id: 'alert_full_004', type: 'COMPLAINT_OVERDUE', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] 기한초과 민원 3건 — 즉시 처리 요망',
      msg: '처리 기한을 초과한 민원이 3건 있습니다.',
      entType: 'complaint', entId: 'comp_full_001', at: dAgo(0) },
    { _id: 'alert_full_005', type: 'INSPECTION_OVERDUE', sev: 'MEDIUM', sta: 'ACTIVE',
      title: '[보통] 청소용역 계약 갱신 기한 8일 초과',
      msg: '청소용역 계약 갱신 일정(sched_full_012)이 8일 초과됐습니다.',
      entType: 'schedule', entId: 'sched_full_012', at: dAgo(0) },
    { _id: 'alert_full_006', type: 'RPA_FAILURE', sev: 'MEDIUM', sta: 'ACKNOWLEDGED',
      title: '[보통] RPA 관리비 고지서 생성 일부 실패',
      msg: '3월분 관리비 고지서 자동 생성 시 5건 처리 오류 발생.',
      entType: 'rpaTask', entId: 'rpa_full_002', at: dAgo(6), ackBy: USER_ADMIN, ackAt: dAgo(5) },
    { _id: 'alert_full_007', type: 'INSPECTION_OVERDUE', sev: 'MEDIUM', sta: 'RESOLVED',
      title: '[완료] 2026년 상반기 점검 계획 수립 촉구',
      msg: '2026년 상반기 정기안전점검 계획이 기한 내 수립됐습니다.',
      entType: 'inspectionProject', entId: 'proj_2026_r1', at: dAgo(12), resAt: dAgo(5), resBy: USER_ADMIN },
    { _id: 'alert_full_008', type: 'CONTRACT_EXPIRY', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] 소방설비 점검 계약 만료 45일 전',
      msg: '소방설비 유지보수 계약이 45일 후 만료됩니다.',
      entType: 'schedule', entId: 'sched_full_005', at: dAgo(0) },
    { _id: 'alert_full_009', type: 'DRONE_DEFECT', sev: 'HIGH', sta: 'ACTIVE',
      title: '[높음] 드론 AI — 103동 외벽 박락 의심 탐지',
      msg: '드론 비전 AI가 103동 남측 외벽 3층에서 콘크리트 박락 의심 구간을 탐지했습니다.',
      entType: 'droneMission', entId: 'drone_001', at: dAgo(2) },
    { _id: 'alert_full_010', type: 'DEFECT_CRITICAL', sev: 'HIGH', sta: 'ACKNOWLEDGED',
      title: '[높음] 102동 지하1층 천장 누수 — 차량 피해 지속',
      msg: '102동 지하1층 천장 누수 4개소 작업지시 미착수 상태.',
      entType: 'defect', entId: 'def_f06', at: dAgo(5), ackBy: USER_CMGR, ackAt: dAgo(3) },
    // demo.seed.ts (1건)
    { _id: 'demo_alert_crack_01', type: 'CRACK_THRESHOLD', sev: 'HIGH', sta: 'ACTIVE',
      title: '[데모] 균열 게이지 001 임계치 초과',
      msg: '균열 게이지 001 최신 측정값 2.4mm — 임계치(2.0mm) 초과',
      entType: 'crackGaugePoint', entId: 'gauge_001', at: dAgo(0) },
  ];
  for (const a of alerts) {
    const entSuffix = ['inspectionProject','schedule','complaint','defect','crackGaugePoint','rpaTask','droneMission'].includes(a.entType)
      ? `${a.entType}:${ORG_ID}:${a.entId}` : a.entId;
    await upsert(org, {
      _id: `alert:${ORG_ID}:${a._id}`, docType: 'alert', orgId: ORG_ID, complexId: COMPLEX_ID,
      alertType: a.type, severity: a.sev, status: a.sta,
      title: a.title, message: a.msg,
      sourceEntityType: a.entType, sourceEntityId: entSuffix,
      isRead: a.sta !== 'ACTIVE', assignedTo: [USER_ADMIN, USER_REVIEWER],
      ...(a.ackBy && { acknowledgedBy: a.ackBy, acknowledgedAt: a.ackAt }),
      ...(a.resAt && { resolvedAt: a.resAt, resolvedBy: a.resBy }),
      createdAt: a.at, updatedAt: now, createdBy: 'system', updatedBy: 'system',
    });
  }

  // ══ 13. 보고서 (9건) ════════════════════════════════════════════════
  console.log('\n[13] 보고서');
  const reports = [
    { _id: 'rpt_full_001', type: 'INSPECTION_RESULT', title: '2025년 1차 정기안전점검 결과 보고서', proj: 'proj_2025_r1', by: USER_REVIEWER, at: dAgo(355), key: 'reports/rpt_full_001.pdf', sz: 2048576, pub: true },
    { _id: 'rpt_full_002', type: 'DEFECT_LIST',       title: '2025년 결함 현황 목록 (전 동)',      proj: null,          by: USER_ADMIN,    at: dAgo(340), key: 'reports/rpt_full_002.pdf', sz: 1024000, pub: false },
    { _id: 'rpt_full_003', type: 'PHOTO_SHEET',       title: '102동 긴급점검 사진 대지',           proj: 'proj_2026_emg',by: USER_INSP1,   at: dAgo(30),  key: 'reports/rpt_full_003.pdf', sz: 5242880, pub: false },
    { _id: 'rpt_full_004', type: 'CRACK_TREND',       title: '균열 추이 분석 보고서 (2025.Q3~Q4)',proj: null,          by: USER_REVIEWER, at: dAgo(20),  key: 'reports/rpt_full_004.pdf', sz: 1536000, pub: false },
    { _id: 'rpt_full_005', type: 'SUMMARY',           title: '2025년 운영 요약 보고서 (연간)',     proj: null,          by: USER_ADMIN,    at: dAgo(15),  key: 'reports/rpt_full_005.pdf', sz: 3072000, pub: true },
    { _id: 'rpt_full_006', type: 'COMPLAINT_ANALYSIS',title: '2025년 민원 분석 보고서 (4분기)',    proj: null,          by: USER_CMGR,     at: dAgo(10),  key: 'reports/rpt_full_006.pdf', sz: 768000,  pub: false },
    { _id: 'rpt_full_007', type: 'MAINTENANCE_PLAN',  title: '2026년 장기수선계획 (안)',           proj: null,          by: USER_REVIEWER, at: dAgo(7),   key: 'reports/rpt_full_007.pdf', sz: 4096000, pub: true },
    { _id: 'rpt_full_008', type: 'XAI_ASSESSMENT',    title: 'XAI 책임 평가 보고서 (KICT 기준)',  proj: null,          by: USER_REVIEWER, at: dAgo(3),   key: 'reports/rpt_full_008.pdf', sz: 2560000, pub: false },
    { _id: 'demo_report_01', type: 'INSPECTION_RESULT',title: '[데모] 2026년 1분기 정기점검 결과 보고서', proj: 'proj_2026_r1', by: USER_ADMIN, at: dAgo(1), key: `reports/${ORG_ID}/demo_report_01.pdf`, sz: 1258291, pub: false },
  ];
  for (const r of reports) await upsert(org, {
    _id: `report:${ORG_ID}:${r._id}`, docType: 'report', orgId: ORG_ID, complexId: COMPLEX_ID,
    ...(r.proj && { projectId: `inspectionProject:${ORG_ID}:${r.proj}` }),
    reportType: r.type, title: r.title,
    generatedBy: r.by, generatedAt: r.at,
    fileKey: r.key, fileSize: r.sz, isPublic: r.pub,
    parameters: { locale: 'ko', pageSize: 'A4', includePhotos: true },
    createdAt: r.at, updatedAt: r.at, createdBy: r.by, updatedBy: r.by,
  });

  // ══ 14. KPI 레코드 (13건, 월별 시계열) ══════════════════════════════
  console.log('\n[14] KPI 레코드');
  // [id, start, end, totComp, resComp, avgResH, compRate, totInsp, compInsp, overdueInsp, inspRate, avgInspH, totDef, critDef, repDef, defRate, prevCost, corrCost, sat?]
  type KR = [string,string,string, number,number,number,number, number,number,number,number,number, number,number,number,number, number,number, number?];
  const kpiRows: KR[] = [
    ['kpi_2025_q1', '2025-01-01','2025-03-31', 24,20,28.4,0.833, 3,2,0,0.667,7.2, 18,3,10,0.556, 4800000,3200000, 3.8],
    ['kpi_2025_q2', '2025-04-01','2025-06-30', 19,17,21.2,0.895, 2,2,0,1.000,5.8, 12,1, 9,0.750, 3200000,1800000, 4.1],
    ['kpi_2025_07', '2025-07-01','2025-07-31', 22,19,19.8,0.864, 2,2,0,1.000,6.5, 14,2, 8,0.571, 1800000,2200000, 4.2],
    ['kpi_2025_08', '2025-08-01','2025-08-31', 28,24,22.1,0.857, 1,0,1,0.000,0.0,  8,1, 5,0.625, 1200000,3100000, 3.9],
    ['kpi_2025_09', '2025-09-01','2025-09-30', 17,16,16.4,0.941, 1,1,0,1.000,5.2,  7,0, 6,0.857, 2400000, 900000, 4.5],
    ['kpi_2025_10', '2025-10-01','2025-10-31', 20,18,17.6,0.900, 3,3,0,1.000,4.1, 10,1, 8,0.800, 3100000,1400000, 4.3],
    ['kpi_2025_11', '2025-11-01','2025-11-30', 16,15,14.2,0.938, 2,2,0,1.000,5.8,  9,0, 8,0.889, 2800000, 750000, 4.6],
    ['kpi_2025_12', '2025-12-01','2025-12-31', 13,11,18.9,0.846, 1,1,0,1.000,4.5,  6,0, 5,0.833, 1500000, 600000, 4.4],
    ['kpi_2026_01', '2026-01-01','2026-01-31', 18,14,24.7,0.778, 1,0,0,0.000,0.0, 12,2, 7,0.583, 1200000,2800000, 3.7],
    ['kpi_2026_02', '2026-02-01','2026-02-28', 21,17,21.3,0.810, 1,1,0,1.000,6.0, 15,3, 9,0.600, 1600000,3400000, 3.9],
    ['kpi_2026_03', '2026-03-01','2026-03-31', 25,20,20.1,0.800, 2,1,0,0.500,5.0, 18,4,10,0.556, 2000000,4200000, 3.8],
    // 현재 달 (동적)
    [`kpi_${thisMonth}`, `${thisMonth}-01`, now.slice(0,10), 12, 9, 18.5, 0.750, 1, 0, 0, 0.0, 0.0, 8, 2, 4, 0.500, 800000, 1600000, 3.9],
    // demo.seed.ts 스타일 (실시간 KPI 개요)
    [`kpi_${thisMonth}_rt`, `${thisMonth}-01`, now.slice(0,10), 15, 12, 18.5, 0.800, 1, 0, 0, 0.920, 0.0, 9, 1, 8, 0.889, 1200000, 900000, undefined],
  ];
  for (const [id,s,e, tc,rc,arh,crr, ti,ci,oi,ir,aih, td,cd,rd,dr, pc,cc, sat] of kpiRows) {
    await upsert(org, {
      _id: `kpiRecord:${ORG_ID}:${id}`, docType: 'kpiRecord', orgId: ORG_ID, complexId: COMPLEX_ID,
      periodStart: s, periodEnd: e,
      totalComplaints: tc, resolvedComplaints: rc, avgResolutionHours: arh, complaintResolutionRate: crr,
      totalInspections: ti, completedInspections: ci, overdueInspections: oi,
      inspectionCompletionRate: ir, avgInspectionHours: aih,
      totalDefects: td, criticalDefects: cd, repairedDefects: rd, defectRepairRate: dr,
      preventiveMaintenanceCost: pc, correctiveMaintenanceCost: cc,
      ...(sat !== undefined && { avgSatisfactionScore: sat }),
      createdAt: `${e}T23:59:59.000Z`, updatedAt: now, createdBy: 'system', updatedBy: 'system',
    });
  }

  // ══ 15. RPA 작업 이력 (13건) ════════════════════════════════════════
  console.log('\n[15] RPA 작업 이력');
  const rpaTasks = [
    // 관리비 고지서 (BILL_GENERATION)
    { _id: 'rpa_full_001', type: 'BILL_GENERATION',        sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 8 1 * *', execAt: '2026-04-01T08:00:12.000Z', proc: 500, auto: 495, man: 0,  err: 5,  rate: 0.990, ms: 18420, sum: '4월 관리비 고지서 495세대 생성 완료. 5건 주소 오류 — 수동 확인 필요.' },
    { _id: 'rpa_full_002', type: 'BILL_GENERATION',        sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 8 1 * *', execAt: '2026-03-01T08:00:08.000Z', proc: 500, auto: 495, man: 5,  err: 5,  rate: 0.990, ms: 19100, sum: '3월 관리비 고지서 495세대 생성. 5건 처리 오류 발생.' },
    { _id: 'rpa_full_003', type: 'BILL_GENERATION',        sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 8 1 * *', execAt: '2026-02-01T08:00:05.000Z', proc: 500, auto: 500, man: 0,  err: 0,  rate: 1.000, ms: 15800, sum: '2월 관리비 고지서 500세대 전량 자동 생성 완료.' },
    // 계약 만료 알림 (CONTRACT_EXPIRY_NOTICE)
    { _id: 'rpa_full_004', type: 'CONTRACT_EXPIRY_NOTICE', sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 9 * * *', execAt: dAgo(0), proc: 15, auto: 15, man: 0, err: 0, rate: 1.000, ms: 3240, sum: '계약 만료 임박 15건 알림 발송 완료 (90일 이내). 소방설비·청소용역 포함.' },
    { _id: 'rpa_full_005', type: 'CONTRACT_EXPIRY_NOTICE', sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 9 * * *', execAt: dAgo(1), proc: 14, auto: 14, man: 0, err: 0, rate: 1.000, ms: 2980, sum: '계약 만료 임박 14건 알림 발송 완료.' },
    // 민원 자동 접수·분류 (COMPLAINT_INTAKE)
    { _id: 'rpa_full_006', type: 'COMPLAINT_INTAKE',       sta: 'COMPLETED', tri: 'EVENT', execAt: dAgo(0), proc: 8, auto: 6, man: 2, err: 0, rate: 0.750, ms: 4120, sum: '오늘 민원 8건 AI 자동 분류. 6건 자동 처리, 2건 수동 확인 필요.' },
    { _id: 'rpa_full_007', type: 'COMPLAINT_INTAKE',       sta: 'COMPLETED', tri: 'EVENT', execAt: dAgo(1), proc: 5, auto: 4, man: 1, err: 0, rate: 0.800, ms: 3800, sum: '어제 민원 5건 AI 분류. 4건 자동 처리, 1건 모호 — 수동 검토 필요.' },
    // 점검 일정 자동 생성 (INSPECTION_SCHEDULE)
    { _id: 'rpa_full_008', type: 'INSPECTION_SCHEDULE',    sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 7 1 1,4,7,10 *', execAt: '2026-04-01T07:00:15.000Z', proc: 12, auto: 11, man: 1, err: 0, rate: 0.917, ms: 8650, sum: '2026년 2분기 점검 일정 12건 생성. 11건 자동 등록, 1건 담당자 미배정으로 수동 확인 필요.' },
    { _id: 'rpa_full_009', type: 'INSPECTION_SCHEDULE',    sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 7 1 1,4,7,10 *', execAt: '2026-01-01T07:00:10.000Z', proc: 10, auto: 10, man: 0, err: 0, rate: 1.000, ms: 7200, sum: '2026년 1분기 점검 일정 10건 전량 자동 등록 완료.' },
    // 법정 보고 자동 제출 (REPORT_SUBMISSION)
    { _id: 'rpa_full_010', type: 'REPORT_SUBMISSION',      sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 10 5 1,4,7,10 *', execAt: '2026-04-05T10:00:30.000Z', proc: 3, auto: 3, man: 0, err: 0, rate: 1.000, ms: 12400, sum: '2026년 1분기 안전관리계획 보고서 3건 지자체 포털 자동 제출 완료.' },
    { _id: 'rpa_full_011', type: 'REPORT_SUBMISSION',      sta: 'FAILED',    tri: 'SCHEDULED', cron: '0 10 5 1,4,7,10 *', execAt: '2025-10-05T10:00:22.000Z', proc: 3, auto: 2, man: 0, err: 1, rate: 0.667, ms: 25000, sum: '2025년 3분기 보고서 제출 중 포털 연결 오류로 1건 실패.', errs: ['포털 API 응답 없음 (타임아웃 25초)'] },
    // 마일리지 지급 (MILEAGE_GRANT)
    { _id: 'rpa_full_012', type: 'MILEAGE_GRANT',          sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 11 28 * *', execAt: '2026-03-28T11:00:05.000Z', proc: 87, auto: 87, man: 0, err: 0, rate: 1.000, ms: 5100, sum: '3월 클린하우스 마일리지 87세대 지급 완료. 총 43,500점.' },
    { _id: 'rpa_full_013', type: 'MILEAGE_GRANT',          sta: 'COMPLETED', tri: 'SCHEDULED', cron: '0 11 28 * *', execAt: '2026-02-28T11:00:03.000Z', proc: 92, auto: 92, man: 0, err: 0, rate: 1.000, ms: 4900, sum: '2월 클린하우스 마일리지 92세대 지급 완료. 총 46,000점.' },
  ];
  for (const r of rpaTasks) await upsert(org, {
    _id: `rpaTask:${ORG_ID}:${r._id}`, docType: 'rpaTask', orgId: ORG_ID, complexId: COMPLEX_ID,
    taskType: r.type, status: r.sta, triggerType: r.tri,
    ...(r.cron && { scheduleExpression: r.cron }),
    executedAt: r.execAt,
    processedCount: r.proc, automatedCount: r.auto, manualCount: r.man, errorCount: r.err,
    automationRate: r.rate, durationMs: r.ms, summary: r.sum,
    ...(r.errs && { errorDetails: r.errs }),
    createdAt: r.execAt, updatedAt: r.execAt, createdBy: 'system', updatedBy: 'system',
  });

  // ══ 16. 자동화 룰 (Phase 2-7) ══════════════════════════════════════
  console.log('\n[16] 자동화 룰 (Phase 2-7)');
  const autoNow = new Date().toISOString();
  const automationRules = [
    {
      _id: `automationRule:${ORG_ID}:rule_complaint_resolved`,
      docType: 'automationRule', orgId: ORG_ID,
      name: '민원 처리 완료 통지', description: '민원 RESOLVED 상태 전환 시 인앱 알림 자동 발송',
      ruleKey: 'complaint_resolved_notify', category: 'COMPLAINT', isActive: true, priority: 10,
      trigger: { type: 'STATUS_CHANGE', watchDocType: 'complaint', fromStatus: null, toStatus: 'RESOLVED' },
      conditions: [],
      actions: [
        { type: 'SEND_NOTIFICATION', channel: 'IN_APP',
          titleTemplate: '민원 처리 완료 안내',
          bodyTemplate: '접수하신 민원이 처리 완료되었습니다. 결과를 확인하고 만족도를 평가해 주세요.' },
      ],
      executionCount: 0, successCount: 0, failureCount: 0,
      createdAt: autoNow, updatedAt: autoNow, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    },
    {
      _id: `automationRule:${ORG_ID}:rule_contract_expiry_30d`,
      docType: 'automationRule', orgId: ORG_ID,
      name: '계약 만료 30일 전 알림', description: '매일 09:00 경보 생성 + 이메일 mock 발송',
      ruleKey: 'contract_expiry_30d', category: 'CONTRACT', isActive: true, priority: 20,
      trigger: { type: 'DATE_BASED', cronExpression: '0 9 * * *' },
      conditions: [],
      actions: [
        { type: 'CREATE_ALERT', alertType: 'CONTRACT_EXPIRY', alertSeverity: 'MEDIUM',
          alertTitle: '계약 만료 30일 전 안내',
          alertBody: '임대차 계약 만료 30일 전입니다. 갱신 또는 퇴거 절차를 진행하세요.' },
        { type: 'SEND_NOTIFICATION', channel: 'EMAIL',
          titleTemplate: '[AX] 임대차 계약 만료 30일 전 안내',
          bodyTemplate: '임대차 계약이 30일 후 만료됩니다. 경북개발공사에 문의하세요.',
          recipientStatic: 'admin@happy-housing.kr' },
      ],
      executionCount: 3, successCount: 3, failureCount: 0,
      lastTriggeredAt: '2026-04-12T09:00:00.000Z',
      lastSuccessAt: '2026-04-12T09:00:02.000Z',
      createdAt: autoNow, updatedAt: autoNow, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    },
    {
      _id: `automationRule:${ORG_ID}:rule_inspection_schedule_auto`,
      docType: 'automationRule', orgId: ORG_ID,
      name: '월별 정기 점검 일정 자동 생성', description: '매월 1일 09:00 다음 달 점검 일정 자동 생성',
      ruleKey: 'inspection_schedule_auto', category: 'INSPECTION', isActive: true, priority: 30,
      trigger: { type: 'DATE_BASED', cronExpression: '0 9 1 * *' },
      conditions: [],
      actions: [
        { type: 'CREATE_SCHEDULE', scheduleTitle: '[자동] 정기 안전 점검', scheduleDaysOffset: 30 },
        { type: 'SEND_NOTIFICATION', channel: 'IN_APP',
          titleTemplate: '정기 점검 일정 자동 등록',
          bodyTemplate: '다음 달 정기 점검 일정이 자동으로 등록되었습니다.' },
      ],
      executionCount: 2, successCount: 2, failureCount: 0,
      lastTriggeredAt: '2026-04-01T09:00:00.000Z',
      lastSuccessAt: '2026-04-01T09:00:03.000Z',
      createdAt: autoNow, updatedAt: autoNow, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    },
    {
      _id: `automationRule:${ORG_ID}:rule_inspection_reminder`,
      docType: 'automationRule', orgId: ORG_ID,
      name: '점검 미수행 리마인드', description: '매일 08:00 미완료 점검 세션 경보 생성',
      ruleKey: 'inspection_reminder', category: 'INSPECTION', isActive: true, priority: 40,
      trigger: { type: 'DATE_BASED', cronExpression: '0 8 * * *' },
      conditions: [],
      actions: [
        { type: 'CREATE_ALERT', alertType: 'INSPECTION_OVERDUE', alertSeverity: 'HIGH',
          alertTitle: '점검 미수행 알림',
          alertBody: '기한 내 완료되지 않은 점검 세션이 있습니다. 즉시 확인하세요.' },
      ],
      executionCount: 1, successCount: 0, failureCount: 1,
      lastTriggeredAt: '2026-04-13T08:00:00.000Z',
      lastFailedAt: '2026-04-13T08:00:01.000Z',
      createdAt: autoNow, updatedAt: autoNow, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    },
  ];
  for (const rule of automationRules) await upsert(org, rule);

  // 자동화 실행 이력 샘플 (3건)
  const executions = [
    {
      _id: `automationExecution:${ORG_ID}:exec_sample_001`,
      docType: 'automationExecution', orgId: ORG_ID,
      ruleId: `automationRule:${ORG_ID}:rule_contract_expiry_30d`,
      ruleName: '계약 만료 30일 전 알림', ruleKey: 'contract_expiry_30d',
      triggerType: 'DATE_BASED', triggerContext: { scannedAt: '2026-04-12T09:00:00.000Z' },
      status: 'COMPLETED', startedAt: '2026-04-12T09:00:00.000Z',
      completedAt: '2026-04-12T09:00:02.340Z', durationMs: 2340,
      actionsExecuted: [
        { type: 'CREATE_ALERT', status: 'SUCCESS',
          result: { alertId: `alert:${ORG_ID}:auto_001` }, executedAt: '2026-04-12T09:00:01.000Z', durationMs: 980 },
        { type: 'SEND_NOTIFICATION', status: 'SUCCESS',
          result: { channel: 'EMAIL', to: 'admin@happy-housing.kr', mock: true }, executedAt: '2026-04-12T09:00:02.000Z', durationMs: 640 },
      ],
      affectedDocIds: [], affectedCount: 0,
      summary: '2/2 액션 성공',
      createdAt: '2026-04-12T09:00:00.000Z', updatedAt: '2026-04-12T09:00:02.000Z', createdBy: 'system', updatedBy: 'system',
    },
    {
      _id: `automationExecution:${ORG_ID}:exec_sample_002`,
      docType: 'automationExecution', orgId: ORG_ID,
      ruleId: `automationRule:${ORG_ID}:rule_complaint_resolved`,
      ruleName: '민원 처리 완료 통지', ruleKey: 'complaint_resolved_notify',
      triggerType: 'STATUS_CHANGE',
      triggerContext: { watchDocType: 'complaint', fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', docId: `complaint:${ORG_ID}:comp_001` },
      status: 'COMPLETED', startedAt: '2026-04-10T14:22:00.000Z',
      completedAt: '2026-04-10T14:22:00.512Z', durationMs: 512,
      actionsExecuted: [
        { type: 'SEND_NOTIFICATION', status: 'SUCCESS',
          result: { notificationId: `notification:${ORG_ID}:notif_001`, channel: 'IN_APP' }, executedAt: '2026-04-10T14:22:00.400Z', durationMs: 400 },
      ],
      affectedDocIds: [`complaint:${ORG_ID}:comp_001`], affectedCount: 1,
      summary: '1/1 액션 성공',
      createdAt: '2026-04-10T14:22:00.000Z', updatedAt: '2026-04-10T14:22:00.512Z', createdBy: 'system', updatedBy: 'system',
    },
    {
      _id: `automationExecution:${ORG_ID}:exec_sample_003`,
      docType: 'automationExecution', orgId: ORG_ID,
      ruleId: `automationRule:${ORG_ID}:rule_inspection_reminder`,
      ruleName: '점검 미수행 리마인드', ruleKey: 'inspection_reminder',
      triggerType: 'DATE_BASED', triggerContext: { scannedAt: '2026-04-13T08:00:00.000Z' },
      status: 'FAILED', startedAt: '2026-04-13T08:00:00.000Z',
      completedAt: '2026-04-13T08:00:01.200Z', durationMs: 1200,
      actionsExecuted: [
        { type: 'CREATE_ALERT', status: 'FAILED',
          error: 'complexId가 설정되지 않아 경보 생성 실패', executedAt: '2026-04-13T08:00:01.000Z', durationMs: 1000 },
      ],
      affectedDocIds: [], affectedCount: 0,
      summary: '0/1 액션 성공',
      error: 'complexId가 설정되지 않아 경보 생성 실패',
      createdAt: '2026-04-13T08:00:00.000Z', updatedAt: '2026-04-13T08:00:01.200Z', createdBy: 'system', updatedBy: 'system',
    },
  ];
  for (const exec of executions) await upsert(org, exec);
  console.log(`  자동화 룰 ${automationRules.length}건 · 실행 이력 ${executions.length}건`);

  // ══ Phase 2-8: IoT 센서 테스트 데이터 ════════════════════════════════
  console.log('\n[Phase 2-8] IoT 센서 seed 중...');

  const sensorDefs = [
    { key: 'bldg101-temp-b1-01', name: '101동 지하 온도계 #1',    type: 'TEMPERATURE', unit: '°C',   loc: '101동 지하 1층 기계실',  base: 22, noise: 3,  wMin: 5,  wMax: 30, cMin: 0,  cMax: 40  },
    { key: 'bldg101-hum-b1-01',  name: '101동 지하 습도계 #1',    type: 'HUMIDITY',    unit: '%',    loc: '101동 지하 1층 기계실',  base: 55, noise: 10, wMin: 30, wMax: 70, cMin: 20, cMax: 85  },
    { key: 'bldg102-vib-roof-01',name: '102동 외벽 진동 센서 #1', type: 'VIBRATION',   unit: 'mm/s', loc: '102동 옥상 외벽',        base: 1.5,noise: 1,  wMax: 5,  cMax: 10                   },
    { key: 'bldg103-leak-b1-01', name: '103동 지하 누수 감지기',  type: 'LEAK',        unit: '',     loc: '103동 지하 배수로',      base: 0,  noise: 0,  cMax: 0.5                              },
    { key: 'common-pwr-elec-01', name: '공용 전기실 전력계 #1',   type: 'POWER',       unit: 'kW',   loc: '공용 전기실',            base: 45, noise: 15, wMax: 80, cMax: 100                   },
    { key: 'parking-co2-b1-01',  name: '지하주차장 CO₂ 센서 #1', type: 'CO2',         unit: 'ppm',  loc: '지하주차장 B1 중앙',     base: 600,noise: 200,wMax:1000,cMax:2000                    },
    { key: 'roof-wl-tank-01',    name: '옥상 물탱크 수위 센서 #1',type: 'WATER_LEVEL', unit: '%',    loc: '옥상 물탱크',            base: 55, noise: 10, wMax: 70, cMax: 90                    },
    { key: 'pipe-prs-main-01',   name: '급수 주배관 압력 센서 #1',type: 'PRESSURE',    unit: 'kPa',  loc: '101동 급수 주배관',      base: 95, noise: 8,  wMin: 80, wMax:110, cMin:60, cMax:130 },
  ];

  const sensorDocIds: Record<string, string> = {};

  for (const s of sensorDefs) {
    const sid = `sensorDevice:${ORG_ID}:snr_seed_${s.key.replace(/-/g, '_')}`;
    sensorDocIds[s.key] = sid;
    await upsert(org, {
      _id: sid, docType: 'sensorDevice', orgId: ORG_ID,
      complexId: COMPLEX_ID, name: s.name, deviceKey: s.key, sensorType: s.type,
      status: 'ACTIVE', locationDescription: s.loc,
      thresholds: { unit: s.unit, warningMin: s.wMin, warningMax: s.wMax, criticalMin: s.cMin, criticalMax: s.cMax },
      manufacturer: 'Acme IoT', model: `${s.type}-X100`, installDate: '2026-01-15',
      lastValue: parseFloat((s.base + (Math.random() - 0.5) * s.noise * 2).toFixed(1)),
      lastValueAt: now, lastSeenAt: now, isActive: true,
      createdAt: '2026-01-15T09:00:00.000Z', updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // 센서별 과거 측정값 (6시간, 5분 간격 = 72개)
  const INTERVAL_MIN = 5;
  const READING_HOURS = 6;
  const READING_N = (READING_HOURS * 60) / INTERVAL_MIN;
  let readingCount = 0;

  for (const s of sensorDefs) {
    for (let i = READING_N; i >= 0; i--) {
      let value: number;
      if (s.type === 'LEAK') {
        value = Math.random() < 0.03 ? parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)) : 0;
      } else {
        value = parseFloat((s.base + (Math.random() - 0.5) * s.noise * 2).toFixed(1));
        // 가끔 임계치 초과
        if (Math.random() < 0.04 && (s as any).cMax) {
          value = parseFloat(((s as any).cMax * (1.05 + Math.random() * 0.1)).toFixed(1));
        }
      }

      // 임계치 평가
      const cMax = (s as any).cMax; const cMin = (s as any).cMin;
      const wMax = (s as any).wMax; const wMin = (s as any).wMin;
      let thresholdStatus = 'NORMAL';
      if ((cMax != null && value > cMax) || (cMin != null && value < cMin)) thresholdStatus = 'CRITICAL';
      else if ((wMax != null && value > wMax) || (wMin != null && value < wMin)) thresholdStatus = 'WARNING';

      const rAt = new Date(Date.now() - i * INTERVAL_MIN * 60_000).toISOString();
      const rid = `sensorReading:${ORG_ID}:srd_seed_${s.key.replace(/-/g, '_')}_${i}`;

      await upsert(org, {
        _id: rid, docType: 'sensorReading', orgId: ORG_ID,
        deviceId: sensorDocIds[s.key], deviceKey: s.key,
        complexId: COMPLEX_ID, sensorType: s.type,
        value, unit: s.unit, quality: 'GOOD',
        recordedAt: rAt, thresholdStatus, source: 'BATCH_IMPORT',
        createdAt: rAt, updatedAt: rAt, createdBy: 'system', updatedBy: 'system',
      });
      readingCount++;
    }
  }

  console.log(`  센서 기기 ${sensorDefs.length}건 · 측정값 ${readingCount}건`);

  // ══ Phase 2-9: 위험도 스코어 + 장기수선 권장 시드 ══════════════════════
  console.log('\n[Phase 2-9] 위험도 스코어 & 장기수선 권장 seed 중...');

  const WEIGHTS = { defect: 0.30, crack: 0.25, sensor: 0.20, complaint: 0.15, age: 0.10 };
  const scoreToLevel = (s: number) => s >= 76 ? 'CRITICAL' : s >= 51 ? 'HIGH' : s >= 26 ? 'MEDIUM' : 'LOW';

  interface RiskSeedDef {
    targetType: string;
    targetId: string;
    targetName: string;
    defect: number; crack: number; sensor: number; complaint: number; age: number;
  }

  const riskDefs: RiskSeedDef[] = [
    { targetType: 'BUILDING', targetId: `building:${ORG_ID}:bld_101`, targetName: '101동',    defect: 78, crack: 82, sensor: 55, complaint: 60, age: 70 },
    { targetType: 'BUILDING', targetId: `building:${ORG_ID}:bld_102`, targetName: '102동',    defect: 40, crack: 35, sensor: 30, complaint: 45, age: 50 },
    { targetType: 'BUILDING', targetId: `building:${ORG_ID}:bld_103`, targetName: '103동',    defect: 15, crack: 20, sensor: 10, complaint: 20, age: 30 },
    { targetType: 'ZONE',     targetId: `zone:${ORG_ID}:znr_parking`,  targetName: '지하주차장', defect: 60, crack: 50, sensor: 40, complaint: 35, age: 60 },
    { targetType: 'ZONE',     targetId: `zone:${ORG_ID}:znr_lobby`,    targetName: '공용 로비',  defect: 25, crack: 15, sensor: 20, complaint: 30, age: 40 },
    { targetType: 'ASSET',    targetId: `facilityAsset:${ORG_ID}:ast_elevator_101`, targetName: '101동 엘리베이터', defect: 55, crack: 0, sensor: 70, complaint: 50, age: 80 },
  ];

  const COST_BANDS: Record<string, { min: number; max: number; basis: string }> = {
    IMMEDIATE_REPAIR:      { min: 10_000_000, max: 50_000_000,  basis: '긴급 보수 공사 실적 기반' },
    SHORT_TERM_REPAIR:     { min: 5_000_000,  max: 30_000_000,  basis: '단기 보수 유사 공종 기반' },
    SCHEDULED_MAINTENANCE: { min: 1_000_000,  max: 15_000_000,  basis: '계획 유지보수 단가 기반' },
    ROUTINE_INSPECTION:    { min: 100_000,    max: 1_000_000,   basis: '정기 점검 용역비 기반' },
    REPLACEMENT:           { min: 30_000_000, max: 200_000_000, basis: '장기수선계획 교체 단가 기반' },
  };
  const levelToMaintenanceType = (l: string, isAsset = false) => {
    if (l === 'CRITICAL') return isAsset ? 'REPLACEMENT' : 'IMMEDIATE_REPAIR';
    if (l === 'HIGH')     return 'SHORT_TERM_REPAIR';
    if (l === 'MEDIUM')   return 'SCHEDULED_MAINTENANCE';
    return 'ROUTINE_INSPECTION';
  };
  const levelToPriority = (l: string) =>
    l === 'CRITICAL' ? 'IMMEDIATE' : l === 'HIGH' ? 'HIGH' : l === 'MEDIUM' ? 'MEDIUM' : 'LOW';
  const addDays = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0];
  };
  const levelToTimeline = (l: string) => {
    if (l === 'CRITICAL') return { earliest: addDays(0),  latest: addDays(30),  label: '즉시 (1개월 이내)' };
    if (l === 'HIGH')     return { earliest: addDays(14), latest: addDays(180), label: '단기 (3~6개월 이내)' };
    if (l === 'MEDIUM')   return { earliest: addDays(30), latest: addDays(365), label: '계획 (6~12개월 이내)' };
    return { earliest: addDays(90), latest: addDays(400), label: '일상 (12개월 이내)' };
  };

  // 기존 isLatest 처리 생략 (seed이므로 신규만 생성)
  for (const def of riskDefs) {
    const rawScore = def.defect * WEIGHTS.defect + def.crack * WEIGHTS.crack +
      def.sensor * WEIGHTS.sensor + def.complaint * WEIGHTS.complaint + def.age * WEIGHTS.age;
    const score = Math.min(Math.round(rawScore), 100);
    const level = scoreToLevel(score);
    const now = new Date().toISOString();
    const rsId = `riskScore:${ORG_ID}:rsk_seed_${def.targetType.toLowerCase()}_${Date.now() + riskDefs.indexOf(def)}`;

    const riskDoc: any = {
      _id: rsId, docType: 'riskScore', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      targetType: def.targetType, targetId: def.targetId, targetName: def.targetName,
      score, level,
      confidence: 0.85,
      calculatedAt: now, isLatest: true,
      subScores: {
        defect:    { score: def.defect,    weight: WEIGHTS.defect,    contribution: def.defect    * WEIGHTS.defect,    details: `결함 스코어 ${def.defect}점`,    dataPoints: Math.round(def.defect / 3) },
        crack:     { score: def.crack,     weight: WEIGHTS.crack,     contribution: def.crack     * WEIGHTS.crack,     details: `균열 스코어 ${def.crack}점`,     dataPoints: Math.round(def.crack / 8) },
        sensor:    { score: def.sensor,    weight: WEIGHTS.sensor,    contribution: def.sensor    * WEIGHTS.sensor,    details: `센서 스코어 ${def.sensor}점`,    dataPoints: Math.round(def.sensor / 5) },
        complaint: { score: def.complaint, weight: WEIGHTS.complaint, contribution: def.complaint * WEIGHTS.complaint, details: `민원 스코어 ${def.complaint}점`, dataPoints: Math.round(def.complaint / 10) },
        age:       { score: def.age,       weight: WEIGHTS.age,       contribution: def.age       * WEIGHTS.age,       details: `노후도 스코어 ${def.age}점`,     dataPoints: 1 },
      },
      evidence: {
        unrepairedDefects: Math.round(def.defect / 5), criticalDefects: Math.round(def.defect / 20),
        highDefects: Math.round(def.defect / 12),
        crackThresholdExceedances: Math.round(def.crack / 15), maxCrackWidthMm: def.crack > 0 ? +(def.crack / 40).toFixed(2) : undefined,
        openComplaints: Math.round(def.complaint / 10), urgentComplaints: Math.round(def.complaint / 30),
        activeAlerts: Math.round((def.sensor + def.crack) / 20), criticalAlerts: Math.round(def.sensor / 40),
        sensorAnomalies: Math.round(def.sensor / 15), sensorCriticalCount: Math.round(def.sensor / 30),
        evidenceSummary: `미수리 결함 ${Math.round(def.defect / 5)}건, 균열 초과 ${Math.round(def.crack / 15)}건, 센서 이상 ${Math.round(def.sensor / 15)}건`,
      },
      createdAt: now, updatedAt: now,
      createdBy: 'system:seed', updatedBy: 'system:seed',
    };
    await upsert(org, riskDoc);

    // 권장 문서 생성
    const maintenanceType = levelToMaintenanceType(level, def.targetType === 'ASSET');
    const costBase = COST_BANDS[maintenanceType];
    const recId = `maintenanceRecommendation:${ORG_ID}:rec_seed_${def.targetType.toLowerCase()}_${Date.now() + riskDefs.indexOf(def)}`;
    const recDoc: any = {
      _id: recId, docType: 'maintenanceRecommendation', orgId: ORG_ID,
      complexId: COMPLEX_ID, riskScoreId: rsId,
      targetType: def.targetType, targetId: def.targetId, targetName: def.targetName,
      riskScore: score, riskLevel: level,
      maintenanceType, priority: levelToPriority(level),
      suggestedTimeline: levelToTimeline(level),
      estimatedCostBand: { ...costBase, currency: 'KRW' },
      evidenceSummary: riskDoc.evidence.evidenceSummary,
      reasoning: [
        `종합 위험도 ${score}점 (${level})`,
        `미수리 결함 ${Math.round(def.defect / 5)}건 포함`,
      ],
      status: level === 'CRITICAL' ? 'APPROVED' : 'PENDING',
      createdAt: now, updatedAt: now,
      createdBy: 'system:seed', updatedBy: 'system:seed',
    };
    await upsert(org, recDoc);
  }

  console.log(`  위험도 스코어 ${riskDefs.length}건 · 장기수선 권장 ${riskDefs.length}건`);

  // ══ 완료 요약 ════════════════════════════════════════════════════════
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ 통합 마스터 시드 완료                                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  마스터 데이터                                                ║');
  console.log('║    기관 1 · 사용자 6 · 단지 1 · 동 3 · 층 5 · 구역 4        ║');
  console.log('║  샘플 데이터                                                  ║');
  console.log('║    점검 프로젝트 8 · 세션 13                                  ║');
  console.log('║    결함 30 · 균열 게이지 13 · 측정이력 56                    ║');
  console.log('║    민원 37 · 작업지시 12 · 일정 16                           ║');
  console.log('║    경보 23 · 보고서 9 · KPI 13 · RPA 13                      ║');
  console.log('║    IoT 센서 8 · 측정값 584                                   ║');
  console.log('║    위험도 스코어 6 · 장기수선 권장 6                         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  로그인 계정                                                  ║');
  console.log('║    SUPER_ADMIN   super@ax-platform.kr    / Super@1234        ║');
  console.log('║    ORG_ADMIN     admin@happy-housing.kr  / Admin@1234        ║');
  console.log('║    INSPECTOR(홍)  hong@happy-housing.kr   / Inspector@1234   ║');
  console.log('║    INSPECTOR(이)  lee@happy-housing.kr    / Inspector@1234   ║');
  console.log('║    REVIEWER      choi@happy-housing.kr   / Reviewer@1234    ║');
  console.log('║    COMPLAINT_MGR park@happy-housing.kr   / Cmgr@1234        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Platform DB  : ${PLATFORM_DB.padEnd(42)} ║`);
  console.log(`║  Org DB       : ${ORG_DB.padEnd(42)} ║`);
  console.log('║  CouchDB UI   : http://localhost:5984/_utils                 ║');
  console.log('║  API Swagger  : http://localhost:3000/api/docs               ║');
  console.log('║  Admin Web    : http://localhost:4200                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

seed().catch((err) => {
  console.error('\n❌ 시드 실패:', err.message);
  process.exit(1);
});
