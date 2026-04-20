#!/usr/bin/env python3
"""
에이톰-AX 부하 테스트  AX-LT-2026-001
TRL-8 §6.2 — 동시 50명 × 60초
합격 기준: P95 ≤ 1,500ms  AND  오류율 < 5%

실행:
    pip install aiohttp
    python tests/load/load_test.py
    python tests/load/load_test.py --users 50 --duration 60 --api-url http://localhost:3000/api/v1
    python tests/load/load_test.py --users 10 --duration 30   # 빠른 smoke test
"""

import asyncio
import aiohttp
import argparse
import json
import math
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# ── 설정 ──────────────────────────────────────────────────────────────────────

DEFAULT_API_URL  = "http://localhost:3000/api/v1"
DEFAULT_USERS    = 50
DEFAULT_DURATION = 60   # seconds
DEFAULT_EMAIL    = "admin@happy-housing.kr"
DEFAULT_PASSWORD = "Admin@1234"

# ── SLO 기준 (TRL-8 §6.1 / §6.2) ────────────────────────────────────────────

SLO = {
    "p95_ms":      1_500,   # P95 ≤ 1,500ms
    "error_rate":  0.05,    # 오류율 < 5%
    "success_rate": 0.99,   # 성공률 ≥ 99%
}

# ── 39개 엔드포인트 정의 (전체 API 커버리지) ─────────────────────────────────

ENDPOINTS = [
    # ── 경량 (캐시 기반, AVG ≤ 500ms) ──────────────────────────────────────────
    {"id": "dashboard",              "path": "/dashboard",                        "slo_avg": 500},
    {"id": "kpi_summary",            "path": "/kpi/summary",                      "slo_avg": 500},
    {"id": "alerts_count",           "path": "/alerts/count/active",              "slo_avg": 500},
    {"id": "feature_flags",          "path": "/feature-flags",                    "slo_avg": 500},
    {"id": "auth_me",                "path": "/auth/me",                          "slo_avg": 500},
    {"id": "organizations_current",  "path": "/organizations/current",            "slo_avg": 500},
    {"id": "automation_summary",     "path": "/automation-executions/summary",    "slo_avg": 500},
    {"id": "rpa_summary",            "path": "/rpa/summary",                      "slo_avg": 500},
    {"id": "ai_detections_stats",    "path": "/ai-detections/stats",              "slo_avg": 500},
    {"id": "crack_analysis_stats",   "path": "/crack-analysis/stats",             "slo_avg": 500},
    {"id": "diagnosis_stats",        "path": "/diagnosis-opinions/stats",         "slo_avg": 500},
    {"id": "complaint_triage_stats", "path": "/complaint-triage/stats",           "slo_avg": 500},
    # ── 중량 (DB 조회, P95 ≤ 1,500ms) ──────────────────────────────────────────
    {"id": "defects_list",           "path": "/defects?limit=20",                 "slo_p95": 1_500},
    {"id": "complaints_list",        "path": "/complaints?limit=20",              "slo_p95": 1_500},
    {"id": "cracks_list",            "path": "/cracks/gauge-points?limit=20",     "slo_p95": 1_500},
    {"id": "alerts_list",            "path": "/alerts?status=ACTIVE&limit=20",    "slo_p95": 1_500},
    {"id": "complexes_list",         "path": "/complexes",                        "slo_p95": 1_500},
    {"id": "projects_list",          "path": "/projects?limit=20",                "slo_p95": 1_500},
    {"id": "schedules_list",         "path": "/schedules?limit=20",               "slo_p95": 1_500},
    {"id": "work_orders_list",       "path": "/work-orders?limit=20",             "slo_p95": 1_500},
    {"id": "defect_candidates",      "path": "/defect-candidates?limit=20",       "slo_p95": 1_500},
    {"id": "reports_list",           "path": "/reports?limit=20",                 "slo_p95": 1_500},
    {"id": "organizations_list",     "path": "/organizations",                    "slo_p95": 1_500},
    {"id": "users_list",             "path": "/users?limit=20",                   "slo_p95": 1_500},
    {"id": "buildings_list",         "path": "/buildings?limit=20",               "slo_p95": 1_500},
    {"id": "zones_list",             "path": "/zones?limit=20",                   "slo_p95": 1_500},
    {"id": "assets_list",            "path": "/assets?limit=20",                  "slo_p95": 1_500},
    {"id": "sensors_list",           "path": "/sensors?limit=20",                 "slo_p95": 1_500},
    {"id": "sensor_readings",        "path": "/sensor-readings?limit=20",         "slo_p95": 1_500},
    {"id": "drone_missions",         "path": "/drone-missions?limit=20",          "slo_p95": 1_500},
    {"id": "automation_rules",       "path": "/automation-rules?limit=20",        "slo_p95": 1_500},
    {"id": "automation_executions",  "path": "/automation-executions?limit=20",   "slo_p95": 1_500},
    {"id": "jobs_list",              "path": "/jobs?limit=20",                    "slo_p95": 1_500},
    {"id": "risk_scoring",           "path": "/risk-scoring?limit=20",            "slo_p95": 1_500},
    {"id": "maintenance_recs",       "path": "/maintenance-recommendations?limit=20", "slo_p95": 1_500},
    {"id": "complaint_triage",       "path": "/complaint-triage?limit=20",        "slo_p95": 1_500},
    {"id": "crack_analysis",         "path": "/crack-analysis?limit=20",          "slo_p95": 1_500},
    {"id": "diagnosis_opinions",     "path": "/diagnosis-opinions?limit=20",      "slo_p95": 1_500},
    {"id": "repair_recs",            "path": "/repair-recommendations?limit=20",  "slo_p95": 1_500},
]

