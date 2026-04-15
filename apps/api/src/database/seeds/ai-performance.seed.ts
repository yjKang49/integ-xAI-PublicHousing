/**
 * apps/api/src/database/seeds/ai-performance.seed.ts
 *
 * AI 운영 성과 대시보드용 seed 데이터
 * - 위험도 스코어 (SHAP 기여도 포함)
 * - IoT 센서 + 시계열 readings
 * - KPI 베이스라인 (AI 도입 전 기준선)
 * - 민원 트리아지 결과 (Human-in-the-loop 시나리오)
 * - 자동화 실행 이력 (RPA 성과)
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seeds/ai-performance.seed.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import * as nano from 'nano';

const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';

const ENV     = 'dev';
const ORG_ID  = 'org_seed001';
const ORG_DB  = `ax_${ORG_ID}_${ENV}`;

const now   = new Date().toISOString();
const today = now.slice(0, 10);

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

async function main() {
  const client = nano({
    url: COUCHDB_URL,
    requestDefaults: {
      auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD },
    },
  });

  const db = client.use(ORG_DB);
  console.log(`\n🌱 AI Performance seed → ${ORG_DB}`);

  // ────────────────────────────────────────────────────────────────
  // 1. KPI 베이스라인 (AI 도입 전 기준선)
  // ────────────────────────────────────────────────────────────────
  await upsert(db, {
    _id: `kpiBaseline:${ORG_ID}:baseline_2024`,
    type: 'kpiBaseline',
    orgId: ORG_ID,
    label: 'AI 도입 전 기준 (2024년)',
    period: '2024',
    metrics: {
      // 민원
      complaintAvgResolutionHours: 72,  // 3일
      complaintAssignmentMinutes: 120,  // 2시간
      complaintResolutionRate: 0.68,
      // 점검
      inspectionCompletionRate: 0.72,
      // 결함
      defectRepairRate: 0.55,
      // RPA
      billingHours: 8,               // 고지서 발행 8시간
      reportWritingHours: 3,         // 보고서 작성 3시간
      arrearRate: 0.15,              // 연체율 15%
      // AI
      defectDetectionAccuracy: 0,    // 수동 육안검사 (AI 미적용)
      accidentPreventionRate: 0,
      automationRate: 0,
    },
    createdAt: now,
  });
  console.log('  ✓ KPI 베이스라인 생성');

  // ────────────────────────────────────────────────────────────────
  // 2. 위험도 스코어 (SHAP 기여도 포함) — SH 5개 단지 대표 시나리오
  // ────────────────────────────────────────────────────────────────
  const riskScores = [
    {
      _id: `riskScore:${ORG_ID}:rs_sh_gangnam_high`,
      type: 'riskScore',
      orgId: ORG_ID,
      targetType: 'BUILDING',
      targetId: `building:${ORG_ID}:bldg_gangnam_a`,
      targetName: 'SH 강남 보금자리 A동',
      complexId: `housingComplex:${ORG_ID}:cplx_gangnam`,
      score: 78,
      level: 'CRITICAL',
      confidence: 0.92,
      // SHAP 7지표 기여도 (사업계획서 핵심 기능)
      shapContributions: {
        age:        { pct: 28, rawValue: '32년', status: 'critical' },
        sensor:     { pct: 22, rawValue: '3건 이상', status: 'critical' },
        crack:      { pct: 18, rawValue: '5개소 초과', status: 'high' },
        inspection: { pct: 12, rawValue: '180일 경과', status: 'high' },
        weather:    { pct: 9,  rawValue: '동결해동 3회', status: 'medium' },
        complaint:  { pct: 7,  rawValue: '민원 12건', status: 'medium' },
        pipe:       { pct: 4,  rawValue: '배관 28년', status: 'high' },
      },
      evidence: {
        unrepairedDefects: 7, criticalDefects: 3,
        crackThresholdExceedances: 5, sensorCriticalCount: 3,
        openComplaints: 12, urgentComplaints: 4, activeAlerts: 5,
        assetAgeYears: 32, daysSinceLastInspection: 180,
        remainingLifeRatio: 0.12,
        evidenceSummary: '건물 노후화 32년 + IoT 센서 위험 3건 + 균열 임계 초과 5개소 — 즉각 현장점검 필요',
      },
      aiRecommendation: '즉각 구조 전문가 긴급 진단 의뢰. 균열 게이지 포인트 3곳 긴급 측정 필요.',
      calculatedAt: now, createdAt: now, isLatest: true,
    },
    {
      _id: `riskScore:${ORG_ID}:rs_sh_nowon_med`,
      type: 'riskScore',
      orgId: ORG_ID,
      targetType: 'BUILDING',
      targetId: `building:${ORG_ID}:bldg_nowon_b`,
      targetName: 'SH 노원 임대 B동',
      complexId: `housingComplex:${ORG_ID}:cplx_nowon`,
      score: 55,
      level: 'HIGH',
      confidence: 0.87,
      shapContributions: {
        age:        { pct: 24, rawValue: '24년', status: 'high' },
        sensor:     { pct: 18, rawValue: '1건', status: 'medium' },
        crack:      { pct: 20, rawValue: '2개소', status: 'high' },
        inspection: { pct: 14, rawValue: '90일 경과', status: 'medium' },
        weather:    { pct: 8,  rawValue: '계절 보정', status: 'medium' },
        complaint:  { pct: 10, rawValue: '민원 6건', status: 'medium' },
        pipe:       { pct: 6,  rawValue: '배관 22년', status: 'medium' },
      },
      evidence: {
        unrepairedDefects: 3, criticalDefects: 1,
        crackThresholdExceedances: 2, sensorCriticalCount: 1,
        openComplaints: 6, urgentComplaints: 1, activeAlerts: 2,
        assetAgeYears: 24, daysSinceLastInspection: 90,
        remainingLifeRatio: 0.35,
        evidenceSummary: '균열 임계 초과 2개소 + IoT CO 센서 경고 — 2주 내 현장 확인 권고',
      },
      aiRecommendation: '2주 내 균열 재측정 및 CO 센서 점검. 드라이비트 외벽 상태 확인 권고.',
      calculatedAt: now, createdAt: now, isLatest: true,
    },
    {
      _id: `riskScore:${ORG_ID}:rs_gbdc_gyeongsan_low`,
      type: 'riskScore',
      orgId: ORG_ID,
      targetType: 'COMPLEX',
      targetId: `housingComplex:${ORG_ID}:cplx_gyeongsan`,
      targetName: '경북 경산 단지 전체',
      complexId: `housingComplex:${ORG_ID}:cplx_gyeongsan`,
      score: 28,
      level: 'LOW',
      confidence: 0.94,
      shapContributions: {
        age:        { pct: 20, rawValue: '12년', status: 'normal' },
        sensor:     { pct: 12, rawValue: '이상 없음', status: 'normal' },
        crack:      { pct: 14, rawValue: '0개소', status: 'normal' },
        inspection: { pct: 18, rawValue: '30일 경과', status: 'normal' },
        weather:    { pct: 12, rawValue: '계절 보정', status: 'normal' },
        complaint:  { pct: 14, rawValue: '민원 1건', status: 'normal' },
        pipe:       { pct: 10, rawValue: '배관 12년', status: 'normal' },
      },
      evidence: {
        unrepairedDefects: 0, criticalDefects: 0,
        crackThresholdExceedances: 0, sensorCriticalCount: 0,
        openComplaints: 1, urgentComplaints: 0, activeAlerts: 0,
        assetAgeYears: 12, daysSinceLastInspection: 30,
        remainingLifeRatio: 0.72,
        evidenceSummary: '모든 지표 정상 — 정기 모니터링 유지',
      },
      aiRecommendation: '정기 모니터링 유지. 다음 점검 예정: 3개월 후.',
      calculatedAt: now, createdAt: now, isLatest: true,
    },
  ];

  for (const rs of riskScores) {
    await upsert(db, rs);
  }
  console.log(`  ✓ 위험도 스코어 ${riskScores.length}건 (SHAP 기여도 포함)`);

  // ────────────────────────────────────────────────────────────────
  // 3. IoT 센서 시계열 데이터 (5개 센서 × 24시간 시뮬레이션)
  // ────────────────────────────────────────────────────────────────
  const sensorTypes = [
    { type: 'TEMPERATURE', unit: '°C',  base: 26, noise: 4, criticalThreshold: 35 },
    { type: 'HUMIDITY',    unit: '%',   base: 65, noise: 15, criticalThreshold: 85 },
    { type: 'POWER',       unit: 'kWh', base: 8,  noise: 6, criticalThreshold: 20 },
    { type: 'VIBRATION',   unit: 'g',   base: 0.04, noise: 0.2, criticalThreshold: 0.5 },
    { type: 'CO',          unit: 'ppm', base: 3,  noise: 6, criticalThreshold: 10 },
  ];

  // 각 센서에 대해 최근 24시간 readings 생성
  for (const sensor of sensorTypes) {
    const readings = Array.from({ length: 24 }, (_, i) => {
      const baseVal = sensor.base + (Math.random() - 0.45) * sensor.noise;
      // CO는 오후 6~9시 높게 시뮬레이션
      const hourBoost = (sensor.type === 'CO' && i >= 17 && i <= 20) ? 4 : 0;
      const val = Math.max(0, baseVal + hourBoost);
      const thresholdStatus = val >= sensor.criticalThreshold ? 'CRITICAL'
        : val >= sensor.criticalThreshold * 0.8 ? 'WARNING' : 'NORMAL';
      const ts = new Date(Date.now() - (23 - i) * 3600_000).toISOString();
      return {
        _id: `sensorReading:${ORG_ID}:${sensor.type.toLowerCase()}_${i}`,
        type: 'sensorReading',
        orgId: ORG_ID,
        deviceId: `sensor:${ORG_ID}:dev_${sensor.type.toLowerCase()}_01`,
        sensorType: sensor.type,
        value: parseFloat(val.toFixed(3)),
        unit: sensor.unit,
        quality: 'GOOD',
        recordedAt: ts,
        thresholdStatus,
        createdAt: ts,
      };
    });

    for (const r of readings) {
      await upsert(db, r).catch(() => {}); // 중복 허용
    }
    console.log(`  ✓ IoT ${sensor.type} readings 24건`);
  }

  // ────────────────────────────────────────────────────────────────
  // 4. 자동화 실행 이력 (RPA 성과 — 사업계획서 자동화율 시나리오)
  // ────────────────────────────────────────────────────────────────
  const automationExecs = [
    {
      _id: `automationExecution:${ORG_ID}:exec_billing_001`,
      type: 'automationExecution',
      orgId: ORG_ID,
      ruleName: '관리비 고지서 자동 발행',
      ruleType: 'BILLING_NOTICE',
      status: 'COMPLETED',
      totalItems: 504,
      successItems: 492,
      failedItems: 12,
      autoFixedItems: 12,   // 오류 12건 자동 보정
      durationMs: 5400000,  // 90분 (기존 8시간 → 1.5시간)
      savedHours: 6.5,
      executedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: now,
      detail: '504세대 관리비 고지서 자동 생성. 오류 12건 Rule Engine 자동 보정 후 발송 완료.',
    },
    {
      _id: `automationExecution:${ORG_ID}:exec_contract_001`,
      type: 'automationExecution',
      orgId: ORG_ID,
      ruleName: '계약 만료 알림 자동 발송',
      ruleType: 'CONTRACT_EXPIRY',
      status: 'COMPLETED',
      totalItems: 40,
      successItems: 40,
      failedItems: 0,
      autoFixedItems: 0,
      durationMs: 300000,   // 5분
      savedHours: 2,
      executedAt: new Date(Date.now() - 172800000).toISOString(),
      createdAt: now,
      detail: '60일 내 만료 계약 40건 자동 추출 + 입주민 SMS 발송 완료. 자동화율 100%.',
    },
    {
      _id: `automationExecution:${ORG_ID}:exec_complaint_01`,
      type: 'automationExecution',
      orgId: ORG_ID,
      ruleName: 'KoBERT 민원 자동 분류 + 배정',
      ruleType: 'COMPLAINT_TRIAGE',
      status: 'COMPLETED',
      totalItems: 80,
      successItems: 60,   // 75% 자동 배정
      manualItems: 20,    // 25% 수동 처리
      failedItems: 0,
      durationMs: 300000, // 5분 (기존 2시간 → 5분)
      savedHours: 1.92,
      executedAt: new Date(Date.now() - 43200000).toISOString(),
      createdAt: now,
      detail: 'KoBERT 7종 분류 (신뢰도 72~97%). 60건 자동 배정, 20건 담당자 수동 확인.',
    },
    {
      _id: `automationExecution:${ORG_ID}:exec_report_001`,
      type: 'automationExecution',
      orgId: ORG_ID,
      ruleName: 'LLM+RAG 점검 보고서 자동 생성',
      ruleType: 'REPORT_GENERATION',
      status: 'COMPLETED',
      totalItems: 7,      // 7개 단지 보고서
      successItems: 7,
      failedItems: 0,
      durationMs: 252000, // 42분 (기존 3시간×7 = 21시간 → 42분)
      savedHours: 20.3,
      executedAt: new Date(Date.now() - 259200000).toISOString(),
      createdAt: now,
      detail: '7개 단지 정기 점검 보고서 자동 생성. 국토부 법령 자동 매핑 + 공문서 형식 PDF 발송.',
    },
  ];

  for (const exec of automationExecs) {
    await upsert(db, exec);
  }
  console.log(`  ✓ 자동화 실행 이력 ${automationExecs.length}건`);

  // ────────────────────────────────────────────────────────────────
  // 5. Human-in-the-Loop 시나리오 — 민원 트리아지 검토 이력
  // ────────────────────────────────────────────────────────────────
  const triagedComplaints = [
    {
      _id: `complaintTriage:${ORG_ID}:triage_demo_01`,
      type: 'complaintTriage',
      orgId: ORG_ID,
      complaintId: `complaint:${ORG_ID}:cmp_demo_01`,
      status: 'COMPLETED',
      decisionStatus: 'ACCEPTED',  // AI 결과 그대로 수락
      aiCategory: '구조·균열',
      aiSeverity: 'HIGH',
      urgencyScore: 87,
      suggestedPriority: 'URGENT',
      suggestedSla: '24h',
      aiConfidence: 0.94,
      classificationReason: 'KoBERT 분류 결과: 균열/누수 관련 구조적 문제 (신뢰도 94%). 자동 배정 실행.',
      isRuleBased: false,
      reviewHistory: [
        {
          action: 'ACCEPT',
          reviewedBy: `user:_platform:usr_admin01`,
          reviewedAt: now,
          note: 'AI 분류 정확. 긴급 처리 승인.',
        },
      ],
      routingSuggestions: [
        { role: 'INSPECTOR', reason: '구조 점검 전문가 필요', priority: 1 },
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: `complaintTriage:${ORG_ID}:triage_demo_02`,
      type: 'complaintTriage',
      orgId: ORG_ID,
      complaintId: `complaint:${ORG_ID}:cmp_demo_02`,
      status: 'COMPLETED',
      decisionStatus: 'MODIFIED',  // AI 결과 수정 후 확정
      aiCategory: '설비·화재',
      aiSeverity: 'MEDIUM',
      urgencyScore: 45,
      suggestedPriority: 'MEDIUM',
      suggestedSla: '72h',
      aiConfidence: 0.76,          // 신뢰도 낮음 → 검토 필요
      classificationReason: 'KoBERT 분류 결과: 드라이비트 외벽 이상 (신뢰도 76%). 담당자 검토 권고.',
      isRuleBased: false,
      reviewHistory: [
        {
          action: 'MODIFY',
          reviewedBy: `user:_platform:usr_admin01`,
          reviewedAt: now,
          note: '드라이비트 화재취약성으로 우선순위 HIGH로 상향. 즉시 현장 확인 필요.',
          changes: { aiSeverity: 'MEDIUM → HIGH', suggestedPriority: 'MEDIUM → HIGH', suggestedSla: '72h → 24h' },
        },
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  for (const t of triagedComplaints) {
    await upsert(db, t);
  }
  console.log(`  ✓ Human-in-the-Loop 시나리오 ${triagedComplaints.length}건`);

  console.log('\n✅ AI Performance seed 완료!\n');
  console.log('📊 생성된 데이터:');
  console.log('   - KPI 베이스라인 (AI 도입 전 기준선) 1건');
  console.log('   - 위험도 스코어 + SHAP 기여도 3건 (위험/높음/정상)');
  console.log('   - IoT 5센서 readings 120건 (24시간 시계열)');
  console.log('   - RPA 자동화 실행 이력 4건');
  console.log('   - Human-in-the-Loop 트리아지 시나리오 2건');
}

main().catch((e) => {
  console.error('Seed 실패:', e.message ?? e);
  process.exit(1);
});
