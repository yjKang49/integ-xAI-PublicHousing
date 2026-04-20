/**
 * 에이톰-AX 부하 테스트 — k6 버전 (TRL-8 §6.2)
 * 동시 50명 × 60초, 합격 기준: P95 ≤ 1,500ms AND 오류율 < 5%
 *
 * 실행:
 *   k6 run tests/load/load_test.k6.js
 *   k6 run --env API_URL=http://localhost:3000/api/v1 tests/load/load_test.k6.js
 *   k6 run --vus 10 --duration 30s tests/load/load_test.k6.js  # smoke
 */

import http   from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── 설정 ──────────────────────────────────────────────────────────────────────

const API_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';
const EMAIL   = __ENV.EMAIL   || 'admin@happy-housing.kr';
const PASS    = __ENV.PASS    || 'Admin@1234';

// ── SLO 임계값 ────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '10s', target: 10  },   // ramp-up
    { duration: '50s', target: 50  },   // 본 부하: 동시 50명
    { duration: '10s', target: 0   },   // ramp-down
  ],
  thresholds: {
    'http_req_duration':        ['p(95)<1500'],   // P95 ≤ 1,500ms
    'http_req_failed':          ['rate<0.05'],    // 오류율 < 5%
    'endpoint_dashboard':       ['p(95)<500'],
    'endpoint_alerts_count':    ['p(95)<500'],
    'endpoint_defects_list':    ['p(95)<1500'],
    'endpoint_complaints_list': ['p(95)<1500'],
    'endpoint_cracks_list':     ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};

// ── 커스텀 메트릭 ─────────────────────────────────────────────────────────────

const endpointMetrics = {
  dashboard:       new Trend('endpoint_dashboard',       true),
  alerts_count:    new Trend('endpoint_alerts_count',    true),
  defects_list:    new Trend('endpoint_defects_list',    true),
  complaints_list: new Trend('endpoint_complaints_list', true),
  cracks_list:     new Trend('endpoint_cracks_list',     true),
};
const successRate = new Rate('success_rate');
const errCount    = new Counter('error_count');

// ── 15개 엔드포인트 ───────────────────────────────────────────────────────────

const ENDPOINTS = [
  { id: 'dashboard',         path: '/dashboard' },
  { id: 'kpi_summary',       path: '/kpi/summary' },
  { id: 'alerts_count',      path: '/alerts/count/active' },
  { id: 'feature_flags',     path: '/feature-flags' },
  { id: 'auth_me',           path: '/auth/me' },
  { id: 'defects_list',      path: '/defects?limit=20' },
  { id: 'complaints_list',   path: '/complaints?limit=20' },
  { id: 'cracks_list',       path: '/cracks?limit=20' },
  { id: 'alerts_list',       path: '/alerts?status=ACTIVE&limit=20' },
  { id: 'complexes_list',    path: '/complexes' },
  { id: 'projects_list',     path: '/projects?limit=20' },
  { id: 'schedules_list',    path: '/schedules?limit=20' },
  { id: 'work_orders_list',  path: '/work-orders?limit=20' },
  { id: 'ai_detections',     path: '/defect-candidates?limit=20' },
  { id: 'reports_list',      path: '/reports?limit=20' },
];

// ── setup — JWT 토큰 획득 ─────────────────────────────────────────────────────

export function setup() {
  const res = http.post(`${API_URL}/auth/login`, JSON.stringify({
    email: EMAIL, password: PASS,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status === 200 || res.status === 201) {
    const body = JSON.parse(res.body);
    const token = body?.data?.accessToken || body?.accessToken || null;
    if (token) {
      console.log(`✓ JWT 토큰 획득 (${token.slice(0, 40)}...)`);
      return { token };
    }
  }
  console.warn(`⚠ 인증 실패 (${res.status}) — 토큰 없이 진행`);
  return { token: null };
}

// ── default — 각 VU 메인 루프 ─────────────────────────────────────────────────

export default function (data) {
  const headers = data.token
    ? { Authorization: `Bearer ${data.token}` }
    : {};

  // VU ID 기반으로 시작 엔드포인트를 분산
  const vuIdx = __VU % ENDPOINTS.length;

  for (let i = 0; i < 3; i++) {
    const ep = ENDPOINTS[(vuIdx + i) % ENDPOINTS.length];
    group(ep.id, () => {
      const res = http.get(`${API_URL}${ep.path}`, { headers, timeout: '5s' });
      const ok  = check(res, { [`${ep.id} < 1500ms`]: (r) => r.timings.duration < 1500 });

      successRate.add(ok);
      if (!ok) errCount.add(1);

      if (endpointMetrics[ep.id]) {
        endpointMetrics[ep.id].add(res.timings.duration);
      }
    });
  }

  sleep(0.05);
}

// ── handleSummary — 최종 리포트 ───────────────────────────────────────────────

export function handleSummary(data) {
  const p95  = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const errR = data.metrics.http_req_failed?.values?.rate ?? 0;
  const pass = p95 <= 1500 && errR < 0.05;

  const report = {
    document: 'AX-LT-2026-001',
    section:  '§6.2 부하 테스트 (k6)',
    pass,
    p95_ms:     Math.round(p95),
    error_rate: +(errR * 100).toFixed(2),
    total_requests: data.metrics.http_reqs?.values?.count ?? 0,
    verdict: pass
      ? '✅ PASS — TRL-8 §6.2 합격 기준 충족'
      : '❌ FAIL — P95 또는 오류율 기준 미달',
  };

  console.log('\n' + '═'.repeat(60));
  console.log(`  최종 판정: ${report.verdict}`);
  console.log(`  P95: ${report.p95_ms}ms  오류율: ${report.error_rate}%`);
  console.log('═'.repeat(60) + '\n');

  return {
    'tests/load/results/k6_result.json': JSON.stringify({ ...report, raw: data }, null, 2),
    stdout: '',
  };
}
