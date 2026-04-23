/**
 * 추가 샘플 데이터 — 균열모니터링 / 민원관리 확장
 * 실행: docker compose exec api node dist/src/database/seed-extra.js
 */
import * as path from 'path';
try {
  // 로컬 dev: .env 로드. prod 컨테이너엔 dotenv 미설치 + .env 부재 — silent skip.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch { /* noop */ }
import * as nano from 'nano';

const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';
const ENV              = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const ORG_ID           = 'org_seed001';
const ORG_DB           = `ax_${ORG_ID}_${ENV}`;
const COMPLEX_ID       = `housingComplex:${ORG_ID}:cplx_seed01`;
const BLDG_101         = `building:${ORG_ID}:bldg_101`;
const BLDG_102         = `building:${ORG_ID}:bldg_102`;
const BLDG_103         = `building:${ORG_ID}:bldg_103`;
const USER_INSP1       = `user:_platform:usr_insp01`;
const USER_INSP2       = `user:_platform:usr_insp02`;
const USER_CMGR        = `user:_platform:usr_cmgr01`;

const client = nano({
  url: COUCHDB_URL,
  requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } },
});

const now = new Date().toISOString();
const dAgo  = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const dDate = (d: number) => new Date(Date.now() + d * 86400000).toISOString().split('T')[0];

async function upsert(db: any, doc: any) {
  try {
    const existing = await db.get(doc._id);
    await db.insert({ ...doc, _rev: existing._rev });
    console.log(`  ~ 갱신: ${doc._id.split(':').pop()}`);
  } catch (e: any) {
    if (e.statusCode === 404) {
      await db.insert(doc);
      console.log(`  ✓ 추가: ${doc._id.split(':').pop()}`);
    } else throw e;
  }
}

