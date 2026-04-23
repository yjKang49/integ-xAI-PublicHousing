/**
 * Seed script — CouchDB 초기 데이터 투입
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seed.ts
 *
 * 필요 환경변수: COUCHDB_URL, COUCHDB_USER, COUCHDB_PASSWORD
 * (apps/api/.env 파일 자동 로드)
 */

import * as path from 'path';
try {
  // 로컬 dev: .env 로드. prod 컨테이너엔 dotenv 미설치 + .env 부재 — silent skip.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch { /* noop */ }

import * as nano from 'nano';
import * as bcrypt from 'bcrypt';

// ── 설정 ────────────────────────────────────────────────────────
const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';

const ENV         = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const PLATFORM_DB = `ax__platform_${ENV}`;
const ORG_ID      = 'org_seed001';
const ORG_DB      = `ax_${ORG_ID}_${ENV}`;

// ── ID 상수 ──────────────────────────────────────────────────────
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

// floors: B2, B1, 1F~5F per building (use 101 for most data)
const FLR_101_B2  = `floor:${ORG_ID}:flr_101_b2`;
const FLR_101_B1  = `floor:${ORG_ID}:flr_101_b1`;
const FLR_101_1F  = `floor:${ORG_ID}:flr_101_1f`;
const FLR_101_2F  = `floor:${ORG_ID}:flr_101_2f`;
const FLR_101_3F  = `floor:${ORG_ID}:flr_101_3f`;

const ZONE_PKG_A  = `zone:${ORG_ID}:zone_pkg_a`;   // 지하주차장 A구역
const ZONE_PKG_B  = `zone:${ORG_ID}:zone_pkg_b`;   // 지하주차장 B구역
const ZONE_LOBBY  = `zone:${ORG_ID}:zone_lobby`;   // 1층 로비
const ZONE_STAIRS = `zone:${ORG_ID}:zone_stairs`;  // 계단실

// Inspection Projects
const PROJ_2025_R1  = `inspectionProject:${ORG_ID}:proj_2025_r1`;
const PROJ_2025_R2  = `inspectionProject:${ORG_ID}:proj_2025_r2`;
const PROJ_2026_EMG = `inspectionProject:${ORG_ID}:proj_2026_emg`;

// Sessions
const SESS_101_B2   = `inspectionSession:${ORG_ID}:sess_101_b2`;
const SESS_101_1F   = `inspectionSession:${ORG_ID}:sess_101_1f`;
const SESS_101_3F   = `inspectionSession:${ORG_ID}:sess_101_3f`;
const SESS_102_EXT  = `inspectionSession:${ORG_ID}:sess_102_ext`;
const SESS_2026_EMG = `inspectionSession:${ORG_ID}:sess_2026_emg`;

// Defects
const DEF_001 = `defect:${ORG_ID}:def_001`;
const DEF_002 = `defect:${ORG_ID}:def_002`;
const DEF_003 = `defect:${ORG_ID}:def_003`;
const DEF_004 = `defect:${ORG_ID}:def_004`;
const DEF_005 = `defect:${ORG_ID}:def_005`;
const DEF_006 = `defect:${ORG_ID}:def_006`;
const DEF_007 = `defect:${ORG_ID}:def_007`;
const DEF_008 = `defect:${ORG_ID}:def_008`;
const DEF_009 = `defect:${ORG_ID}:def_009`;
const DEF_010 = `defect:${ORG_ID}:def_010`;
const DEF_011 = `defect:${ORG_ID}:def_011`;
const DEF_012 = `defect:${ORG_ID}:def_012`;
const DEF_013 = `defect:${ORG_ID}:def_013`;
const DEF_014 = `defect:${ORG_ID}:def_014`;
const DEF_015 = `defect:${ORG_ID}:def_015`;

// Crack gauge points
const GAUGE_001 = `crackGaugePoint:${ORG_ID}:gauge_001`;
const GAUGE_002 = `crackGaugePoint:${ORG_ID}:gauge_002`;
const GAUGE_003 = `crackGaugePoint:${ORG_ID}:gauge_003`;
const GAUGE_004 = `crackGaugePoint:${ORG_ID}:gauge_004`;
const GAUGE_005 = `crackGaugePoint:${ORG_ID}:gauge_005`;

// Complaints
const COMP_001 = `complaint:${ORG_ID}:comp_001`;
const COMP_002 = `complaint:${ORG_ID}:comp_002`;
const COMP_003 = `complaint:${ORG_ID}:comp_003`;
const COMP_004 = `complaint:${ORG_ID}:comp_004`;
const COMP_005 = `complaint:${ORG_ID}:comp_005`;
const COMP_006 = `complaint:${ORG_ID}:comp_006`;
const COMP_007 = `complaint:${ORG_ID}:comp_007`;
const COMP_008 = `complaint:${ORG_ID}:comp_008`;

// Alerts
const ALERT_001 = `alert:${ORG_ID}:alert_001`;
const ALERT_002 = `alert:${ORG_ID}:alert_002`;
const ALERT_003 = `alert:${ORG_ID}:alert_003`;
const ALERT_004 = `alert:${ORG_ID}:alert_004`;
const ALERT_005 = `alert:${ORG_ID}:alert_005`;
const ALERT_006 = `alert:${ORG_ID}:alert_006`;
const ALERT_007 = `alert:${ORG_ID}:alert_007`;

// Schedules
const SCHED_001 = `schedule:${ORG_ID}:sched_001`;
const SCHED_002 = `schedule:${ORG_ID}:sched_002`;
const SCHED_003 = `schedule:${ORG_ID}:sched_003`;
const SCHED_004 = `schedule:${ORG_ID}:sched_004`;

// ── 날짜 헬퍼 ────────────────────────────────────────────────────
const now   = new Date().toISOString();
const d     = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString();
const dAgo  = (days: number)   => d(-days);
const dFwd  = (days: number)   => d(days);
const dDate = (offset: number) => d(offset).slice(0, 10);

// ── 메인 ─────────────────────────────────────────────────────────
async function seed() {
  const authUrl = COUCHDB_URL.replace('://', `://${COUCHDB_USER}:${COUCHDB_PASSWORD}@`);
  const client  = nano(authUrl);

  console.log('🌱 AX 플랫폼 종합 샘플 데이터 투입 시작...\n');

  // ── 1. DB 생성 ──────────────────────────────────────────────────
  for (const db of ['_users', '_replicator', PLATFORM_DB, ORG_DB]) {
    try {
      await client.db.get(db);
      console.log(`  ✓ DB 존재: ${db}`);
    } catch (e: any) {
      if (e.statusCode === 404) {
        await client.db.create(db);
        console.log(`  + DB 생성: ${db}`);
      }
    }
  }

  const platform = client.use(PLATFORM_DB);
  const org      = client.use(ORG_DB);

  await upsertIndexes(platform);
  await upsertIndexes(org);

  const hash = async (pw: string) => bcrypt.hash(pw, 12);

  // ── 2. 기관 ─────────────────────────────────────────────────────
  console.log('\n[기관]');
  await upsert(platform, {
    _id: `organization:_platform:${ORG_ID}`,
    docType: 'organization', orgId: '_platform',
    name: '행복주택관리공단',
    businessNumber: '123-45-67890',
    address: '서울특별시 강남구 테헤란로 521',
    contactName: '김관리', contactEmail: 'admin@happy-housing.kr', contactPhone: '02-1234-5678',
    plan: 'PRO', dbName: ORG_DB, isActive: true,
    contractStartDate: '2024-01-01', contractEndDate: '2026-12-31',
    createdAt: now, updatedAt: now, createdBy: USER_SUPER, updatedBy: USER_SUPER,
  });

  // ── 3. 사용자 ────────────────────────────────────────────────────
  console.log('\n[사용자]');
  const users = [
    { _id: USER_SUPER,    email: 'super@ax-platform.kr',      pw: 'Super@1234',     role: 'SUPER_ADMIN',   name: '슈퍼관리자',      orgId: '_platform' },
    { _id: USER_ADMIN,    email: 'admin@happy-housing.kr',    pw: 'Admin@1234',     role: 'ORG_ADMIN',     name: '김관리 (관리자)', orgId: ORG_ID },
    { _id: USER_INSP1,    email: 'hong@happy-housing.kr',     pw: 'Inspector@1234', role: 'INSPECTOR',     name: '홍길동 (점검원)', orgId: ORG_ID },
    { _id: USER_INSP2,    email: 'lee@happy-housing.kr',      pw: 'Inspector@1234', role: 'INSPECTOR',     name: '이현장 (점검원)', orgId: ORG_ID },
    { _id: USER_REVIEWER, email: 'choi@happy-housing.kr',     pw: 'Reviewer@1234',  role: 'REVIEWER',      name: '최기술 (책임기술자)', orgId: ORG_ID },
    { _id: USER_CMGR,     email: 'park@happy-housing.kr',     pw: 'Cmgr@1234',      role: 'COMPLAINT_MGR', name: '박민원 (민원담당)', orgId: ORG_ID },
  ];
  for (const u of users) {
    await upsert(platform, {
      _id: u._id, docType: 'user', orgId: '_platform',
      email: u.email, passwordHash: await hash(u.pw),
      name: u.name, role: u.role, organizationId: u.orgId,
      assignedComplexIds: u.orgId === ORG_ID ? [COMPLEX_ID] : [],
      isActive: true, createdAt: now, updatedAt: now,
      createdBy: USER_SUPER, updatedBy: USER_SUPER,
    });
  }

  // ── 4. 단지 ─────────────────────────────────────────────────────
  console.log('\n[단지]');
  await upsert(org, {
    _id: COMPLEX_ID, docType: 'housingComplex', orgId: ORG_ID,
    name: '행복마을 1단지',
    address: '서울특별시 강남구 개포동 1200',
    totalUnits: 500, totalBuildings: 3, builtYear: 1998,
    managedBy: USER_ADMIN,
    latitude: 37.4848, longitude: 127.0577,
    qrCode: `AX:housingComplex:${ORG_ID}:${COMPLEX_ID}`,
    tags: ['아파트', '재건축예정', '안전점검대상'],
    createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  // ── 5. 동 ────────────────────────────────────────────────────────
  console.log('\n[동/건물]');
  const buildings = [
    { _id: BLDG_101, name: '101동', code: 'B101', units: 100 },
    { _id: BLDG_102, name: '102동', code: 'B102', units: 100 },
    { _id: BLDG_103, name: '103동', code: 'B103', units: 100 },
  ];
  for (const b of buildings) {
    await upsert(org, {
      _id: b._id, docType: 'building', orgId: ORG_ID, complexId: COMPLEX_ID,
      name: b.name, code: b.code, totalFloors: 15, undergroundFloors: 2,
      totalUnits: b.units, builtDate: '1998-06-30', structureType: '철근콘크리트조',
      qrCode: `AX:building:${ORG_ID}:${b._id}`, floorPlanUrls: {},
      createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ── 6. 층 ────────────────────────────────────────────────────────
  console.log('\n[층]');
  const floors101 = [
    { _id: FLR_101_B2, fn: -2, name: 'B2', area: 800,  zones: [ZONE_PKG_A, ZONE_PKG_B] },
    { _id: FLR_101_B1, fn: -1, name: 'B1', area: 850,  zones: [] },
    { _id: FLR_101_1F, fn:  1, name: '1F', area: 320,  zones: [ZONE_LOBBY, ZONE_STAIRS] },
    { _id: FLR_101_2F, fn:  2, name: '2F', area: 320,  zones: [] },
    { _id: FLR_101_3F, fn:  3, name: '3F', area: 320,  zones: [] },
  ];
  for (const f of floors101) {
    await upsert(org, {
      _id: f._id, docType: 'floor', orgId: ORG_ID,
      buildingId: BLDG_101, complexId: COMPLEX_ID,
      floorNumber: f.fn, floorName: f.name, area: f.area, zones: f.zones,
      createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ── 7. 구역 ─────────────────────────────────────────────────────
  console.log('\n[구역]');
  const zones = [
    { _id: ZONE_PKG_A,  floorId: FLR_101_B2, name: '지하주차장 A구역', code: 'Z-B2-A', desc: '지하2층 북측 (50대)' },
    { _id: ZONE_PKG_B,  floorId: FLR_101_B2, name: '지하주차장 B구역', code: 'Z-B2-B', desc: '지하2층 남측 (50대)' },
    { _id: ZONE_LOBBY,  floorId: FLR_101_1F, name: '1층 로비',         code: 'Z-1F-L', desc: '출입구 및 우편함' },
    { _id: ZONE_STAIRS, floorId: FLR_101_1F, name: '계단실 A',         code: 'Z-1F-S', desc: '비상계단 북측' },
  ];
  for (const z of zones) {
    await upsert(org, {
      _id: z._id, docType: 'zone', orgId: ORG_ID,
      floorId: z.floorId, buildingId: BLDG_101, complexId: COMPLEX_ID,
      name: z.name, code: z.code, description: z.desc,
      qrCode: `AX:zone:${ORG_ID}:${z._id}`,
      createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ── 8. 점검 프로젝트 ─────────────────────────────────────────────
  console.log('\n[점검 프로젝트]');
  await upsert(org, {
    _id: PROJ_2025_R1, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2025년 1차 정기안전점검',
    round: 1, inspectionType: 'REGULAR',
    plannedStartDate: '2025-03-01', plannedEndDate: '2025-03-31',
    actualStartDate: '2025-03-03', actualEndDate: '2025-03-28',
    status: 'COMPLETED',
    leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
    description: '연 1회 정기 안전점검 (봄)',
    sessionIds: [SESS_101_B2, SESS_101_1F],
    createdAt: dAgo(60), updatedAt: dAgo(5), createdBy: USER_ADMIN, updatedBy: USER_REVIEWER,
  });

  await upsert(org, {
    _id: PROJ_2025_R2, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '2025년 2차 정기안전점검',
    round: 2, inspectionType: 'REGULAR',
    plannedStartDate: dDate(-30), plannedEndDate: dDate(15),
    actualStartDate: dDate(-25),
    status: 'IN_PROGRESS',
    leadInspectorId: USER_INSP2, reviewerId: USER_REVIEWER,
    description: '연 2회 정기 안전점검 (가을)',
    sessionIds: [SESS_101_3F, SESS_102_EXT],
    createdAt: dAgo(35), updatedAt: dAgo(1), createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
  });

  await upsert(org, {
    _id: PROJ_2026_EMG, docType: 'inspectionProject', orgId: ORG_ID,
    complexId: COMPLEX_ID, name: '102동 외벽 긴급점검',
    round: 1, inspectionType: 'EMERGENCY',
    plannedStartDate: dDate(-5), plannedEndDate: dDate(5),
    actualStartDate: dDate(-3),
    status: 'PENDING_REVIEW',
    leadInspectorId: USER_INSP1, reviewerId: USER_REVIEWER,
    description: '102동 외벽 콘크리트 박락 발견 후 긴급 점검',
    sessionIds: [SESS_2026_EMG],
    createdAt: dAgo(7), updatedAt: dAgo(2), createdBy: USER_ADMIN, updatedBy: USER_INSP1,
  });

  // ── 9. 점검 세션 ─────────────────────────────────────────────────
  console.log('\n[점검 세션]');
  await upsert(org, {
    _id: SESS_101_B2, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_R1, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
    inspectorId: USER_INSP1, status: 'COMPLETED',
    startedAt: dAgo(50), completedAt: dAgo(49),
    defectCount: 5, weatherCondition: '맑음', temperature: 12,
    checklistItems: [
      { id: 'ci_001', category: '구조', description: '기둥 균열 여부', result: 'FAIL', notes: '균열 3건 발견', order: 1 },
      { id: 'ci_002', category: '구조', description: '보 처짐 여부', result: 'PASS', order: 2 },
      { id: 'ci_003', category: '방수', description: '바닥 누수 흔적', result: 'FAIL', notes: '누수 2건', order: 3 },
      { id: 'ci_004', category: '안전', description: '비상구 확보', result: 'PASS', order: 4 },
      { id: 'ci_005', category: '안전', description: '소화기 비치', result: 'PASS', order: 5 },
    ],
    notes: '지하주차장 북측 기둥 다수 균열 확인. 즉시 보수 필요.',
    createdAt: dAgo(50), updatedAt: dAgo(49), createdBy: USER_INSP1, updatedBy: USER_INSP1,
  });

  await upsert(org, {
    _id: SESS_101_1F, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_R1, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: FLR_101_1F, zoneId: ZONE_LOBBY,
    inspectorId: USER_INSP1, status: 'COMPLETED',
    startedAt: dAgo(48), completedAt: dAgo(48),
    defectCount: 2, weatherCondition: '맑음', temperature: 13,
    checklistItems: [
      { id: 'ci_006', category: '마감', description: '바닥 타일 균열', result: 'FAIL', notes: '출입구 앞 타일 3장 파손', order: 1 },
      { id: 'ci_007', category: '창호', description: '창문 개폐 상태', result: 'PASS', order: 2 },
      { id: 'ci_008', category: '방수', description: '외벽 누수 흔적', result: 'PASS', order: 3 },
    ],
    createdAt: dAgo(48), updatedAt: dAgo(48), createdBy: USER_INSP1, updatedBy: USER_INSP1,
  });

  await upsert(org, {
    _id: SESS_101_3F, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_R2, complexId: COMPLEX_ID,
    buildingId: BLDG_101, floorId: FLR_101_3F,
    inspectorId: USER_INSP2, status: 'IN_PROGRESS',
    startedAt: dAgo(3),
    defectCount: 1,
    checklistItems: [
      { id: 'ci_009', category: '구조', description: '슬래브 균열', result: 'FAIL', notes: '3F 복도 슬래브 균열 확인', order: 1 },
      { id: 'ci_010', category: '방수', description: '욕실 방수', result: null, order: 2 },
      { id: 'ci_011', category: '설비', description: '배관 누수', result: null, order: 3 },
    ],
    createdAt: dAgo(3), updatedAt: dAgo(1), createdBy: USER_INSP2, updatedBy: USER_INSP2,
  });

  await upsert(org, {
    _id: SESS_102_EXT, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2025_R2, complexId: COMPLEX_ID,
    buildingId: BLDG_102,
    inspectorId: USER_INSP2, status: 'PLANNED',
    defectCount: 0,
    checklistItems: [],
    createdAt: dAgo(10), updatedAt: dAgo(10), createdBy: USER_INSP2, updatedBy: USER_INSP2,
  });

  await upsert(org, {
    _id: SESS_2026_EMG, docType: 'inspectionSession', orgId: ORG_ID,
    projectId: PROJ_2026_EMG, complexId: COMPLEX_ID,
    buildingId: BLDG_102,
    inspectorId: USER_INSP1, status: 'PENDING_REVIEW',
    startedAt: dAgo(3), completedAt: dAgo(2),
    defectCount: 4, weatherCondition: '흐림', temperature: 9,
    checklistItems: [
      { id: 'ci_012', category: '외벽', description: '외벽 콘크리트 박락', result: 'FAIL', notes: '102동 남측 외벽 박락 다수', order: 1 },
      { id: 'ci_013', category: '구조', description: '외벽 균열', result: 'FAIL', notes: '0.5mm 이상 균열 5건', order: 2 },
      { id: 'ci_014', category: '방수', description: '옥상 방수', result: 'PASS', order: 3 },
    ],
    notes: '긴급 조치 권고. 낙하물 위험으로 출입 통제 필요.',
    createdAt: dAgo(3), updatedAt: dAgo(2), createdBy: USER_INSP1, updatedBy: USER_INSP1,
  });

  // ── 10. 결함 ─────────────────────────────────────────────────────
  console.log('\n[결함]');
  const defects = [
    {
      _id: DEF_001, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      defectType: 'CRACK', severity: 'CRITICAL',
      description: '지하주차장 A구역 기둥 C-3 수직 균열. 철근 노출 징후.',
      widthMm: 1.8, lengthMm: 450, depthMm: 15,
      locationDescription: '101동 지하2층 A구역 C-3 기둥 북면 하단',
      isRepaired: false,
    },
    {
      _id: DEF_002, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      defectType: 'CRACK', severity: 'HIGH',
      description: '지하주차장 기둥 D-4 사선 균열',
      widthMm: 0.8, lengthMm: 280, depthMm: 5,
      locationDescription: '101동 지하2층 A구역 D-4 기둥 동면',
      isRepaired: false,
    },
    {
      _id: DEF_003, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      defectType: 'LEAK', severity: 'HIGH',
      description: '지하주차장 천장 누수. 우천 시 물고임.',
      areaSqm: 2.5,
      locationDescription: '101동 지하2층 A구역 주차 6번 칸 천장',
      isRepaired: false,
    },
    {
      _id: DEF_004, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_B,
      defectType: 'EFFLORESCENCE', severity: 'MEDIUM',
      description: '기둥 하단부 백태 발생. 염해 가능성.',
      locationDescription: '101동 지하2층 B구역 기둥 전반',
      isRepaired: true, repairedAt: dAgo(20), repairedBy: USER_INSP1,
      repairNotes: '표면 세척 및 방수 도포 완료',
    },
    {
      _id: DEF_005, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      defectType: 'CORROSION', severity: 'HIGH',
      description: '주차장 철제 난간 부식. 안전 위험.',
      locationDescription: '101동 지하2층 A구역 차량 진출입로 난간',
      isRepaired: false,
    },
    {
      _id: DEF_006, sessionId: SESS_101_1F, projectId: PROJ_2025_R1,
      floorId: FLR_101_1F, zoneId: ZONE_LOBBY,
      defectType: 'SPALLING', severity: 'MEDIUM',
      description: '로비 바닥 타일 파손. 보행 안전 주의.',
      areaSqm: 0.3,
      locationDescription: '101동 1층 로비 주출입구 앞 3m',
      isRepaired: true, repairedAt: dAgo(40), repairedBy: USER_INSP1,
      repairNotes: '타일 3장 교체 완료',
    },
    {
      _id: DEF_007, sessionId: SESS_101_1F, projectId: PROJ_2025_R1,
      floorId: FLR_101_1F, zoneId: ZONE_STAIRS,
      defectType: 'CRACK', severity: 'MEDIUM',
      description: '계단실 벽체 균열',
      widthMm: 0.3, lengthMm: 120,
      locationDescription: '101동 1층 계단실 A 북벽 1.2m 높이',
      isRepaired: false,
    },
    {
      _id: DEF_008, sessionId: SESS_101_3F, projectId: PROJ_2025_R2,
      floorId: FLR_101_3F,
      defectType: 'CRACK', severity: 'HIGH',
      description: '3층 복도 슬래브 균열. 방수층 손상 우려.',
      widthMm: 0.6, lengthMm: 200,
      locationDescription: '101동 3층 복도 중앙부 천장 슬래브',
      isRepaired: false,
    },
    {
      _id: DEF_009, sessionId: SESS_2026_EMG, projectId: PROJ_2026_EMG,
      buildingId: BLDG_102,
      defectType: 'SPALLING', severity: 'CRITICAL',
      description: '102동 외벽 콘크리트 박락. 보행자 낙하물 위험.',
      areaSqm: 4.2, depthMm: 30,
      locationDescription: '102동 남측 외벽 5~7층 구간',
      isRepaired: false,
    },
    {
      _id: DEF_010, sessionId: SESS_2026_EMG, projectId: PROJ_2026_EMG,
      buildingId: BLDG_102,
      defectType: 'CRACK', severity: 'HIGH',
      description: '외벽 균열 (0.5mm 이상)',
      widthMm: 0.7, lengthMm: 380,
      locationDescription: '102동 외벽 3~4층 접합부',
      isRepaired: false,
    },
    {
      _id: DEF_011, sessionId: SESS_2026_EMG, projectId: PROJ_2026_EMG,
      buildingId: BLDG_102,
      defectType: 'CRACK', severity: 'CRITICAL',
      description: '외벽-슬래브 접합부 균열 및 백태',
      widthMm: 1.2, lengthMm: 290,
      locationDescription: '102동 동측 외벽 6층 슬래브 접합부',
      isRepaired: false,
    },
    {
      _id: DEF_012, sessionId: SESS_2026_EMG, projectId: PROJ_2026_EMG,
      buildingId: BLDG_102,
      defectType: 'LEAK', severity: 'HIGH',
      description: '외벽 균열 통한 누수 흔적',
      locationDescription: '102동 내부 복도 6층 창틀 하부',
      isRepaired: false,
    },
    {
      _id: DEF_013, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2, zoneId: ZONE_PKG_B,
      defectType: 'DEFORMATION', severity: 'MEDIUM',
      description: '주차구획 경계블록 변형 및 침하',
      locationDescription: '101동 지하2층 B구역 남측 경계',
      isRepaired: false,
    },
    {
      _id: DEF_014, sessionId: SESS_101_B2, projectId: PROJ_2025_R1,
      floorId: FLR_101_B2,
      defectType: 'EFFLORESCENCE', severity: 'LOW',
      description: '지하주차장 바닥 줄눈 백태',
      locationDescription: '101동 지하2층 전반적',
      isRepaired: false,
    },
    {
      _id: DEF_015, sessionId: SESS_101_1F, projectId: PROJ_2025_R1,
      floorId: FLR_101_1F,
      defectType: 'SETTLEMENT', severity: 'LOW',
      description: '로비 바닥 경미한 침하',
      locationDescription: '101동 1층 로비 중앙',
      isRepaired: true, repairedAt: dAgo(35), repairedBy: USER_INSP2,
      repairNotes: '그라우팅 처리 완료',
    },
  ];

  for (const d of defects) {
    await upsert(org, {
      _id: d._id, docType: 'defect', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: (d as any).buildingId ?? BLDG_101,
      sessionId: d.sessionId, projectId: d.projectId,
      ...(d.floorId  && { floorId:  d.floorId  }),
      ...(d.zoneId   && { zoneId:   d.zoneId   }),
      defectType: d.defectType, severity: d.severity,
      description: d.description,
      ...(d.widthMm   !== undefined && { widthMm:   d.widthMm }),
      ...(d.lengthMm  !== undefined && { lengthMm:  d.lengthMm }),
      ...(d.depthMm   !== undefined && { depthMm:   d.depthMm }),
      ...(d.areaSqm   !== undefined && { areaSqm:   d.areaSqm }),
      locationDescription: d.locationDescription,
      isRepaired: d.isRepaired ?? false,
      ...(d.repairedAt   && { repairedAt:   d.repairedAt }),
      ...(d.repairedBy   && { repairedBy:   d.repairedBy }),
      ...(d.repairNotes  && { repairNotes:  d.repairNotes }),
      mediaIds: [],
      createdAt: dAgo(50), updatedAt: dAgo(50), createdBy: d.sessionId, updatedBy: d.sessionId,
    });
  }

  // ── 11. 균열 게이지 포인트 ───────────────────────────────────────
  console.log('\n[균열 게이지 포인트]');
  const gaugePoints = [
    {
      _id: GAUGE_001, name: 'GP-B2-C3-N', description: '지하2층 C-3 기둥 북면 균열 게이지',
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      baseline: 0.3, threshold: 1.0, location: '101동 지하2층 A구역 C-3기둥', isActive: true,
    },
    {
      _id: GAUGE_002, name: 'GP-B2-D4-E', description: '지하2층 D-4 기둥 동면 균열 게이지',
      floorId: FLR_101_B2, zoneId: ZONE_PKG_A,
      baseline: 0.2, threshold: 0.8, location: '101동 지하2층 A구역 D-4기둥', isActive: true,
    },
    {
      _id: GAUGE_003, name: 'GP-1F-STR-W', description: '계단실 서측 벽체 균열',
      floorId: FLR_101_1F, zoneId: ZONE_STAIRS,
      baseline: 0.1, threshold: 0.5, location: '101동 1층 계단실 서벽', isActive: true,
    },
    {
      _id: GAUGE_004, name: 'GP-102-S5F', description: '102동 남측 외벽 5층',
      floorId: null, zoneId: null,
      buildingId: BLDG_102,
      baseline: 0.4, threshold: 1.0, location: '102동 남측 외벽 5층', isActive: true,
    },
    {
      _id: GAUGE_005, name: 'GP-102-E6F', description: '102동 동측 외벽 6층 슬래브 접합부',
      floorId: null, zoneId: null,
      buildingId: BLDG_102,
      baseline: 0.5, threshold: 1.0, location: '102동 동측 외벽 6층', isActive: true,
    },
  ];

  for (const g of gaugePoints) {
    await upsert(org, {
      _id: g._id, docType: 'crackGaugePoint', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: (g as any).buildingId ?? BLDG_101,
      ...(g.floorId  && { floorId: g.floorId }),
      ...(g.zoneId   && { zoneId:  g.zoneId  }),
      name: g.name, description: g.description,
      qrCode: `AX:crackGaugePoint:${ORG_ID}:${g._id}`,
      installDate: '2025-03-05',
      baselineWidthMm: g.baseline, thresholdMm: g.threshold,
      location: g.location, isActive: g.isActive,
      createdAt: dAgo(60), updatedAt: now, createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // ── 12. 균열 측정 이력 ───────────────────────────────────────────
  console.log('\n[균열 측정 이력]');
  // GP-B2-C3-N: 시간에 따른 균열 진전 (임계치 초과)
  const measurements = [
    // GAUGE_001 — 임계치 1.0mm 초과 (현재 1.8mm)
    { gp: GAUGE_001, daysAgo: 55, width: 0.35, change: 0.05, exceeds: false, conf: 0.95 },
    { gp: GAUGE_001, daysAgo: 42, width: 0.52, change: 0.17, exceeds: false, conf: 0.94 },
    { gp: GAUGE_001, daysAgo: 28, width: 0.78, change: 0.26, exceeds: false, conf: 0.92 },
    { gp: GAUGE_001, daysAgo: 14, width: 1.10, change: 0.32, exceeds: true,  conf: 0.88 },
    { gp: GAUGE_001, daysAgo:  3, width: 1.45, change: 0.35, exceeds: true,  conf: 0.91 },
    { gp: GAUGE_001, daysAgo:  0, width: 1.82, change: 0.37, exceeds: true,  conf: 0.89 },
    // GAUGE_002 — 임계치 0.8mm 초과
    { gp: GAUGE_002, daysAgo: 55, width: 0.22, change: 0.02, exceeds: false, conf: 0.96 },
    { gp: GAUGE_002, daysAgo: 28, width: 0.55, change: 0.33, exceeds: false, conf: 0.93 },
    { gp: GAUGE_002, daysAgo:  7, width: 0.85, change: 0.30, exceeds: true,  conf: 0.87 },
    { gp: GAUGE_002, daysAgo:  0, width: 0.92, change: 0.07, exceeds: true,  conf: 0.90 },
    // GAUGE_003 — 정상 범위
    { gp: GAUGE_003, daysAgo: 42, width: 0.12, change: 0.02, exceeds: false, conf: 0.97 },
    { gp: GAUGE_003, daysAgo: 14, width: 0.18, change: 0.06, exceeds: false, conf: 0.95 },
    { gp: GAUGE_003, daysAgo:  0, width: 0.21, change: 0.03, exceeds: false, conf: 0.96 },
    // GAUGE_004 — 임계치 1.0mm 초과 (102동)
    { gp: GAUGE_004, daysAgo: 10, width: 0.55, change: 0.15, exceeds: false, conf: 0.88 },
    { gp: GAUGE_004, daysAgo:  3, width: 0.90, change: 0.35, exceeds: false, conf: 0.85 },
    { gp: GAUGE_004, daysAgo:  0, width: 1.15, change: 0.25, exceeds: true,  conf: 0.83 },
    // GAUGE_005 — 임계치 1.0mm 초과 (102동 최근 급진전)
    { gp: GAUGE_005, daysAgo: 10, width: 0.52, change: 0.02, exceeds: false, conf: 0.91 },
    { gp: GAUGE_005, daysAgo:  5, width: 0.88, change: 0.36, exceeds: false, conf: 0.86 },
    { gp: GAUGE_005, daysAgo:  2, width: 1.22, change: 0.34, exceeds: true,  conf: 0.80 },
    { gp: GAUGE_005, daysAgo:  0, width: 1.48, change: 0.26, exceeds: true,  conf: 0.78 },
  ];

  for (let i = 0; i < measurements.length; i++) {
    const m = measurements[i];
    const id = `crackMeasurement:${ORG_ID}:meas_${String(i + 1).padStart(3, '0')}`;
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
      ...(m.exceeds && { alertId: ALERT_001 }),
      notes: m.exceeds ? '임계치 초과 — 즉시 점검 필요' : '',
      createdAt: dAgo(m.daysAgo), updatedAt: dAgo(m.daysAgo),
      createdBy: USER_INSP1, updatedBy: USER_INSP1,
    });
  }

  // ── 13. 민원 ─────────────────────────────────────────────────────
  console.log('\n[민원]');
  const complaints = [
    {
      _id: COMP_001, category: 'SAFETY', priority: 'URGENT', status: 'RECEIVED',
      title: '지하주차장 기둥 균열 위험 — 즉시 조치 요청',
      desc: '지하주차장 C구역 기둥에 큰 균열이 생겼습니다. 안전이 걱정됩니다.',
      submittedBy: '입주민 김○○', phone: '010-1234-5678', unit: '101동 503호',
      submittedAt: dAgo(3), dueDate: dDate(2),
    },
    {
      _id: COMP_002, category: 'FACILITY', priority: 'HIGH', status: 'ASSIGNED',
      title: '102동 외벽에서 콘크리트 조각 낙하',
      desc: '주차 중 차량 위로 콘크리트 조각이 떨어졌습니다. 차량 손상 발생.',
      submittedBy: '입주민 박○○', phone: '010-2345-6789', unit: '102동 201호',
      submittedAt: dAgo(5), dueDate: dDate(0), assignedTo: USER_CMGR, assignedAt: dAgo(4),
    },
    {
      _id: COMP_003, category: 'FACILITY', priority: 'HIGH', status: 'IN_PROGRESS',
      title: '지하주차장 천장 누수로 차량 피해',
      desc: '비가 오면 지하주차장 6번 칸 위에서 물이 떨어져 차량이 젖습니다.',
      submittedBy: '입주민 이○○', phone: '010-3456-7890', unit: '101동 305호',
      submittedAt: dAgo(10), dueDate: dAgo(3), assignedTo: USER_CMGR, assignedAt: dAgo(9),
    },
    {
      _id: COMP_004, category: 'NOISE', priority: 'MEDIUM', status: 'ASSIGNED',
      title: '윗층 소음 — 층간소음 측정 요청',
      desc: '매일 밤 10시 이후 윗집에서 쿵쿵거리는 소리가 납니다.',
      submittedBy: '입주민 최○○', phone: '010-4567-8901', unit: '101동 802호',
      submittedAt: dAgo(7), dueDate: dDate(7), assignedTo: USER_CMGR, assignedAt: dAgo(6),
    },
    {
      _id: COMP_005, category: 'ELEVATOR', priority: 'HIGH', status: 'RESOLVED',
      title: '엘리베이터 오작동 — 갑자기 멈춤',
      desc: '엘리베이터가 7층에서 갑자기 멈춰 30분간 갇혀 있었습니다.',
      submittedBy: '입주민 한○○', phone: '010-5678-9012', unit: '101동 701호',
      submittedAt: dAgo(20), dueDate: dAgo(17), assignedTo: USER_CMGR, assignedAt: dAgo(19),
      resolvedAt: dAgo(18), resolutionNotes: '엘리베이터 제어반 점검 및 수리 완료. 정상 운행 중.',
    },
    {
      _id: COMP_006, category: 'SANITATION', priority: 'MEDIUM', status: 'RESOLVED',
      title: '지하층 악취 발생',
      desc: '지하주차장 환기구 주변에서 악취가 납니다.',
      submittedBy: '입주민 오○○', phone: '010-6789-0123', unit: '101동 101호',
      submittedAt: dAgo(30), dueDate: dAgo(23), assignedTo: USER_CMGR, assignedAt: dAgo(29),
      resolvedAt: dAgo(22), resolutionNotes: '하수관 청소 및 방향제 설치 완료.',
    },
    {
      _id: COMP_007, category: 'PARKING', priority: 'LOW', status: 'RECEIVED',
      title: '주차 구획선 희미해서 불법주차 빈번',
      desc: '지하주차장 B구역 구획선이 마모되어 주차 혼란이 있습니다.',
      submittedBy: '입주민 정○○', phone: '010-7890-1234', unit: '101동 402호',
      submittedAt: dAgo(2), dueDate: dDate(12),
    },
    {
      _id: COMP_008, category: 'FACILITY', priority: 'MEDIUM', status: 'IN_PROGRESS',
      title: '로비 조명 수시로 깜빡임',
      desc: '1층 로비 형광등이 깜빡여서 눈이 아픕니다.',
      submittedBy: '입주민 강○○', phone: '010-8901-2345', unit: '101동 102호',
      submittedAt: dAgo(6), dueDate: dDate(4), assignedTo: USER_CMGR, assignedAt: dAgo(5),
    },
  ];

  for (const c of complaints) {
    const timeline: any[] = [{ timestamp: c.submittedAt, fromStatus: null, toStatus: 'RECEIVED', actorId: 'system' }];
    if (c.assignedTo) timeline.push({ timestamp: c.assignedAt, fromStatus: 'RECEIVED', toStatus: 'ASSIGNED', actorId: USER_CMGR });
    if (c.status === 'IN_PROGRESS') timeline.push({ timestamp: dAgo(3), fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', actorId: USER_CMGR });
    if (c.status === 'RESOLVED')    timeline.push({ timestamp: c.resolvedAt, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', actorId: USER_CMGR, notes: c.resolutionNotes });

    await upsert(org, {
      _id: c._id, docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: BLDG_101,
      unitNumber: c.unit, category: c.category, status: c.status,
      title: c.title, description: c.desc, priority: c.priority,
      submittedBy: c.submittedBy, submittedPhone: c.phone, submittedAt: c.submittedAt,
      ...(c.assignedTo && { assignedTo: c.assignedTo, assignedAt: c.assignedAt }),
      ...(c.dueDate    && { dueDate: c.dueDate }),
      ...(c.resolvedAt && { resolvedAt: c.resolvedAt, resolutionNotes: c.resolutionNotes }),
      mediaIds: [], timeline,
      createdAt: c.submittedAt, updatedAt: now, createdBy: 'system', updatedBy: USER_CMGR,
    });
  }

  // ── 14. 경보 ─────────────────────────────────────────────────────
  console.log('\n[경보]');
  const alerts = [
    {
      _id: ALERT_001, alertType: 'CRACK_THRESHOLD', severity: 'CRITICAL', status: 'ACTIVE',
      title: '[긴급] GP-B2-C3-N 균열 임계치 초과 (1.82mm)',
      message: '101동 지하2층 C-3 기둥 균열폭이 임계치(1.0mm)를 83% 초과했습니다. 즉각 현장 확인 필요.',
      sourceEntityType: 'crackGaugePoint', sourceEntityId: GAUGE_001,
      createdAt: dAgo(3),
    },
    {
      _id: ALERT_002, alertType: 'DEFECT_CRITICAL', severity: 'CRITICAL', status: 'ACTIVE',
      title: '[긴급] 102동 외벽 콘크리트 박락 — 낙하 위험',
      message: '102동 남측 외벽 5~7층 구간 콘크리트 박락(면적 4.2m²). 보행자 통로 즉시 통제 권고.',
      sourceEntityType: 'defect', sourceEntityId: DEF_009,
      createdAt: dAgo(3),
    },
    {
      _id: ALERT_003, alertType: 'DEFECT_CRITICAL', severity: 'CRITICAL', status: 'ACKNOWLEDGED',
      title: '[긴급] 102동 외벽-슬래브 접합부 균열 1.2mm',
      message: '102동 동측 외벽 6층 슬래브 접합부 균열폭 1.2mm 측정.',
      sourceEntityType: 'defect', sourceEntityId: DEF_011,
      acknowledgedBy: USER_REVIEWER, acknowledgedAt: dAgo(2),
      createdAt: dAgo(3),
    },
    {
      _id: ALERT_004, alertType: 'CRACK_THRESHOLD', severity: 'HIGH', status: 'ACTIVE',
      title: 'GP-102-S5F 균열 임계치 초과 (1.15mm)',
      message: '102동 남측 외벽 5층 균열폭이 임계치(1.0mm)를 초과했습니다.',
      sourceEntityType: 'crackGaugePoint', sourceEntityId: GAUGE_004,
      createdAt: dAgo(0),
    },
    {
      _id: ALERT_005, alertType: 'CRACK_THRESHOLD', severity: 'HIGH', status: 'ACTIVE',
      title: 'GP-102-E6F 균열 급격 진전 (1.48mm)',
      message: '102동 동측 6층 슬래브 접합부 균열이 최근 5일간 0.96mm 증가했습니다.',
      sourceEntityType: 'crackGaugePoint', sourceEntityId: GAUGE_005,
      createdAt: dAgo(0),
    },
    {
      _id: ALERT_006, alertType: 'COMPLAINT_OVERDUE', severity: 'HIGH', status: 'ACTIVE',
      title: '민원 처리 기한 초과 — 지하주차장 누수',
      message: '민원 COMP-003 (지하주차장 누수) 처리 기한이 3일 경과했습니다.',
      sourceEntityType: 'complaint', sourceEntityId: COMP_003,
      createdAt: dAgo(2),
    },
    {
      _id: ALERT_007, alertType: 'INSPECTION_OVERDUE', severity: 'MEDIUM', status: 'ACTIVE',
      title: '2025년 2차 점검 — 102동 세션 미착수',
      message: '2025년 2차 정기점검 102동 세션이 계획일 경과 후에도 미착수 상태입니다.',
      sourceEntityType: 'inspectionProject', sourceEntityId: PROJ_2025_R2,
      createdAt: dAgo(5),
    },
  ];

  for (const a of alerts) {
    await upsert(org, {
      _id: a._id, docType: 'alert', orgId: ORG_ID,
      complexId: COMPLEX_ID, alertType: a.alertType,
      status: a.status, severity: a.severity,
      title: a.title, message: a.message,
      sourceEntityType: a.sourceEntityType, sourceEntityId: a.sourceEntityId,
      assignedTo: [USER_ADMIN, USER_REVIEWER],
      ...(a.acknowledgedBy && { acknowledgedBy: a.acknowledgedBy, acknowledgedAt: a.acknowledgedAt }),
      createdAt: a.createdAt, updatedAt: a.createdAt,
      createdBy: 'system', updatedBy: 'system',
    });
  }

  // ── 15. 점검 일정 ────────────────────────────────────────────────
  console.log('\n[일정]');
  const schedules = [
    {
      _id: SCHED_001, scheduleType: 'REGULAR_INSPECTION', recurrence: 'ANNUALLY',
      title: '연간 정기 안전점검 (봄)', isActive: true,
      nextOccurrence: dDate(75), lastOccurrence: '2025-03-28',
    },
    {
      _id: SCHED_002, scheduleType: 'REGULAR_INSPECTION', recurrence: 'ANNUALLY',
      title: '연간 정기 안전점검 (가을)', isActive: true,
      nextOccurrence: dDate(15), lastOccurrence: dDate(-365),
    },
    {
      _id: SCHED_003, scheduleType: 'MAINTENANCE', recurrence: 'QUARTERLY',
      title: '소방 설비 점검', isActive: true,
      nextOccurrence: dDate(8), lastOccurrence: dDate(-83),
    },
    {
      _id: SCHED_004, scheduleType: 'CONTRACT_RENEWAL', recurrence: 'ANNUALLY',
      title: '시설물 안전관리 용역 계약 갱신', isActive: true,
      nextOccurrence: dDate(-5), lastOccurrence: '2025-01-01',   // 기한 초과!
    },
  ];
  for (const s of schedules) {
    await upsert(org, {
      _id: s._id, docType: 'schedule', orgId: ORG_ID,
      complexId: COMPLEX_ID, title: s.title,
      scheduleType: s.scheduleType, recurrence: s.recurrence,
      nextOccurrence: s.nextOccurrence, lastOccurrence: s.lastOccurrence,
      assignedTo: [USER_INSP1, USER_ADMIN], isActive: s.isActive,
      overdueAlertDays: 7,
      createdAt: now, updatedAt: now, createdBy: USER_ADMIN, updatedBy: USER_ADMIN,
    });
  }

  // ── 16. KPI 레코드 ───────────────────────────────────────────────
  console.log('\n[KPI 레코드]');
  await upsert(org, {
    _id: `kpiRecord:${ORG_ID}:kpi_2025_q1`,
    docType: 'kpiRecord', orgId: ORG_ID, complexId: COMPLEX_ID,
    periodStart: '2025-01-01', periodEnd: '2025-03-31',
    totalComplaints: 24,      resolvedComplaints: 20,
    avgResolutionHours: 28.4, complaintResolutionRate: 0.833,
    totalInspections: 3,      completedInspections: 2, overdueInspections: 0,
    inspectionCompletionRate: 0.667,
    totalDefects: 18,         criticalDefects: 3, repairedDefects: 10,
    defectRepairRate: 0.556,
    preventiveMaintenanceCost: 4800000,
    avgSatisfactionScore: 3.8,
    createdAt: dAgo(90), updatedAt: dAgo(5), createdBy: 'system', updatedBy: 'system',
  });

  await upsert(org, {
    _id: `kpiRecord:${ORG_ID}:kpi_2025_q2`,
    docType: 'kpiRecord', orgId: ORG_ID, complexId: COMPLEX_ID,
    periodStart: '2025-04-01', periodEnd: '2025-06-30',
    totalComplaints: 19,      resolvedComplaints: 17,
    avgResolutionHours: 21.2, complaintResolutionRate: 0.895,
    totalInspections: 2,      completedInspections: 2, overdueInspections: 0,
    inspectionCompletionRate: 1.0,
    totalDefects: 12,         criticalDefects: 1, repairedDefects: 9,
    defectRepairRate: 0.75,
    preventiveMaintenanceCost: 3200000,
    avgSatisfactionScore: 4.1,
    createdAt: dAgo(30), updatedAt: dAgo(5), createdBy: 'system', updatedBy: 'system',
  });

  // ── 민원/작업지시 seed ─────────────────────────────────────────
  console.log('\n[민원 및 작업지시]');
  const { buildComplaintSeeds } = await import('./seeds/complaints.seed');
  const { complaints: cmpDocs, workOrders: woDocs } = buildComplaintSeeds(ORG_ID, COMPLEX_ID, USER_ADMIN);
  for (const doc of [...cmpDocs, ...woDocs]) {
    await upsert(org, doc);
  }
  console.log(`  ✓ 민원 ${cmpDocs.length}건, 작업지시 ${woDocs.length}건 투입`);

  // ── 완료 ─────────────────────────────────────────────────────────
  console.log('\n\n✅ 샘플 데이터 투입 완료!\n');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│  로그인 계정                                                  │');
  console.log('├────────────────┬──────────────────────────────┬──────────────┤');
  console.log('│  역할          │  이메일                      │  비밀번호    │');
  console.log('├────────────────┼──────────────────────────────┼──────────────┤');
  console.log('│  SUPER_ADMIN   │  super@ax-platform.kr        │  Super@1234  │');
  console.log('│  ORG_ADMIN     │  admin@happy-housing.kr      │  Admin@1234  │');
  console.log('│  INSPECTOR(홍)  │  hong@happy-housing.kr       │  Inspector@1234 │');
  console.log('│  INSPECTOR(이)  │  lee@happy-housing.kr        │  Inspector@1234 │');
  console.log('│  REVIEWER      │  choi@happy-housing.kr       │  Reviewer@1234  │');
  console.log('│  COMPLAINT_MGR │  park@happy-housing.kr       │  Cmgr@1234   │');
  console.log('└────────────────┴──────────────────────────────┴──────────────┘');
  console.log('\n  📊 투입 데이터 요약:');
  console.log('     • 사용자 6명 (역할별 각 1명)');
  console.log('     • 단지 1, 동 3, 층 5, 구역 4');
  console.log('     • 점검 프로젝트 3건 (완료/진행중/검토대기)');
  console.log('     • 점검 세션 5건');
  console.log('     • 결함 15건 (긴급 3, 높음 5, 보통 4, 낮음 3)');
  console.log('     • 균열 게이지 5개 / 측정 이력 20건 (임계치 초과 9건)');
  console.log('     • 민원 8건 (긴급 1, 기한초과 1)');
  console.log('     • 경보 7건 (긴급 2, 높음 3, 보통 2)');
  console.log('     • 일정 4건 (기한초과 1건 포함)');
  console.log('     • KPI 레코드 2건 (Q1/Q2 2025)');
  console.log(`\n  CouchDB Fauxton : http://localhost:5984/_utils`);
  console.log(`  Platform DB     : ${PLATFORM_DB}`);
  console.log(`  Org DB          : ${ORG_DB}`);
}

// ── 유틸 ────────────────────────────────────────────────────────
async function upsert(db: nano.DocumentScope<any>, doc: any) {
  try {
    const existing = await db.get(doc._id);
    await db.insert({ ...doc, _rev: existing._rev });
    console.log(`  ~ 갱신: ${doc._id.split(':').slice(-1)[0]}`);
  } catch (e: any) {
    if (e.statusCode === 404) {
      await db.insert(doc);
      console.log(`  + 생성: ${doc._id.split(':').slice(-1)[0]}`);
    } else {
      console.warn(`  ! 오류 ${doc._id}: ${e.message}`);
    }
  }
}

async function upsertIndexes(db: nano.DocumentScope<any>) {
  const indexes = [
    { index: { fields: ['docType', 'orgId', 'createdAt'] },          name: 'idx-type-org-created' },
    { index: { fields: ['docType', 'complexId', 'createdAt'] },       name: 'idx-type-complex-created' },
    { index: { fields: ['docType', 'buildingId'] },                   name: 'idx-type-building' },
    { index: { fields: ['docType', 'floorId'] },                      name: 'idx-type-floor' },
    { index: { fields: ['docType', 'severity', 'isRepaired'] },       name: 'idx-defect-severity' },
    { index: { fields: ['docType', 'status', 'createdAt'] },          name: 'idx-status-created' },
    { index: { fields: ['docType', 'status', 'dueDate'] },            name: 'idx-status-due' },
    { index: { fields: ['docType', 'exceedsThreshold', 'measuredAt']}, name: 'idx-crack-threshold' },
    { index: { fields: ['docType', 'isActive'] },                     name: 'idx-active' },
    { index: { fields: ['email'] },                                   name: 'idx-email' },
    { index: { fields: ['docType', 'gaugePointId', 'measuredAt'] },   name: 'idx-measurement-gauge' },
    { index: { fields: ['docType', 'projectId'] },                    name: 'idx-type-project' },
    { index: { fields: ['docType', 'sessionId'] },                    name: 'idx-type-session' },
  ];
  for (const idx of indexes) {
    try { await (db as any).createIndex(idx); } catch {}
  }
}

seed().catch((err) => {
  console.error('❌ 시드 실패:', err.message);
  process.exit(1);
});