# ── 결과 자료구조 ──────────────────────────────────────────────────────────────

@dataclass
class RequestResult:
    endpoint_id: str
    status:      int
    latency_ms:  float
    ok:          bool
    ts:          float = field(default_factory=time.monotonic)

# ── Little's Law 계산 ─────────────────────────────────────────────────────────

def littles_law_stats(concurrent_users: int, avg_latency_s: float) -> dict:
    lam = concurrent_users / avg_latency_s if avg_latency_s > 0 else 0
    return {
        "L": concurrent_users,
        "W_s": round(avg_latency_s, 4),
        "lambda_rps": round(lam, 2),
    }

# ── 백분위수 계산 ──────────────────────────────────────────────────────────────

def percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = math.ceil((p / 100) * len(sorted_vals)) - 1
    return sorted_vals[max(0, min(idx, len(sorted_vals) - 1))]

def stats(latencies: list[float]) -> dict:
    if not latencies:
        return {"count": 0, "avg": 0, "min": 0, "max": 0, "p50": 0, "p95": 0, "p99": 0}
    s = sorted(latencies)
    n = len(s)
    return {
        "count": n,
        "avg":   round(sum(s) / n, 1),
        "min":   round(s[0], 1),
        "max":   round(s[-1], 1),
        "p50":   round(percentile(s, 50), 1),
        "p95":   round(percentile(s, 95), 1),
        "p99":   round(percentile(s, 99), 1),
    }

# ── 인증 ───────────────────────────────────────────────────────────────────────

async def login(session: aiohttp.ClientSession, api_url: str, email: str, password: str) -> Optional[str]:
    try:
        async with session.post(
            f"{api_url}/auth/login",
            json={"email": email, "password": password},
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            if resp.status == 200 or resp.status == 201:
                body = await resp.json(content_type=None)
                token = (
                    body.get("data", {}).get("accessToken")
                    or body.get("accessToken")
                    or body.get("data", {}).get("access_token")
                )
                return token
            print(f"  [auth] login failed: HTTP {resp.status}")
            return None
    except Exception as e:
        print(f"  [auth] login error: {e}")
        return None

# ── 단일 요청 ──────────────────────────────────────────────────────────────────

async def make_request(
    session: aiohttp.ClientSession,
    api_url: str,
    endpoint: dict,
    headers: dict,
    results: list[RequestResult],
) -> None:
    url = f"{api_url}{endpoint['path']}"
    t0 = time.monotonic()
    try:
        async with session.get(
            url,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=5),
        ) as resp:
            latency_ms = (time.monotonic() - t0) * 1000
            ok = resp.status < 400
            results.append(RequestResult(
                endpoint_id=endpoint["id"],
                status=resp.status,
                latency_ms=latency_ms,
                ok=ok,
            ))
    except asyncio.TimeoutError:
        latency_ms = (time.monotonic() - t0) * 1000
        results.append(RequestResult(endpoint["id"], 0, latency_ms, False))
    except Exception:
        latency_ms = (time.monotonic() - t0) * 1000
        results.append(RequestResult(endpoint["id"], 0, latency_ms, False))

# ── 가상 사용자 루프 ─────────────────────────────────────────────────────────