async function run() {
  const org = client.use(ORG_DB);
  console.log(`\n🌱 추가 샘플 데이터 투입 — DB: ${ORG_DB}\n`);

  // ── 1. 추가 균열 게이지 포인트 ─────────────────────────────────────
  console.log('[추가 균열 게이지 포인트]');
  const extraGauges = [
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_006`,
      name: 'GP-103-B1-W', description: '103동 지하1층 서측 벽체 균열',
      buildingId: BLDG_103, baseline: 0.2, threshold: 0.8,
      location: '103동 지하1층 서측 벽체', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_007`,
      name: 'GP-102-RF-C', description: '102동 옥상 슬래브 중앙부',
      buildingId: BLDG_102, baseline: 0.3, threshold: 1.0,
      location: '102동 옥상층 슬래브 중앙', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_008`,
      name: 'GP-101-3F-N', description: '101동 3층 북측 계단 벽체',
      buildingId: BLDG_101, baseline: 0.1, threshold: 0.5,
      location: '101동 3층 북측 계단실', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_009`,
      name: 'GP-103-2F-E', description: '103동 2층 동측 외벽 창호 상단',
      buildingId: BLDG_103, baseline: 0.2, threshold: 0.7,
      location: '103동 2층 동측 외벽', isActive: true,
    },
    {
      _id: `crackGaugePoint:${ORG_ID}:gauge_010`,
      name: 'GP-101-B1-PIPE', description: '101동 지하1층 배관 관통부',
      buildingId: BLDG_101, baseline: 0.15, threshold: 0.6,
      location: '101동 지하1층 배관 관통부 좌측', isActive: true,
    },
  ];

  for (const g of extraGauges) {
    await upsert(org, {
      _id: g._id, docType: 'crackGaugePoint', orgId: ORG_ID,
      complexId: COMPLEX_ID, buildingId: g.buildingId,
      name: g.name, description: g.description,
      qrCode: `AX:${g._id}`,
      installDate: '2025-06-01',
      baselineWidthMm: g.baseline, thresholdMm: g.threshold,
      location: g.location, isActive: g.isActive,
      createdAt: dAgo(30), updatedAt: now,
      createdBy: USER_INSP2, updatedBy: USER_INSP2,
    });
  }

  // ── 2. 추가 균열 측정 이력 ─────────────────────────────────────────
  console.log('\n[추가 균열 측정 이력]');
  const extraMeasurements = [
    // gauge_006 — 103동 지하1층: 임계치 초과 진행 중
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo: 60, width: 0.21, change: 0.01, exceeds: false, conf: 0.96 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo: 45, width: 0.35, change: 0.14, exceeds: false, conf: 0.94 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo: 30, width: 0.52, change: 0.17, exceeds: false, conf: 0.93 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo: 15, width: 0.71, change: 0.19, exceeds: false, conf: 0.91 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo:  5, width: 0.85, change: 0.14, exceeds: true,  conf: 0.88 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_006`, daysAgo:  0, width: 0.93, change: 0.08, exceeds: true,  conf: 0.86 },
    // gauge_007 — 102동 옥상: 급격한 진전
    { gp: `crackGaugePoint:${ORG_ID}:gauge_007`, daysAgo: 40, width: 0.32, change: 0.02, exceeds: false, conf: 0.95 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_007`, daysAgo: 20, width: 0.58, change: 0.26, exceeds: false, conf: 0.92 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_007`, daysAgo:  7, width: 0.87, change: 0.29, exceeds: false, conf: 0.89 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_007`, daysAgo:  2, width: 1.12, change: 0.25, exceeds: true,  conf: 0.85 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_007`, daysAgo:  0, width: 1.38, change: 0.26, exceeds: true,  conf: 0.82 },
    // gauge_008 — 101동 3층: 정상 범위 유지
    { gp: `crackGaugePoint:${ORG_ID}:gauge_008`, daysAgo: 50, width: 0.11, change: 0.01, exceeds: false, conf: 0.98 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_008`, daysAgo: 25, width: 0.15, change: 0.04, exceeds: false, conf: 0.97 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_008`, daysAgo:  0, width: 0.18, change: 0.03, exceeds: false, conf: 0.97 },
    // gauge_009 — 103동 2층: 경계값 접근 중
    { gp: `crackGaugePoint:${ORG_ID}:gauge_009`, daysAgo: 30, width: 0.22, change: 0.02, exceeds: false, conf: 0.95 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_009`, daysAgo: 15, width: 0.41, change: 0.19, exceeds: false, conf: 0.92 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_009`, daysAgo:  5, width: 0.58, change: 0.17, exceeds: false, conf: 0.90 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_009`, daysAgo:  0, width: 0.65, change: 0.07, exceeds: false, conf: 0.91 },
    // gauge_010 — 101동 지하1층 배관: 소폭 진행
    { gp: `crackGaugePoint:${ORG_ID}:gauge_010`, daysAgo: 20, width: 0.17, change: 0.02, exceeds: false, conf: 0.96 },
    { gp: `crackGaugePoint:${ORG_ID}:gauge_010`, daysAgo:  0, width: 0.23, change: 0.06, exceeds: false, conf: 0.95 },
  ];

  for (let i = 0; i < extraMeasurements.length; i++) {
    const m = extraMeasurements[i];
    const id = `crackMeasurement:${ORG_ID}:meas_ex_${String(i + 1).padStart(3, '0')}`;
    await upsert(org, {
      _id: id, docType: 'crackMeasurement', orgId: ORG_ID,
      complexId: COMPLEX_ID, gaugePointId: m.gp,
      measuredBy: USER_INSP2, measuredAt: dAgo(m.daysAgo),
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
      createdBy: USER_INSP2, updatedBy: USER_INSP2,
    });
  }

  // ── 3. 추가 민원 ───────────────────────────────────────────────────
  console.log('\n[추가 민원]');
  const extraComplaints = [
    {
      _id: `complaint:${ORG_ID}:comp_ex_001`,
      category: 'SAFETY', priority: 'URGENT', status: 'ASSIGNED',
      title: '103동 계단 난간 파손 — 낙상 위험',
      desc: '103동 3층 계단 난간이 흔들리고 일부 볼트가 빠져있어 위험합니다. 노인과 어린이가 다닐 수 있습니다.',
      submittedBy: '입주민 황○○', phone: '010-1111-2222', unit: '103동 302호',
      submittedAt: dAgo(1), dueDate: dDate(1),
      assignedTo: USER_CMGR, assignedAt: dAgo(0),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_002`,
      category: 'FACILITY', priority: 'HIGH', status: 'IN_PROGRESS',
      title: '102동 지하주차장 천장 누수 — 차량 피해',
      desc: '102동 지하주차장 B구역 14번 칸 천장에서 빗물이 새어 차량 실내가 물에 젖었습니다.',
      submittedBy: '입주민 남○○', phone: '010-2222-3333', unit: '102동 504호',
      submittedAt: dAgo(4), dueDate: dDate(1),
      assignedTo: USER_CMGR, assignedAt: dAgo(3),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_003`,
      category: 'ELEVATOR', priority: 'HIGH', status: 'RECEIVED',
      title: '103동 엘리베이터 버튼 3개 고장',
      desc: '103동 엘리베이터 내부 4층, 7층, 옥상 버튼이 눌리지 않습니다.',
      submittedBy: '입주민 서○○', phone: '010-3333-4444', unit: '103동 801호',
      submittedAt: dAgo(0), dueDate: dDate(3),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_004`,
      category: 'FACILITY', priority: 'MEDIUM', status: 'RESOLVED',
      title: '101동 현관 자동문 센서 오작동',
      desc: '현관 자동문이 사람이 없어도 계속 열렸다 닫혔다를 반복합니다.',
      submittedBy: '입주민 문○○', phone: '010-4444-5555', unit: '101동 201호',
      submittedAt: dAgo(15), dueDate: dAgo(12),
      assignedTo: USER_CMGR, assignedAt: dAgo(14),
      resolvedAt: dAgo(11), resolutionNotes: '자동문 적외선 센서 교체 완료. 정상 작동 확인.',
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_005`,
      category: 'NOISE', priority: 'MEDIUM', status: 'ASSIGNED',
      title: '지하주차장 환기팬 소음 — 새벽 시간대',
      desc: '새벽 1~3시에 지하주차장 환기팬에서 심한 소음이 납니다. 저층 주민들이 수면 방해를 받고 있습니다.',
      submittedBy: '입주민 조○○', phone: '010-5555-6666', unit: '101동 102호',
      submittedAt: dAgo(6), dueDate: dDate(4),
      assignedTo: USER_CMGR, assignedAt: dAgo(5),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_006`,
      category: 'SANITATION', priority: 'LOW', status: 'RECEIVED',
      title: '102동 쓰레기 분리수거장 악취',
      desc: '더운 날씨에 분리수거장에서 악취가 심하게 납니다. 청소 주기를 늘려주세요.',
      submittedBy: '입주민 윤○○', phone: '010-6666-7777', unit: '102동 101호',
      submittedAt: dAgo(2), dueDate: dDate(7),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_007`,
      category: 'SAFETY', priority: 'HIGH', status: 'IN_PROGRESS',
      title: '103동 옥상 방수층 균열 — 누수 우려',
      desc: '옥상 바닥 방수층에 균열이 여러 곳 생겼습니다. 비가 오면 아래층으로 누수될 것 같습니다.',
      submittedBy: '입주민 장○○', phone: '010-7777-8888', unit: '103동 901호',
      submittedAt: dAgo(8), dueDate: dDate(2),
      assignedTo: USER_CMGR, assignedAt: dAgo(7),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_008`,
      category: 'PARKING', priority: 'MEDIUM', status: 'RESOLVED',
      title: '장애인 주차구역 불법주차 반복',
      desc: '장애인 전용 주차구역에 일반 차량이 반복적으로 주차합니다. 카메라 설치나 안내가 필요합니다.',
      submittedBy: '입주민 임○○', phone: '010-8888-9999', unit: '102동 301호',
      submittedAt: dAgo(25), dueDate: dAgo(18),
      assignedTo: USER_CMGR, assignedAt: dAgo(24),
      resolvedAt: dAgo(17), resolutionNotes: '장애인 주차구역 안내 표지판 추가 설치 및 입주민 공지 완료.',
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_009`,
      category: 'FACILITY', priority: 'HIGH', status: 'ASSIGNED',
      title: '101동 급수관 누수 — 수압 저하',
      desc: '최근 일주일간 아침 시간대에 수압이 크게 낮아졌습니다. 급수관 누수가 의심됩니다.',
      submittedBy: '입주민 권○○', phone: '010-9999-0000', unit: '101동 602호',
      submittedAt: dAgo(3), dueDate: dDate(2),
      assignedTo: USER_CMGR, assignedAt: dAgo(2),
    },
    {
      _id: `complaint:${ORG_ID}:comp_ex_010`,
      category: 'SAFETY', priority: 'MEDIUM', status: 'RECEIVED',
      title: '외부 산책로 바닥 타일 들뜸 — 걸려 넘어짐 위험',
      desc: '단지 내 산책로 타일이 여러 곳 들떠 있어 걸려 넘어질 위험이 있습니다. 특히 비가 온 뒤에 더 심합니다.',
      submittedBy: '입주민 배○○', phone: '010-0000-1111', unit: '102동 401호',
      submittedAt: dAgo(1), dueDate: dDate(10),
    },
  ];

  for (const c of extraComplaints) {
    const timeline: any[] = [
      { timestamp: c.submittedAt, fromStatus: null, toStatus: 'RECEIVED', actorId: 'system' },
    ];
    if ((c as any).assignedTo) {
      timeline.push({ timestamp: (c as any).assignedAt, fromStatus: 'RECEIVED', toStatus: 'ASSIGNED', actorId: USER_CMGR });
    }
    if (c.status === 'IN_PROGRESS') {
      timeline.push({ timestamp: dAgo(2), fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', actorId: USER_CMGR });
    }
    if (c.status === 'RESOLVED') {
      timeline.push({ timestamp: (c as any).resolvedAt, fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', actorId: USER_CMGR, notes: (c as any).resolutionNotes });
    }

    await upsert(org, {
      _id: c._id, docType: 'complaint', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      buildingId: c._id.includes('_101') || c._id.includes('_001') || c._id.includes('_005') || c._id.includes('_009') || c._id.includes('_010') ? BLDG_101
               : c._id.includes('_102') || c._id.includes('_002') || c._id.includes('_006') || c._id.includes('_008') ? BLDG_102
               : BLDG_103,
      category: c.category, status: c.status, priority: c.priority,
      title: c.title, description: c.desc,
      submittedBy: c.submittedBy, submittedPhone: c.phone,
      unitNumber: c.unit, submittedAt: c.submittedAt,
      ...((c as any).assignedTo  && { assignedTo: (c as any).assignedTo, assignedAt: (c as any).assignedAt }),
      ...((c as any).dueDate     && { dueDate: (c as any).dueDate }),
      ...((c as any).resolvedAt  && { resolvedAt: (c as any).resolvedAt, resolutionNotes: (c as any).resolutionNotes }),
      mediaIds: [], timeline,
      createdAt: c.submittedAt, updatedAt: now,
      createdBy: 'system', updatedBy: USER_CMGR,
    });
  }

  // ── 4. 추가 경보 ───────────────────────────────────────────────────
  console.log('\n[추가 경보]');
  const extraAlerts = [
    {
      _id: `alert:${ORG_ID}:alert_ex_001`,
      alertType: 'CRACK_THRESHOLD', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] GP-103-B1-W 균열 임계치 초과 (0.93mm)',
      message: '103동 지하1층 서측 벽체 균열폭이 임계치(0.8mm)를 초과했습니다. 2주 내 정밀점검 권고.',
      sourceEntityType: 'crackGaugePoint',
      sourceEntityId: `crackGaugePoint:${ORG_ID}:gauge_006`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_ex_002`,
      alertType: 'CRACK_THRESHOLD', severity: 'CRITICAL', status: 'ACTIVE',
      title: '[긴급] GP-102-RF-C 균열 급진전 (1.38mm) — 옥상 슬래브',
      message: '102동 옥상 슬래브 균열이 2일간 0.26mm 급진전. 누수 및 구조 안전성 즉각 점검 필요.',
      sourceEntityType: 'crackGaugePoint',
      sourceEntityId: `crackGaugePoint:${ORG_ID}:gauge_007`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_ex_003`,
      alertType: 'COMPLAINT_OVERDUE', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] 기한초과 민원 2건 — 즉시 처리 필요',
      message: '민원 처리 기한이 초과된 건이 2건 있습니다. 담당자 확인 및 처리 요망.',
      sourceEntityType: 'complaint',
      sourceEntityId: `complaint:${ORG_ID}:comp_003`,
      createdAt: dAgo(1),
    },
    {
      _id: `alert:${ORG_ID}:alert_ex_004`,
      alertType: 'INSPECTION_DUE', severity: 'MEDIUM', status: 'ACKNOWLEDGED',
      title: '[보통] 103동 정기점검 일정 도래 (7일 후)',
      message: '103동 반기 정기안전점검 예정일이 7일 후입니다. 점검팀 배정 및 준비 바랍니다.',
      sourceEntityType: 'schedule',
      sourceEntityId: `schedule:${ORG_ID}:sched_001`,
      createdAt: dAgo(0),
    },
    {
      _id: `alert:${ORG_ID}:alert_ex_005`,
      alertType: 'DEFECT_CRITICAL', severity: 'HIGH', status: 'ACTIVE',
      title: '[높음] 103동 난간 파손 — 입주민 안전사고 위험',
      message: '103동 3층 계단 난간 파손 민원 접수. 긴급 조치 및 현장 통제 권고.',
      sourceEntityType: 'complaint',
      sourceEntityId: `complaint:${ORG_ID}:comp_ex_001`,
      createdAt: dAgo(1),
    },
  ];

  for (const a of extraAlerts) {
    await upsert(org, {
      _id: a._id, docType: 'alert', orgId: ORG_ID,
      complexId: COMPLEX_ID,
      alertType: a.alertType, severity: a.severity, status: a.status,
      title: a.title, message: a.message,
      sourceEntityType: a.sourceEntityType,
      sourceEntityId: a.sourceEntityId,
      isRead: false, assignedTo: null,
      createdAt: a.createdAt, updatedAt: now,
      createdBy: 'system', updatedBy: 'system',
    });
  }

  console.log(`
✅ 추가 샘플 데이터 투입 완료!

  📊 추가 데이터:
     • 균열 게이지 포인트 +5개 (총 10개)
     • 균열 측정 이력 +20건 (총 40건)
     • 민원 +10건 (총 18건)
     • 경보 +5건 (총 12건)
`);
}

run().catch(e => { console.error(e); process.exit(1); });
