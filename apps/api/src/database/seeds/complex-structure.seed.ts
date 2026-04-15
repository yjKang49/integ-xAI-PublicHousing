/**
 * 시설 구조 seed — Organization / HousingComplex / Building / Floor / Zone
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seeds/complex-structure.seed.ts
 *
 * 전제: users.seed.ts 먼저 실행 (또는 전체 seed.ts)
 * 결과: 1개 조직, 2개 단지, 3개 동(각 4~5층), 구역 포함
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import * as nano from 'nano';

const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';
const ENV              = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const ORG_ID           = 'org_seed001';
const PLATFORM_DB      = `ax__platform_${ENV}`;
const ORG_DB           = `ax_${ORG_ID}_${ENV}`;

const connection = nano({
  url: COUCHDB_URL,
  requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } },
});

const now = new Date().toISOString();

// ── ID 상수 ──────────────────────────────────────────────────────────────────
const ORG_DOC_ID = `organization:_platform:${ORG_ID}`;

const COMPLEX_A_ID = `housingComplex:${ORG_ID}:cplx_alpha01`;
const COMPLEX_B_ID = `housingComplex:${ORG_ID}:cplx_beta01`;

const BLDG_A_101 = `building:${ORG_ID}:bldg_a101`;
const BLDG_A_102 = `building:${ORG_ID}:bldg_a102`;
const BLDG_B_201 = `building:${ORG_ID}:bldg_b201`;

// Complex A floors: 101동 (5층), 102동 (4층)
const floors101 = [-1, 1, 2, 3, 4, 5].map((n) => ({
  id: `floor:${ORG_ID}:flr_a101_${n < 0 ? 'b' + Math.abs(n) : n}f`,
  floorNumber: n,
  floorName: n < 0 ? `B${Math.abs(n)}` : `${n}F`,
  buildingId: BLDG_A_101,
  complexId: COMPLEX_A_ID,
}));

const floors102 = [1, 2, 3, 4].map((n) => ({
  id: `floor:${ORG_ID}:flr_a102_${n}f`,
  floorNumber: n,
  floorName: `${n}F`,
  buildingId: BLDG_A_102,
  complexId: COMPLEX_A_ID,
}));

const floors201 = [-1, 1, 2, 3].map((n) => ({
  id: `floor:${ORG_ID}:flr_b201_${n < 0 ? 'b' + Math.abs(n) : n}f`,
  floorNumber: n,
  floorName: n < 0 ? `B${Math.abs(n)}` : `${n}F`,
  buildingId: BLDG_B_201,
  complexId: COMPLEX_B_ID,
}));

// ── 문서 데이터 ──────────────────────────────────────────────────────────────

const platformDocs = [
  {
    _id: ORG_DOC_ID,
    docType: 'organization',
    orgId: PLATFORM_DB,
    name: '행복주택관리공단',
    businessNumber: '123-45-67890',
    address: '서울특별시 강남구 테헤란로 152',
    contactName: '김관리',
    contactEmail: 'admin@happy-housing.kr',
    contactPhone: '02-1234-5678',
    plan: 'PRO',
    dbName: ORG_DB,
    isActive: true,
    contractStartDate: '2025-01-01',
    contractEndDate: '2026-12-31',
    createdAt: now,
    updatedAt: now,
    createdBy: 'seed',
    updatedBy: 'seed',
  },
];

const orgDocs = [
  // ── 단지 A ──────────────────────────────────────────────────────────────────
  {
    _id: COMPLEX_A_ID,
    docType: 'housingComplex',
    orgId: ORG_ID,
    name: '행복마을 1단지',
    address: '서울특별시 노원구 중계로 123',
    totalUnits: 360,
    totalBuildings: 2,
    builtYear: 1998,
    managedBy: 'user:_platform:usr_admin01',
    latitude: 37.6490,
    longitude: 127.0770,
    qrCode: `AX:housingComplex:${ORG_ID}:${COMPLEX_A_ID}`,
    tags: ['아파트', '영구임대', '노원구'],
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  // ── 단지 B ──────────────────────────────────────────────────────────────────
  {
    _id: COMPLEX_B_ID,
    docType: 'housingComplex',
    orgId: ORG_ID,
    name: '햇살마을 2단지',
    address: '경기도 성남시 분당구 판교역로 58',
    totalUnits: 180,
    totalBuildings: 1,
    builtYear: 2012,
    managedBy: 'user:_platform:usr_admin01',
    latitude: 37.3947,
    longitude: 127.1108,
    qrCode: `AX:housingComplex:${ORG_ID}:${COMPLEX_B_ID}`,
    tags: ['아파트', '국민임대', '분당구'],
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },

  // ── 동 ──────────────────────────────────────────────────────────────────────
  {
    _id: BLDG_A_101,
    docType: 'building',
    orgId: ORG_ID,
    complexId: COMPLEX_A_ID,
    name: '101동',
    code: 'A101',
    totalFloors: 5,
    undergroundFloors: 1,
    totalUnits: 180,
    builtDate: '1998-09-30',
    structureType: '철근콘크리트조',
    qrCode: `AX:building:${ORG_ID}:${BLDG_A_101}`,
    floorPlanUrls: {},
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  {
    _id: BLDG_A_102,
    docType: 'building',
    orgId: ORG_ID,
    complexId: COMPLEX_A_ID,
    name: '102동',
    code: 'A102',
    totalFloors: 4,
    undergroundFloors: 0,
    totalUnits: 180,
    builtDate: '1998-09-30',
    structureType: '철근콘크리트조',
    qrCode: `AX:building:${ORG_ID}:${BLDG_A_102}`,
    floorPlanUrls: {},
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  {
    _id: BLDG_B_201,
    docType: 'building',
    orgId: ORG_ID,
    complexId: COMPLEX_B_ID,
    name: '201동',
    code: 'B201',
    totalFloors: 3,
    undergroundFloors: 1,
    totalUnits: 180,
    builtDate: '2012-06-15',
    structureType: '철근콘크리트조',
    qrCode: `AX:building:${ORG_ID}:${BLDG_B_201}`,
    floorPlanUrls: {},
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },

  // ── 층 ──────────────────────────────────────────────────────────────────────
  ...[...floors101, ...floors102, ...floors201].map((f) => ({
    _id: f.id,
    docType: 'floor',
    orgId: ORG_ID,
    buildingId: f.buildingId,
    complexId: f.complexId,
    floorNumber: f.floorNumber,
    floorName: f.floorName,
    area: f.floorNumber < 0 ? 520.0 : 310.5,
    zones: [],
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  })),

  // ── 구역 (101동 B1층, 1층에만 샘플 구역) ───────────────────────────────────
  {
    _id: `zone:${ORG_ID}:zone_a101_b1_pkg`,
    docType: 'zone',
    orgId: ORG_ID,
    floorId: `floor:${ORG_ID}:flr_a101_b1`,
    buildingId: BLDG_A_101,
    complexId: COMPLEX_A_ID,
    name: '지하주차장 A구역',
    code: 'Z-PKG-A',
    description: '101동 지하 1층 주차구역 A',
    qrCode: `AX:zone:${ORG_ID}:zone_a101_b1_pkg`,
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  {
    _id: `zone:${ORG_ID}:zone_a101_b1_mech`,
    docType: 'zone',
    orgId: ORG_ID,
    floorId: `floor:${ORG_ID}:flr_a101_b1`,
    buildingId: BLDG_A_101,
    complexId: COMPLEX_A_ID,
    name: '기계실',
    code: 'Z-MECH',
    description: '지하 1층 기계/전기 설비실',
    qrCode: `AX:zone:${ORG_ID}:zone_a101_b1_mech`,
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  {
    _id: `zone:${ORG_ID}:zone_a101_1f_lobby`,
    docType: 'zone',
    orgId: ORG_ID,
    floorId: `floor:${ORG_ID}:flr_a101_1f`,
    buildingId: BLDG_A_101,
    complexId: COMPLEX_A_ID,
    name: '1층 로비',
    code: 'Z-LOBBY',
    description: '101동 1층 현관 로비',
    qrCode: `AX:zone:${ORG_ID}:zone_a101_1f_lobby`,
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
  {
    _id: `zone:${ORG_ID}:zone_a101_1f_stair`,
    docType: 'zone',
    orgId: ORG_ID,
    floorId: `floor:${ORG_ID}:flr_a101_1f`,
    buildingId: BLDG_A_101,
    complexId: COMPLEX_A_ID,
    name: '북측 계단실',
    code: 'Z-STAIR-N',
    description: '101동 1층 북측 계단실 입구',
    qrCode: `AX:zone:${ORG_ID}:zone_a101_1f_stair`,
    createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
  },
];

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

async function upsert(db: nano.DocumentScope<any>, doc: any) {
  try {
    const existing = await (db as any).get(doc._id);
    // 이미 존재하면 skip
    console.log(`  SKIP  ${doc._id}`);
    return existing;
  } catch (e: any) {
    if (e.statusCode === 404) {
      await db.insert(doc as any);
      console.log(`  OK    ${doc._id}`);
    } else {
      throw e;
    }
  }
}

async function ensureDb(name: string) {
  try { await connection.db.create(name); console.log(`Created DB: ${name}`); }
  catch (e: any) { if (e.statusCode !== 412) throw e; }
}

async function ensureIndexes(db: nano.DocumentScope<any>) {
  const indexes = [
    { index: { fields: ['docType', 'orgId', 'createdAt'] },              name: 'idx-doctype-orgid-created' },
    { index: { fields: ['docType', 'orgId', 'complexId', 'name'] },      name: 'idx-building-complex-name' },
    { index: { fields: ['docType', 'orgId', 'buildingId', 'floorNumber'] }, name: 'idx-floor-building-num' },
    { index: { fields: ['docType', 'orgId', 'complexId'] },              name: 'idx-doctype-orgid-complex' },
    { index: { fields: ['docType', 'orgId', 'floorId', 'name'] },        name: 'idx-zone-floor-name' },
    { index: { fields: ['docType', 'orgId', 'buildingId'] },             name: 'idx-doctype-orgid-building' },
  ];
  for (const idx of indexes) {
    try { await (db as any).createIndex(idx); } catch {}
  }
  console.log('  Indexes applied.');
}

// ── 실행 ──────────────────────────────────────────────────────────────────────

async function run() {
  // Ensure DBs exist
  await ensureDb(PLATFORM_DB);
  await ensureDb(ORG_DB);

  const platformDb = connection.use(PLATFORM_DB);
  const orgDb = connection.use(ORG_DB);

  console.log('\n[1/3] Platform DB — organization document');
  for (const doc of platformDocs) await upsert(platformDb, doc);

  console.log('\n[2/3] Org DB — complexes, buildings, floors, zones');
  for (const doc of orgDocs) await upsert(orgDb, doc);

  console.log('\n[3/3] Applying indexes...');
  await ensureIndexes(orgDb);

  console.log(`
Done. Structure:
  행복마을 1단지 (${COMPLEX_A_ID})
    └─ 101동 (${BLDG_A_101}) — B1, 1F~5F
    └─ 102동 (${BLDG_A_102}) — 1F~4F
  햇살마을 2단지 (${COMPLEX_B_ID})
    └─ 201동 (${BLDG_B_201}) — B1, 1F~3F

Login: admin@happy-housing.kr / Admin@1234
Admin Web: http://localhost:4200/complexes
  `);
}

run().catch((e) => { console.error(e); process.exit(1); });