async def virtual_user(
    user_id: int,
    api_url: str,
    token: Optional[str],
    duration: float,
    results: list[RequestResult],
) -> None:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    connector = aiohttp.TCPConnector(limit=0, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        deadline = time.monotonic() + duration
        ep_idx = user_id % len(ENDPOINTS)
        while time.monotonic() < deadline:
            ep = ENDPOINTS[ep_idx % len(ENDPOINTS)]
            await make_request(session, api_url, ep, headers, results)
            ep_idx += 1
            await asyncio.sleep(0.05)   # 20 req/s per VU 상한 (token bucket)

# ── 메인 부하 테스트 ──────────────────────────────────────────────────────────

async def run_load_test(api_url: str, users: int, duration: int, email: str, password: str) -> dict:
    print(f"\n{'═'*60}")
    print(f"  에이톰-AX 부하 테스트  (TRL-8 §6.2)")
    print(f"  API: {api_url}")
    print(f"  가상 사용자: {users}명 × {duration}초")
    print(f"  합격 기준: P95 ≤ {SLO['p95_ms']}ms  AND  오류율 < {SLO['error_rate']*100:.0f}%")
    print(f"{'═'*60}\n")

    # 1. 인증
    print("[1/3] 인증 토큰 획득 중...")
    conn = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=conn) as sess:
        token = await login(sess, api_url, email, password)
    if token:
        print(f"  ✓ JWT 토큰 획득 완료 (첫 40자: {token[:40]}...)")
    else:
        print("  ⚠ 토큰 획득 실패 — 인증 없이 진행 (일부 엔드포인트 401 예상)")

    # 2. 워밍업 (15초, 39 VU — 모든 캐시 프리워밍)
    print("\n[2/3] 워밍업 (15초)...")
    warmup_results: list[RequestResult] = []
    warmup_tasks = [
        virtual_user(i, api_url, token, 15, warmup_results) for i in range(min(len(ENDPOINTS), users))
    ]
    await asyncio.gather(*warmup_tasks)
    print(f"  워밍업 요청: {len(warmup_results)}건 완료 (엔드포인트 {len(ENDPOINTS)}개 프리워밍)")

    # 3. 본 테스트
    print(f"\n[3/3] 부하 테스트 시작 ({users}명 × {duration}초)...")
    start_ts = datetime.now(timezone.utc).isoformat()
    t_start = time.monotonic()

    results: list[RequestResult] = []
    tasks = [
        virtual_user(i, api_url, token, duration, results) for i in range(users)
    ]
    await asyncio.gather(*tasks)

    elapsed = time.monotonic() - t_start
    end_ts = datetime.now(timezone.utc).isoformat()
    print(f"  완료: {len(results)}건 / {elapsed:.1f}초")

    return _analyze(results, elapsed, users, start_ts, end_ts, api_url)

# ── 분석 & 리포트 ─────────────────────────────────────────────────────────────

def _analyze(
    results: list[RequestResult],
    elapsed: float,
    users: int,
    start_ts: str,
    end_ts: str,
    api_url: str,
) -> dict:
    total = len(results)
    if total == 0:
        return {"error": "결과 없음 — API 서버에 연결할 수 없습니다"}

    ok_count  = sum(1 for r in results if r.ok)
    err_count = total - ok_count
    error_rate   = err_count / total
    success_rate = ok_count / total
    actual_rps   = total / elapsed

    all_latencies = [r.latency_ms for r in results]
    overall = stats(all_latencies)

    # Little's Law
    little = littles_law_stats(users, overall["avg"] / 1000)

    # 95% 신뢰구간
    avg = overall["avg"]
    if len(all_latencies) > 1:
        import statistics as _st
        std = _st.stdev(all_latencies)
        n = len(all_latencies)
        ci_half = 1.96 * (std / math.sqrt(n))
        ci = (round(avg - ci_half, 1), round(avg + ci_half, 1))
    else:
        ci = (avg, avg)

    # 엔드포인트별 통계
    by_ep: dict[str, list[float]] = {}
    for r in results:
        by_ep.setdefault(r.endpoint_id, []).append(r.latency_ms)
    ep_stats = {eid: stats(lats) for eid, lats in by_ep.items()}

    # Pass/Fail 판정
    p95_pass  = overall["p95"] <= SLO["p95_ms"]
    err_pass  = error_rate < SLO["error_rate"]
    sr_pass   = success_rate >= SLO["success_rate"]
    passed    = p95_pass and err_pass

    # 엔드포인트별 판정
    ep_results = []
    for ep in ENDPOINTS:
        eid  = ep["id"]
        es   = ep_stats.get(eid, {"count": 0, "avg": 0, "p95": 0})
        slo  = ep.get("slo_avg") or ep.get("slo_p95", 1500)
        key  = "avg" if "slo_avg" in ep else "p95"
        val  = es[key]
        ok   = val <= slo
        ep_results.append({
            "endpoint": eid,
            "path":     ep["path"],
            "count":    es["count"],
            "avg_ms":   es["avg"],
            "p95_ms":   es["p95"],
            "slo_ms":   slo,
            "slo_key":  key,
            "pass":     ok,
        })

    report = {
        "document":   "AX-LT-2026-001",
        "section":    "§6.2 부하 테스트",
        "api_url":    api_url,
        "started_at": start_ts,
        "ended_at":   end_ts,
        "duration_s": round(elapsed, 2),
        "virtual_users": users,
        "total_requests": total,
        "ok_requests":    ok_count,
        "error_requests": err_count,
        "actual_rps":     round(actual_rps, 2),
        "little_law":     little,
        "overall":        overall,
        "confidence_interval_95": ci,
        "error_rate":  round(error_rate, 4),
        "success_rate": round(success_rate, 4),
        "slo": SLO,
        "pass": {
            "p95":     p95_pass,
            "error_rate": err_pass,
            "success_rate": sr_pass,
            "overall": passed,
        },
        "endpoint_results": ep_results,
    }

    _print_report(report)
    return report

