/**
 * apps/api/src/database/seeds/ai-detection.seed.ts
 *
 * AI 결함 탐지(defectCandidate) + AI 진단 의견(diagnosisOpinion) 샘플 데이터
 *
 * ── 포함 데이터 ──────────────────────────────────────────────────────
 *   defectCandidate  : 12건 (AUTO_ACCEPT 4 · REQUIRES_REVIEW 5 · MANUAL_REQUIRED 3)
 *   diagnosisOpinion : 6건  (IMMEDIATE 1 · URGENT 2 · ROUTINE 2 · PLANNED 1)
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seeds/ai-detection.seed.ts
 *   # 또는 seed-master에서 import 후 호출
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import * as nano from 'nano';

const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';

const ENV    = 'dev';
const ORG_ID = 'org_seed001';
const ORG_DB = `ax_${ORG_ID}_${ENV}`;

const COMPLEX_ID  = `housingComplex:${ORG_ID}:cplx_seed01`;
const BLDG_101    = `building:${ORG_ID}:bldg_101`;
const BLDG_102    = `building:${ORG_ID}:bldg_102`;
const BLDG_103    = `building:${ORG_ID}:bldg_103`;

const USER_INSP1    = `user:_platform:usr_insp01`;
const USER_INSP2    = `user:_platform:usr_insp02`;
const USER_REVIEWER = `user:_platform:usr_rev01`;

// seed-master.ts 에서 생성된 결함 ID (PROMOTED 후보 연결용)
const DEF_001 = `defect:${ORG_ID}:def_001`; // CRACK · CRITICAL · 지하주차장 C-3 기둥
const DEF_003 = `defect:${ORG_ID}:def_003`; // LEAK  · HIGH    · 지하주차장 천장
const DEF_009 = `defect:${ORG_ID}:def_009`; // SPALLING · CRITICAL · 102동 외벽
const DEF_F02 = `defect:${ORG_ID}:def_f02`; // LEAK  · HIGH    · 103동 지하1층

const SESS_101_B2   = `inspectionSession:${ORG_ID}:sess_101_b2`;
const SESS_2026_EMG = `inspectionSession:${ORG_ID}:sess_2026_emg`;
const SESS_103_1F   = `inspectionSession:${ORG_ID}:sess_103_1f`;

const GAUGE_001 = `crackGaugePoint:${ORG_ID}:gauge_001`;
const GAUGE_004 = `crackGaugePoint:${ORG_ID}:gauge_004`;
const GAUGE_013 = `crackGaugePoint:${ORG_ID}:gauge_013`;

const now   = new Date().toISOString();
const dAgo  = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

// ── 유틸 ─────────────────────────────────────────────────────────────────────
async function upsert(db: nano.DocumentScope<any>, doc: any): Promise<void> {
  const existing = await db.get(doc._id).catch(() => null);
  if (existing) {
    await db.insert({ ...doc, _rev: existing._rev });
    console.log(`  ↺ updated  ${doc._id}`);
  } else {
    await db.insert(doc);
    console.log(`  ✓ inserted ${doc._id}`);
  }
}

// ── defectCandidate 문서 목록 ──────────────────────────────────────────────
function buildCandidates() {
  return [
    // ── AUTO_ACCEPT (confidence ≥ 0.90) ─────────────────────────────────────

    {
      _id: `defectCandidate:${ORG_ID}:cand_a001`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_101,
      sourceType: 'DRONE_IMAGE',
      sourceMediaId: `media:${ORG_ID}:media_drone_101_001`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0301`,
      storageKey: 'drones/2026/03/01/101/frame_0042.jpg',
      imageUrl: '/static/data/균열/0042.jpg',
      defectType: 'CRACK',
      confidence: 0.94,
      confidenceLevel: 'AUTO_ACCEPT',
      bbox: [0.12, 0.38, 0.22, 0.41],
      suggestedSeverity: 'MEDIUM',
      aiCaption: 'RC 외벽 수직 건조수축 균열 — 폭 0.4 mm 추정. KCS 41 55 02 허용 기준(0.3 mm) 초과.',
      kcsStandardRef: 'KCS 41 55 02',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PROMOTED',
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(18),
      reviewNote: '현장 확인 후 Defect 승격 처리',
      promotedDefectId: DEF_001,
      detectionJobId: `asyncJob:${ORG_ID}:job_det_001`,
      createdAt: dAgo(20), updatedAt: dAgo(18),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_a002`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_101,
      sourceType: 'DRONE_IMAGE',
      sourceMediaId: `media:${ORG_ID}:media_drone_101_002`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0301`,
      storageKey: 'drones/2026/03/01/101/frame_0085.jpg',
      imageUrl: '/static/data/누수/0001.jpg',
      defectType: 'LEAK',
      confidence: 0.91,
      confidenceLevel: 'AUTO_ACCEPT',
      bbox: [0.31, 0.52, 0.28, 0.18],
      suggestedSeverity: 'HIGH',
      aiCaption: '외벽 누수 흔적 — 철근 부식 유발 가능성. 누수 면적 약 1.2 ㎡ 추정.',
      kcsStandardRef: 'KCS 41 40 06',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PROMOTED',
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(16),
      reviewNote: '누수 범위 현장 재확인, Defect 승격',
      promotedDefectId: DEF_003,
      detectionJobId: `asyncJob:${ORG_ID}:job_det_001`,
      createdAt: dAgo(20), updatedAt: dAgo(16),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_a003`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_102,
      sourceType: 'DRONE_FRAME',
      sourceMediaId: `media:${ORG_ID}:media_drone_102_001`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0315`,
      sourceFrameId: `mediaFrame:${ORG_ID}:frame_102_0012`,
      storageKey: 'drones/2026/03/15/102/frame_0012.jpg',
      imageUrl: '/static/data/기타/0012.jpg',
      defectType: 'FIRE_RISK_CLADDING',
      confidence: 0.93,
      confidenceLevel: 'AUTO_ACCEPT',
      bbox: [0.05, 0.10, 0.90, 0.35],
      suggestedSeverity: 'CRITICAL',
      aiCaption: '화재위험 외장 패널 의심 — 알루미늄 복합 패널 과열 변형 흔적. 즉시 정밀 점검 필요.',
      kcsStandardRef: 'KCS 41 55 08',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'APPROVED',
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(8),
      reviewNote: '전문가 현장 확인 예정. 임시 접근 제한 조치',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_002`,
      createdAt: dAgo(10), updatedAt: dAgo(8),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_a004`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_102,
      sourceType: 'MOBILE_PHOTO',
      sourceMediaId: `media:${ORG_ID}:media_mobile_102_001`,
      storageKey: 'mobile/2026/03/20/102/photo_0003.jpg',
      imageUrl: '/static/data/박리/0020.jpg',
      defectType: 'DELAMINATION',
      confidence: 0.90,
      confidenceLevel: 'AUTO_ACCEPT',
      bbox: [0.20, 0.30, 0.55, 0.45],
      suggestedSeverity: 'CRITICAL',
      aiCaption: '외벽 콘크리트 박락 — 면적 약 4.2 ㎡, 두께 손실 30 mm. 보행자 낙하물 위험.',
      kcsStandardRef: 'KCS 41 55 02',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PROMOTED',
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(6),
      reviewNote: '즉시 보수 조치 필요, Defect 승격 완료',
      promotedDefectId: DEF_009,
      detectionJobId: `asyncJob:${ORG_ID}:job_det_003`,
      createdAt: dAgo(7), updatedAt: dAgo(6),
    },

    // ── REQUIRES_REVIEW (confidence 0.80 ~ 0.89) ─────────────────────────────

    {
      _id: `defectCandidate:${ORG_ID}:cand_r001`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_101,
      sourceType: 'DRONE_IMAGE',
      sourceMediaId: `media:${ORG_ID}:media_drone_101_003`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0301`,
      storageKey: 'drones/2026/03/01/101/frame_0123.jpg',
      imageUrl: '/static/data/균열/0123.jpg',
      defectType: 'CRACK',
      confidence: 0.87,
      confidenceLevel: 'REQUIRES_REVIEW',
      bbox: [0.45, 0.20, 0.18, 0.52],
      suggestedSeverity: 'LOW',
      aiCaption: 'RC 슬래브 하면 사선 균열 — 폭 0.2 mm 미만. KCS 기준 이내이나 모니터링 권고.',
      kcsStandardRef: 'KCS 41 55 02',
      kcsExceedsLimit: false,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_001`,
      createdAt: dAgo(5), updatedAt: dAgo(5),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_r002`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_101,
      sourceType: 'DRONE_FRAME',
      sourceMediaId: `media:${ORG_ID}:media_drone_101_004`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0301`,
      sourceFrameId: `mediaFrame:${ORG_ID}:frame_101_0045`,
      storageKey: 'drones/2026/03/01/101/frame_0045.jpg',
      imageUrl: '/static/data/부식/0038.jpg',
      defectType: 'CORROSION',
      confidence: 0.88,
      confidenceLevel: 'REQUIRES_REVIEW',
      bbox: [0.60, 0.40, 0.25, 0.30],
      suggestedSeverity: 'CRITICAL',
      aiCaption: '철근 노출 및 부식 — 단면 손실 추정. 구조 내력 저하 위험. 정밀안전진단 필요.',
      kcsStandardRef: 'KCS 14 20 22',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_001`,
      createdAt: dAgo(5), updatedAt: dAgo(5),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_r003`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_103,
      sourceType: 'MOBILE_PHOTO',
      sourceMediaId: `media:${ORG_ID}:media_mobile_103_001`,
      storageKey: 'mobile/2026/03/10/103/photo_0007.jpg',
      imageUrl: '/static/data/누수/0007.jpg',
      defectType: 'LEAK',
      confidence: 0.83,
      confidenceLevel: 'REQUIRES_REVIEW',
      bbox: [0.10, 0.55, 0.65, 0.30],
      suggestedSeverity: 'HIGH',
      aiCaption: '103동 지하1층 서측 벽체 누수 — 침수 흔적 및 방수층 손상 추정. 면적 약 3.8 ㎡.',
      kcsStandardRef: 'KCS 41 40 06',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PROMOTED',
      reviewedBy: USER_INSP2,
      reviewedAt: dAgo(4),
      reviewNote: '현장 확인 후 def_f02 연결',
      promotedDefectId: DEF_F02,
      detectionJobId: `asyncJob:${ORG_ID}:job_det_004`,
      createdAt: dAgo(6), updatedAt: dAgo(4),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_r004`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_102,
      sourceType: 'DRONE_IMAGE',
      sourceMediaId: `media:${ORG_ID}:media_drone_102_002`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0315`,
      storageKey: 'drones/2026/03/15/102/frame_0034.jpg',
      imageUrl: '/static/data/균열/0034.jpg',
      defectType: 'CRACK',
      confidence: 0.82,
      confidenceLevel: 'REQUIRES_REVIEW',
      bbox: [0.08, 0.15, 0.12, 0.70],
      suggestedSeverity: 'HIGH',
      aiCaption: '102동 북측 외벽 수직 균열 — 폭 0.7 mm 추정. 거동 진행형 가능성. 주기 모니터링 요망.',
      kcsStandardRef: 'KCS 41 55 02',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'REJECTED',
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(3),
      reviewNote: '기존 def_f15와 동일 위치 — 중복 탐지로 기각',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_002`,
      createdAt: dAgo(5), updatedAt: dAgo(3),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_r005`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_103,
      sourceType: 'MOBILE_PHOTO',
      sourceMediaId: `media:${ORG_ID}:media_mobile_103_002`,
      storageKey: 'mobile/2026/03/25/103/photo_0011.jpg',
      imageUrl: '/static/data/박리/0011.jpg',
      defectType: 'DELAMINATION',
      confidence: 0.82,
      confidenceLevel: 'REQUIRES_REVIEW',
      bbox: [0.25, 0.30, 0.50, 0.40],
      suggestedSeverity: 'HIGH',
      aiCaption: '마감 모르타르 박락 — 면적 약 0.6 ㎡. 하부 콘크리트 손상 여부 확인 필요.',
      kcsStandardRef: 'KCS 41 55 02',
      kcsExceedsLimit: true,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_005`,
      createdAt: dAgo(2), updatedAt: dAgo(2),
    },

    // ── MANUAL_REQUIRED (confidence < 0.80) ──────────────────────────────────

    {
      _id: `defectCandidate:${ORG_ID}:cand_m001`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_101,
      sourceType: 'DRONE_IMAGE',
      sourceMediaId: `media:${ORG_ID}:media_drone_101_005`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0301`,
      storageKey: 'drones/2026/03/01/101/frame_0178.jpg',
      imageUrl: '/static/data/백태/0001.jpg',
      defectType: 'EFFLORESCENCE',
      confidence: 0.79,
      confidenceLevel: 'MANUAL_REQUIRED',
      bbox: [0.05, 0.60, 0.80, 0.25],
      suggestedSeverity: 'LOW',
      aiCaption: '외벽 백태 — 누수 경로 추적 필요. 저신뢰도로 수동 확인 권고.',
      kcsStandardRef: 'KCS 41 55 04',
      kcsExceedsLimit: false,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_001`,
      createdAt: dAgo(5), updatedAt: dAgo(5),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_m002`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_102,
      sourceType: 'DRONE_FRAME',
      sourceMediaId: `media:${ORG_ID}:media_drone_102_003`,
      sourceMissionId: `droneMission:${ORG_ID}:msn_2026_0315`,
      sourceFrameId: `mediaFrame:${ORG_ID}:frame_102_0057`,
      storageKey: 'drones/2026/03/15/102/frame_0057.jpg',
      imageUrl: '/static/data/기타/0001.jpg',
      defectType: 'SPOILING',
      confidence: 0.76,
      confidenceLevel: 'MANUAL_REQUIRED',
      bbox: [0.30, 0.25, 0.40, 0.50],
      suggestedSeverity: 'LOW',
      aiCaption: '외벽 오손/오염 — 미관 결함. 저신뢰도로 현장 수동 점검 필요.',
      kcsStandardRef: 'KCS 41 55 03',
      kcsExceedsLimit: false,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_002`,
      createdAt: dAgo(4), updatedAt: dAgo(4),
    },

    {
      _id: `defectCandidate:${ORG_ID}:cand_m003`,
      docType: 'defectCandidate',
      orgId: ORG_ID, complexId: COMPLEX_ID, buildingId: BLDG_103,
      sourceType: 'MOBILE_PHOTO',
      sourceMediaId: `media:${ORG_ID}:media_mobile_103_003`,
      storageKey: 'mobile/2026/04/01/103/photo_0002.jpg',
      imageUrl: '/static/data/기타/0002.jpg',
      defectType: 'OTHER',
      confidence: 0.65,
      confidenceLevel: 'MANUAL_REQUIRED',
      bbox: [0.40, 0.40, 0.20, 0.20],
      suggestedSeverity: 'LOW',
      aiCaption: '미분류 이상 징후 — 신뢰도 낮음. 전문가 현장 육안 확인 필요.',
      kcsStandardRef: undefined,
      kcsExceedsLimit: false,
      modelVersion: 'mock-v0.1',
      detectionMethod: 'MOCK',
      reviewStatus: 'PENDING',
      detectionJobId: `asyncJob:${ORG_ID}:job_det_006`,
      createdAt: dAgo(1), updatedAt: dAgo(1),
    },
  ];
}

// ── diagnosisOpinion 문서 목록 ─────────────────────────────────────────────
function buildOpinions() {
  return [
    // ── IMMEDIATE (즉시 조치) ─────────────────────────────────────────────────
    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_001`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'INSPECTION_SESSION',
      targetId: SESS_2026_EMG,
      sessionId: SESS_2026_EMG,
      defectIds: [DEF_009, `defect:${ORG_ID}:def_010`, `defect:${ORG_ID}:def_011`, `defect:${ORG_ID}:def_012`],
      contextSummary: {
        defectCount: 4,
        crackMeasurementCount: 3,
        complaintCount: 2,
        alertCount: 2,
        highestSeverity: 'CRITICAL',
        periodFrom: dAgo(30),
        periodTo: now,
      },
      summary: '102동 외벽 복합 결함 — 구조 균열·박락·누수 동시 발생. 즉시 안전 점검 및 접근 통제 필요.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 종합 평가',
        '102동 남측 및 동측 외벽에서 구조 균열(폭 0.7~1.2 mm), 콘크리트 박락(면적 4.2 ㎡), 누수 흔적이 동시 확인되었습니다. ',
        'KCS 41 55 02에 따른 허용 균열폭(0.3 mm)을 대폭 초과하며, 복합 결함 양상은 구조 내력 저하를 강하게 시사합니다.',
        '',
        '### 2. 위험 요인',
        '- 콘크리트 박락에 의한 보행자 낙하물 위험 (CRITICAL)',
        '- 균열 진행 시 슬래브 접합부 분리 가능성',
        '- 누수→철근 부식 진행 가속화 우려',
        '',
        '### 3. 긴급 조치 권고',
        '1. **즉시**: 102동 남측 5~7층 구간 접근 통제 테이프·방호 펜스 설치',
        '2. **24시간 이내**: 구조안전진단 전문가 현장 파견 요청',
        '3. **1주 이내**: 외벽 균열 모니터링 게이지 추가 설치',
        '',
        '### 4. 관련 기준',
        '- KCS 41 55 02: 콘크리트 구조물 균열 허용폭 기준',
        '- KCS 41 40 06: 방수 및 누수 관리 기준',
        '- 시설물의 안전 및 유지관리에 관한 특별법 제11조',
      ].join('\n'),
      urgency: 'IMMEDIATE',
      estimatedPriorityScore: 95,
      confidence: 0.88,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1842,
      status: 'APPROVED',
      processingTimeMs: 2310,
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(9),
      reviewNote: '구조안전진단 전문가 파견 요청 완료 (2026-04-09)',
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_001`,
      createdAt: dAgo(10), updatedAt: dAgo(9), createdBy: USER_INSP1,
    },

    // ── URGENT (1주 이내) ────────────────────────────────────────────────────
    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_002`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'DEFECT',
      targetId: DEF_001,
      defectIds: [DEF_001],
      contextSummary: {
        defectCount: 1,
        crackMeasurementCount: 6,
        complaintCount: 0,
        alertCount: 1,
        highestSeverity: 'CRITICAL',
        periodFrom: dAgo(60),
        periodTo: now,
      },
      summary: '101동 지하주차장 C-3 기둥 수직 균열 — 폭 1.82 mm로 임계치 초과 진행 중. 1주 이내 보수 필요.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 결함 개요',
        '지하2층 A구역 C-3 기둥 북면 하단부에서 수직 균열이 확인되었습니다.',
        '균열 게이지 측정 결과 최근 55일간 0.35 mm → 1.82 mm로 빠르게 확대되었습니다.',
        '',
        '### 2. 위험 분석',
        '- 균열 폭 1.82 mm — KCS 41 55 02 허용 기준(1.0 mm) 82% 초과',
        '- 확대 속도: 최근 3일간 0.37 mm/3일 (급격한 가속)',
        '- 철근 노출 징후 확인 → 염해·부식 진행 가능성',
        '',
        '### 3. 보수 권고',
        '1. **즉시**: 게이지 일일 점검 전환',
        '2. **3일 이내**: 에폭시 주입 보수 또는 U-컷 충전 공법 적용',
        '3. **1주 이내**: 기둥 전체 탄산화 및 염해 조사',
        '',
        '### 4. 예상 비용',
        '- 에폭시 주입 공법: 약 150만~250만 원 (단면 처리 포함)',
      ].join('\n'),
      urgency: 'URGENT',
      estimatedPriorityScore: 82,
      confidence: 0.85,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1520,
      status: 'REVIEWING',
      processingTimeMs: 1980,
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(5),
      reviewNote: '검토 중 — 보수 공법 선정 협의 필요',
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_002`,
      createdAt: dAgo(6), updatedAt: dAgo(5), createdBy: USER_INSP1,
    },

    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_003`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'GAUGE_POINT',
      targetId: GAUGE_013,
      contextSummary: {
        defectCount: 1,
        crackMeasurementCount: 4,
        complaintCount: 0,
        alertCount: 1,
        highestSeverity: 'CRITICAL',
        periodFrom: dAgo(100),
        periodTo: now,
      },
      summary: '102동 북측 외벽 게이지 GP-102-N8F — 균열 거동 진행 확인. 긴급 구조 정밀 진단 필요.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 균열 거동 분석',
        '게이지 GP-102-N8F(기준 0.5 mm, 임계치 1.5 mm)의 최근 측정값이 임계치를 초과하였습니다.',
        '102동 북측 외벽 8~12층 구조 균열은 활동성(진행형)으로 분류됩니다.',
        '',
        '### 2. 위험도 평가',
        '- 거동 속도 분석: 비선형 증가 패턴 → 구조적 원인 가능성',
        '- 연계 결함: def_f15(폭 2.1 mm, 길이 680 mm)와 동일 위치',
        '- 고층부 위치로 드론 정밀 촬영 추가 필요',
        '',
        '### 3. 권고 조치',
        '1. **즉시**: 임시 보강재 설치 검토',
        '2. **1주 이내**: 3D 균열 측정 정밀 조사',
        '3. **1개월 이내**: 구조 해석 및 보강 설계 착수',
      ].join('\n'),
      urgency: 'URGENT',
      estimatedPriorityScore: 78,
      confidence: 0.80,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1340,
      status: 'DRAFT',
      processingTimeMs: 1760,
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_003`,
      createdAt: dAgo(2), updatedAt: dAgo(2), createdBy: USER_INSP2,
    },

    // ── ROUTINE (1개월 이내) ─────────────────────────────────────────────────
    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_004`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'INSPECTION_SESSION',
      targetId: SESS_101_B2,
      sessionId: SESS_101_B2,
      defectIds: [
        `defect:${ORG_ID}:def_002`,
        `defect:${ORG_ID}:def_004`,
        `defect:${ORG_ID}:def_005`,
        `defect:${ORG_ID}:def_013`,
        `defect:${ORG_ID}:def_014`,
      ],
      contextSummary: {
        defectCount: 5,
        crackMeasurementCount: 8,
        complaintCount: 1,
        alertCount: 0,
        highestSeverity: 'HIGH',
        periodFrom: dAgo(30),
        periodTo: now,
      },
      summary: '101동 지하2층 B구역 결함 — 균열·백태·부식 복합 발생. 1개월 이내 계획 보수 권고.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 종합 평가',
        '101동 지하2층에서 균열(D-4 기둥), 백태(B구역 기둥), 철제 난간 부식, 경계블록 변형이 복합적으로 발생했습니다.',
        '개별 결함은 MEDIUM~HIGH 수준이나 복합 발생으로 종합 위험도가 상승합니다.',
        '',
        '### 2. 세부 분석',
        '- def_002: 사선 균열 0.8 mm — 전단력에 의한 균열 패턴. 하중 점검 필요.',
        '- def_004: 기둥 백태 — 염해 조기 단계. 방수 처리 우선.',
        '- def_005: 난간 부식 — 도장 및 방청 처리로 진행 억제 가능.',
        '',
        '### 3. 보수 계획 권고',
        '1. 균열 에폭시 주입 (def_002): 예상 180~280만 원',
        '2. 방수 도막 재도포 (def_004, def_014): 예상 250~400만 원',
        '3. 난간 방청 도장 (def_005): 예상 80~150만 원',
      ].join('\n'),
      urgency: 'ROUTINE',
      estimatedPriorityScore: 52,
      confidence: 0.75,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1620,
      status: 'APPROVED',
      processingTimeMs: 2100,
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(13),
      reviewNote: '보수 일정 다음 달 정기 유지보수 포함 예정',
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_004`,
      createdAt: dAgo(15), updatedAt: dAgo(13), createdBy: USER_INSP1,
    },

    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_005`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'GAUGE_POINT',
      targetId: GAUGE_001,
      contextSummary: {
        defectCount: 1,
        crackMeasurementCount: 6,
        complaintCount: 0,
        alertCount: 0,
        highestSeverity: 'MEDIUM',
        periodFrom: dAgo(55),
        periodTo: now,
      },
      summary: '게이지 GP-B2-C3-N 균열 폭 1.82 mm — 임계치 초과. 구조 내력 영향 가능성으로 정기 정밀 조사 권고.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 측정 이력 분석',
        '- 55일 전: 0.35 mm (기준치 이내)',
        '- 현재: 1.82 mm (임계치 1.0 mm 82% 초과)',
        '- 평균 증가율: 0.027 mm/일',
        '',
        '### 2. 모니터링 권고',
        '균열 확대 속도가 경미한 수준에서 시작되어 최근 가속 증가합니다.',
        '에폭시 주입 보수 후 6개월 추적 관찰을 권장합니다.',
        '',
        '### 3. KCS 기준 적용',
        '- KCS 41 55 02 기준 허용폭 0.3 mm 대비 6.1배 초과',
        '- 정밀안전점검 수준의 조사 검토 필요',
      ].join('\n'),
      urgency: 'ROUTINE',
      estimatedPriorityScore: 60,
      confidence: 0.78,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1180,
      status: 'DRAFT',
      processingTimeMs: 1540,
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_005`,
      createdAt: dAgo(1), updatedAt: dAgo(1), createdBy: USER_INSP2,
    },

    // ── PLANNED (분기·연간 계획 정비) ─────────────────────────────────────────
    {
      _id: `diagnosisOpinion:${ORG_ID}:diag_006`,
      docType: 'diagnosisOpinion',
      orgId: ORG_ID, complexId: COMPLEX_ID,
      targetType: 'COMPLEX',
      targetId: COMPLEX_ID,
      defectIds: [
        `defect:${ORG_ID}:def_f07`,
        `defect:${ORG_ID}:def_f13`,
        `defect:${ORG_ID}:def_f14`,
      ],
      contextSummary: {
        defectCount: 3,
        crackMeasurementCount: 4,
        complaintCount: 5,
        alertCount: 0,
        highestSeverity: 'MEDIUM',
        periodFrom: dAgo(90),
        periodTo: now,
      },
      summary: '단지 전체 노후화 진행 — 백태·침하·부식 산발 발생. 연간 예방 유지관리 계획 수립 권고.',
      technicalOpinionDraft: [
        '## AI 진단 의견 (초안)',
        '',
        '### 1. 단지 전체 현황 요약',
        '103동 외부 보도블록 침하, 창틀 부식, 102동 지하1층 백태 등 노후화에 따른 경미한 결함이 산발적으로 발생하고 있습니다.',
        '현 시점의 긴급 위험은 낮으나, 방치 시 복합 결함으로 악화될 가능성이 있습니다.',
        '',
        '### 2. 권고 방향',
        '- 연간 예방 유지관리(PMP) 계획에 포함하여 체계적으로 관리',
        '- 백태 구간 방수 성능 정기 점검 주기 단축 (1회/년 → 2회/년)',
        '- 외부 금속재 도장 및 방청 처리 포함 (3년 주기)',
        '',
        '### 3. 예산 계획 참고',
        '- 보도블록 침하 교체: 약 50~80만 원',
        '- 창틀 방청 도장: 약 200~350만 원',
        '- 백태 방수 처리: 약 180~300만 원',
        '- 합계 예상: 430~730만 원 (분기 분할 시행 가능)',
      ].join('\n'),
      urgency: 'PLANNED',
      estimatedPriorityScore: 30,
      confidence: 0.68,
      model: 'MOCK_LLM',
      modelVersion: 'mock-v0.1',
      promptVersion: 'diagnosis-v1.0',
      tokensUsed: 1720,
      status: 'APPROVED',
      processingTimeMs: 2250,
      reviewedBy: USER_REVIEWER,
      reviewedAt: dAgo(20),
      reviewNote: '연간 유지보수 예산 계획에 반영 완료',
      diagnosisJobId: `asyncJob:${ORG_ID}:job_diag_006`,
      createdAt: dAgo(22), updatedAt: dAgo(20), createdBy: USER_INSP1,
    },
  ];
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = nano({
    url: COUCHDB_URL,
    requestDefaults: { auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD } },
  });
  const db = client.use(ORG_DB);

  console.log(`\n🤖 AI Detection seed → ${ORG_DB}`);

  console.log('\n[1] AI 결함 탐지 후보 (defectCandidate) 12건');
  for (const doc of buildCandidates()) await upsert(db, doc);

  console.log('\n[2] AI 진단 의견 (diagnosisOpinion) 6건');
  for (const doc of buildOpinions()) await upsert(db, doc);

  console.log('\n✅ AI Detection seed 완료\n');
}

main().catch(err => { console.error(err); process.exit(1); });