def _print_report(r: dict) -> None:
    SEP = "─" * 60

    print(f"\n{'═'*60}")
    print(f"  부하 테스트 결과 ({r['document']})")
    print(f"  기간: {r['started_at']} ~ {r['ended_at']}")
    print(f"{'═'*60}")

    print(f"\n■ 전체 지표")
    print(f"  총 요청수   : {r['total_requests']:,}건  ({r['actual_rps']} RPS)")
    print(f"  성공        : {r['ok_requests']:,}건")
    print(f"  오류        : {r['error_requests']:,}건  (오류율 {r['error_rate']*100:.2f}%)")
    print(f"  평균 응답   : {r['overall']['avg']} ms")
    print(f"  P50         : {r['overall']['p50']} ms")
    print(f"  P95         : {r['overall']['p95']} ms  {'✓' if r['pass']['p95'] else '✗ SLO 초과'}")
    print(f"  P99         : {r['overall']['p99']} ms")
    print(f"  95% CI      : [{r['confidence_interval_95'][0]}, {r['confidence_interval_95'][1]}] ms")

    print(f"\n■ Little's Law 검증")
    ll = r["little_law"]
    print(f"  L (동시 사용자) = {ll['L']}")
    print(f"  W (평균 응답)   = {ll['W_s']} s")
    print(f"  λ (처리량)      = {ll['lambda_rps']} RPS  (목표: 100 RPS)")

    print(f"\n■ 엔드포인트별 결과")
    print(f"  {'ID':<22} {'수':<6} {'avg':>7} {'P95':>7} {'SLO':>7} {'판정'}")
    print(f"  {SEP}")
    for ep in r["endpoint_results"]:
        flag = "✓ PASS" if ep["pass"] else "✗ FAIL"
        print(f"  {ep['endpoint']:<22} {ep['count']:<6} {ep['avg_ms']:>6.0f}ms {ep['p95_ms']:>6.0f}ms {ep['slo_ms']:>6}ms  {flag}")

    print(f"\n{'═'*60}")
    verdict = "✅ PASS — TRL-8 §6.2 합격 기준 충족" if r["pass"]["overall"] \
              else "❌ FAIL — P95 또는 오류율 기준 미달"
    print(f"  최종 판정: {verdict}")
    print(f"  P95 {r['overall']['p95']}ms ≤ {r['slo']['p95_ms']}ms : {'✓' if r['pass']['p95'] else '✗'}")
    print(f"  오류율 {r['error_rate']*100:.2f}% < {r['slo']['error_rate']*100:.0f}%  : {'✓' if r['pass']['error_rate'] else '✗'}")
    print(f"{'═'*60}\n")

# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="에이톰-AX 부하 테스트 (TRL-8 §6.2)")
    parser.add_argument("--api-url",  default=DEFAULT_API_URL,  help="API 기본 URL")
    parser.add_argument("--users",    type=int, default=DEFAULT_USERS,    help="가상 사용자 수 (기본: 50)")
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION, help="테스트 시간(초) (기본: 60)")
    parser.add_argument("--email",    default=DEFAULT_EMAIL,    help="관리자 이메일")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="관리자 비밀번호")
    parser.add_argument("--output",   default=None,             help="JSON 결과 파일 경로 (선택)")
    args = parser.parse_args()

    report = asyncio.run(run_load_test(
        api_url=args.api_url,
        users=args.users,
        duration=args.duration,
        email=args.email,
        password=args.password,
    ))

    if args.output:
        import os
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"JSON 결과 저장: {args.output}")

    passed = report.get("pass", {}).get("overall", False)
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()
