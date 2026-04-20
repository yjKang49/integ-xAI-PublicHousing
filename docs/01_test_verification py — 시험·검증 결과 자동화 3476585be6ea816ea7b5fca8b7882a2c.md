# 01_test_verification.py — 시험·검증 결과 자동화

> **문서번호:** AX-TV-2026-001
> 

> **목적:** 성능 실측, AI 정확도 실측, UAT 결과를 자동 생성하여 TRL-8 시험성적서를 보완
> 

> **로컬 경로:** `F:\ATOM_Project\atom_followup_202604W4\scripts\01_test_verification.py`
> 

---

## 실행 방법

```bash
# 의존성 설치
pip install requests aiohttp pandas matplotlib openpyxl jinja2 tabulate

# 실행
python 01_test_verification.py --api-url http://localhost:3000/api/v1 --output ./results

# 부하테스트 스킵
python 01_test_verification.py --skip-load-test --output ./results
```

## 출력 파일

| 파일 | 설명 |
| --- | --- |
| `시험검증_Pass_Fail_요약.xlsx` | API 응답시간, 부하테스트, AI 작업 Pass/Fail |
| `UAT_체크리스트.xlsx` | 20개 UAT 시나리오 (수동 테스트용) |
| `api_response_times.png` | API 응답시간 차트 |
| `test_verification_results.json` | 전체 결과 JSON |

---

# 기술 보고서 (Technical Report)

## 1. API 성능 측정 이론

API 응답시간은 클라이언트가 요청을 보낸 시점부터 응답을 받는 시점까지의 시간입니다.

```
요청 전송    서버 처리    응답 전송
|------>|========|------>|
        Response Time
```

## 2. 백분위수 (Percentile) — P95, P99

**왜 평균이 아니라 P95를 쓸까?**

평균은 극단적으로 빠른 응답 몇 개가 느린 응답을 감춰버립니다. P95는 "상위 5%의 느린 요청을 제외한 최악의 응답시간"입니다.

```
수식: P(k) = x[⌈(k/100) × n⌉]

예시: 100회 측정에서 P95
     = 95번째로 빠른 값
     = "사용자 100명 중 95명은 이 시간 이내로 응답 받음"
```

## 3. 부하 테스트 이론 — Little's Law

```
 L = λ × W

 L = 시스템 내 평균 요청 수 (동시 접속자)
 λ = 초당 요청 수 (Throughput, RPS)
 W = 평균 응답 시간

예시: 동시 50명, 평균 응답 0.5초
     λ = 50 / 0.5 = 100 RPS 필요
```

## 4. 통계 수식

```
평균:      μ = (1/n) × Σxᵢ
표준편차:  σ = √[(1/n) × Σ(xᵢ - μ)²]
신뢰구간:  CI = μ ± z(α/2) × (σ/√n)
성공률:  SR = (성공 수 / 전체 수) × 100%
오류율:  ε = (실패 수 / 전체 수) × 100%
```

## 5. UAT 방법론 (IEEE 829)

IEEE 829는 소프트웨어 테스트 문서화 표준입니다. UAT는 실제 사용자가 시스템을 사용하여 요구사항을 충족하는지 검증하는 최종 테스트입니다.

| 항목 | 설명 |
| --- | --- |
| Test Plan | 테스트 목표, 범위, 일정 |
| Test Case | 개별 테스트 절차 |
| Test Log | 실행 기록 |
| Test Report | 결과 요약 |

## 6. 참고문헌 (References)

### 6.1 표준 문서 (Standards)

1. **RFC 7230-7235** (2014) — *Hypertext Transfer Protocol (HTTP/1.1)*. IETF.
2. **ISO/IEC 25010:2011** — *Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. ISO.
3. **ISO/IEC/IEEE 29119-1~5:2013** — *Software and systems engineering — Software testing*. ISO/IEC/IEEE (IEEE 829 후속).
4. **IEEE 829-2008** — *IEEE Standard for Software and System Test Documentation*. IEEE.
5. **NIST SP 800-53 Rev. 5** (2020) — *Security and Privacy Controls for Information Systems and Organizations*. NIST.
6. **NIST SP 800-115** (2008) — *Technical Guide to Information Security Testing and Assessment*. NIST.

### 6.2 대기행렬 · 성능 이론 (Queueing & Performance Theory)

1. **Little, J.D.C. (1961)** — "A Proof for the Queuing Formula: L = λW". *Operations Research*, **9**(3), 383–387. DOI: 10.1287/opre.9.3.383.
2. **Little, J.D.C., Graves, S.C. (2008)** — "Little's Law". In: *Building Intuition*, Springer, pp. 81–100.
3. **Kendall, D.G. (1953)** — "Stochastic Processes Occurring in the Theory of Queues". *Annals of Mathematical Statistics*, **24**(3).
4. **Jain, R. (1991)** — *The Art of Computer Systems Performance Analysis*. Wiley. ISBN 0-471-50336-3.
5. **Menascé, D.A., Almeida, V.A.F. (2001)** — *Capacity Planning for Web Services*. Prentice Hall.
6. **Menascé, D.A. (2002)** — "Load Testing of Web Sites". *IEEE Internet Computing*, **6**(4), 70–74.

### 6.3 부하 · 성능 테스트 (Load & Performance Testing)

1. **Barford, P., Crovella, M. (1998)** — "Generating Representative Web Workloads for Network and Server Performance Evaluation". *ACM SIGMETRICS*, 151–160.
2. **Draheim, D., Grundy, J., Hosking, J., Lutteroth, C., Weber, G. (2006)** — "Realistic Load Testing of Web Applications". *IEEE CSMR*, 57–70.
3. **Jiang, Z.M., Hassan, A.E. (2015)** — "A Survey on Load Testing of Large-Scale Software Systems". *IEEE Transactions on Software Engineering*, **41**(11), 1091–1118.
4. **Molyneaux, I. (2009)** — *The Art of Application Performance Testing*. O'Reilly. ISBN 978-0-596-52066-3.
5. **Meier, J.D. et al. (2007)** — *Performance Testing Guidance for Web Applications*. Microsoft Patterns & Practices.
6. **Arcuri, A. (2017)** — "RESTful API Automated Test Case Generation". *IEEE QRS*, 9–20.

### 6.4 소프트웨어 테스팅 방법론 (Software Testing Methodology)

1. **Myers, G.J., Sandler, C., Badgett, T. (2011)** — *The Art of Software Testing*, 3rd ed. Wiley. ISBN 978-1-118-03196-4.
2. **Beizer, B. (1990)** — *Software Testing Techniques*, 2nd ed. Van Nostrand Reinhold.
3. **Whittaker, J.A. (2000)** — "What Is Software Testing? And Why Is It So Hard?". *IEEE Software*, **17**(1), 70–79.
4. **Kaner, C., Bach, J., Pettichord, B. (2001)** — *Lessons Learned in Software Testing*. Wiley.

### 6.5 UAT · 사용성 (User Acceptance & Usability)

1. **Nielsen, J. (1993)** — *Usability Engineering*. Academic Press. ISBN 0-12-518406-9.
2. **Hass, A.M.J. (2008)** — *Guide to Advanced Software Testing*. Artech House.
3. **Dennis, A., Wixom, B.H., Roth, R.M. (2012)** — *Systems Analysis and Design*, 5th ed. Wiley.
4. **Rubin, J., Chisnell, D. (2008)** — *Handbook of Usability Testing*, 2nd ed. Wiley.

---

## 핵심 구조

### 0. 시험 기준 설정 (비기능 요구사항 기반)

```python
@dataclass
class TestConfig:
    """시험 환경 설정"""
    nas_base_path: str = "//192.168.0.100/ax-platform"
    api_base_url: str = "http://localhost:3000/api/v1"
    api_auth_email: str = "admin@atom-eng.co.kr"
    api_auth_password: str = "test1234!"
    load_test_concurrent_users: int = 50
    load_test_duration_sec: int = 60
    criteria: dict = field(default_factory=lambda: {
        "dashboard_api_response_ms": 500,
        "general_api_response_p95_ms": 1500,
        "concurrent_users": 50,
        "ai_job_processing_sec": 60,
        "pdf_generation_sec": 30,
        "system_availability_pct": 99.0,
        "rto_hours": 2,
        "rpo_hours": 24,
    })
```

### 1. API 응답시간 측정 (15개 엔드포인트, 100회 반복)

```python
class ApiPerformanceTester:
    TARGET_ENDPOINTS = [
        ("GET",  "/dashboard",              "KPI 대시보드 집계",       True),
        ("POST", "/auth/login",             "사용자 로그인",           False),
        ("GET",  "/defects",                "결함 목록 조회",          False),
        ("GET",  "/cracks/gauge-points",    "균열 게이지 목록",        False),
        ("GET",  "/complaints",             "민원 목록 조회",          False),
        ("GET",  "/alerts/count/active",    "활성 경보 카운트",        True),
        ("GET",  "/kpi",                    "KPI 월별 조회",           False),
        # ... 총 15개
    ]

    def measure_endpoint(self, method, path, description, iterations=100):
        for i in range(iterations):
            start = time.perf_counter()
            resp = self.session.get(url, timeout=15)
            elapsed_ms = (time.perf_counter() - start) * 1000
            result.response_times_ms.append(round(elapsed_ms, 2))
```

### 2. 부하 테스트 (동시 50명, ThreadPoolExecutor)

```python
class LoadTester:
    def run(self) -> LoadTestResult:
        with ThreadPoolExecutor(max_workers=50) as executor:
            while time.time() < end_time:
                futures = [
                    executor.submit(single_request, uid)
                    for uid in range(current_users)
                ]
                # P95 ≤ 1500ms, 오류율 < 5% 기준 판정
```

### 3. AI 작업 처리시간 측정

```python
class AiJobTester:
    def measure_ai_detection(self, test_image_paths, iterations=10):
        # POST /ai-detections/trigger → 폴링 → 완료 대기
        # 기준: ≤ 60초

    def measure_crack_analysis(self, test_image_paths, iterations=10):
        # POST /crack-analysis/trigger
        # 기준: ≤ 60초

    def measure_pdf_generation(self, iterations=5):
        # POST /reports/generate
        # 기준: ≤ 30초
```

### 4. UAT 체크리스트 (20개 시나리오)

```python
class UatGenerator:
    SCENARIOS = [
        UatScenario("UAT-AUTH-001", "인증", "관리자 로그인 → JWT 토큰 발급", ...),
        UatScenario("UAT-FAC-001", "시설물", "단지 등록 → QR 코드 자동 생성", ...),
        UatScenario("UAT-INSP-001", "점검", "점검 프로젝트 → 세션 배정 → 승인", ...),
        UatScenario("UAT-DEF-001", "결함", "결함 등록 → CRITICAL 자동 경보", ...),
        UatScenario("UAT-CRK-001", "균열", "게이지 등록 → 임계치 초과 경보", ...),
        UatScenario("UAT-AI-001", "AI", "AI 탐지 → Human-in-the-Loop → 승격", ...),
        UatScenario("UAT-AI-003", "AI", "LLM 진단 의견 (Claude API)", ...),
        UatScenario("UAT-COMP-001", "민원", "민원 → AI 분류 (KoBERT)", ...),
        UatScenario("UAT-RPA-001", "RPA", "자동화 룰 → 트리거 → 실행 이력", ...),
        UatScenario("UAT-RPT-001", "보고서", "PDF 보고서 자동 생성", ...),
        UatScenario("UAT-IOT-001", "IoT", "센서 등록 → 임계치 경보", ...),
        # ... 총 20개
    ]
```

### 5. Pass/Fail 요약표 자동 생성

```python
class TestReportGenerator:
    def generate_pass_fail_excel(self, api_df, load_result, ai_results):
        # Sheet 1: API 응답시간 (15개 엔드포인트)
        # Sheet 2: 부하테스트 (동시 50명)
        # Sheet 3: AI 작업 (탐지, 균열, PDF)
    
    def generate_response_time_chart(self, api_results):
        # AVG + P95 응답시간 수평 바 차트
        # 500ms / 1500ms 임계선 표시
```

---

# 전체 소스코드 (이론/수식 포함)

아래는 `01_test_verification.py`의 전체 소스코드입니다. 이론적 배경, 수학 수식, 참고문헌이 모두 포함된 완전한 버전입니다.

```python
"""
===============================================================================
===============================================================================
===============================================================================

   ██████╗ ██╗  ██╗██╗███████╗██╗     ██████╗  ██████╗  ██████╗  ██████╗ ████████╗
  ██╔════╝ ██║  ██║██║██╔════╝██║     ██╔══██╗██╔═══██╗██╔═══██╗██╔══██╗╚══██╔══╝
  ██║  ███╗██║  ██║██║███████╗██║     ██████╔╝██║   ██║██║   ██║██████╔╝   ██║
  ██║   ██║██║  ██║██║╚════██║██║     ██╔══██╗██║   ██║██║   ██║██╔══██╗   ██║
  ╚██████╔╝╚██████╔╝██║███████║███████╗██║  ██║╚██████╔╝╚██████╔╝██║  ██║   ██║
   ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝

===============================================================================
AX 공공임대주택 안전유지관리 플랫폼 - TRL-8 시험·검증 결과 자동화 스크립트
===============================================================================
문서번호: AX-TV-2026-001
목적: 성능 실측, AI 정확도 실측, UAT 결과를 자동 생성하여 TRL-8 시험성적서를 보완
적용 대상: 연구소 NAS 서버 데이터

사용법:
    python 01_test_verification.py --nas-path //NAS_IP/ax-platform --output ./results

의존성:
    pip install requests aiohttp pandas matplotlib openpyxl jinja2 tabulate

===============================================================================
===============================================================================
  기술 보고서 / Technical Report
===============================================================================
===============================================================================

이 문서는 AX 공공임대주택 안전유지관리 플랫폼의 시험·검증에 사용되는
자동화 스크립트에 대한 기술 보고서입니다.

아래에서 다루는 내용은 소프트웨어 품질 측정, 성능 테스트, 통계 분석에 관한
이론적 배경을 설명합니다. 프로그래밍이나 통계를 처음 접하는 분도 이해할 수
있도록 가능한 쉬운 한국어로 작성하였습니다.

===============================================================================
  1. API 성능 측정 이론 (Response Time Theory)
===============================================================================

  API 성능 측정이란?
  ─────────────────
  우리가 웹사이트를 클릭하면, 브라우저가 서버에 "요청(Request)"을 보내고,
  서버가 "응답(Response)"을 돌려줍니다.

  이때 "요청을 보낸 순간"부터 "응답을 받은 순간"까지 걸리는 시간을
  **응답시간(Response Time)**이라고 합니다.

  쉽게 비유하면:
    - 식당에서 음식을 주문하고(요청) → 음식이 나오기까지(응답) 걸리는 시간
    - 이 시간이 짧을수록 좋은 서비스입니다

  응답시간의 구성요소:
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  응답시간(Response Time) = 네트워크 지연(Latency)            │
  │                          + 서버 처리시간(Processing Time)     │
  │                          + 데이터 전송시간(Transfer Time)     │
  │                                                              │
  │  그림으로 표현하면:                                           │
  │                                                              │
  │  클라이언트 ──요청──> [네트워크] ──> 서버 ──처리──> 서버      │
  │  클라이언트 <──응답── [네트워크] <── 서버                     │
  │                                                              │
  │  |<─────────────── 응답시간 (ms) ───────────────>|           │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  응답시간을 왜 여러 번 측정할까?
  ──────────────────────────────
  한 번 측정하면 그때의 네트워크 상태, 서버 부하 등에 따라 값이 달라집니다.
  마치 100m 달리기를 한 번만 뛰어서는 실력을 정확히 알 수 없는 것처럼,
  여러 번 반복 측정하여 **통계적으로 의미 있는 결과**를 구합니다.

  이 스크립트에서는 각 API 엔드포인트를 **100회** 반복 호출하여 측정합니다.

===============================================================================
  2. 백분위수(Percentile) 수학적 정의와 의미
===============================================================================

  백분위수란?
  ──────────
  데이터를 크기 순서로 정렬했을 때, 하위에서 몇 퍼센트 지점에 있는 값인지를
  나타내는 지표입니다.

  예를 들어 키(신장) 측정에서:
    - P50 (50번째 백분위수) = 중앙값. 100명 중 50번째로 큰 값
    - P95 (95번째 백분위수) = 100명 중 95번째로 큰 값
    - P99 (99번째 백분위수) = 100명 중 99번째로 큰 값

  API 성능에서 P95의 의미:
    "100번의 요청 중 95번은 이 시간 이내에 응답했다"
    → 나머지 5번은 이보다 느릴 수 있음
    → 극단적으로 느린 소수의 요청(아웃라이어)을 무시하고
      대부분의 사용자 경험을 반영하는 지표

  P99의 의미:
    "100번 중 99번은 이 시간 이내에 응답했다"
    → 거의 최악의 경우(상위 1%)를 제외한 응답시간
    → 더 엄격한 기준

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  백분위수 공식 (Percentile Formula):                          │
  │                                                              │
  │              P(k) = x[ ceil( (k/100) * n ) ]                 │
  │                                                              │
  │  여기서:                                                      │
  │    k   = 원하는 백분위 (예: 95, 99)                           │
  │    n   = 전체 데이터 수 (예: 100개의 측정값)                   │
  │    x[] = 크기 순서로 정렬된 데이터 배열                        │
  │    ceil = 올림 함수 (소수점을 올림)                             │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │                 ┌         k          ┐                        │
  │    P(k)  =  x  │  ceil( ─── * n )   │                        │
  │                 │        100         │                        │
  │                 └                    ┘                        │
  │                                                              │
  │  예시: 100개 데이터에서 P95 구하기                              │
  │    → ceil(95/100 * 100) = ceil(95) = 95                      │
  │    → 정렬된 데이터의 95번째 값                                  │
  │                                                              │
  │  예시: 200개 데이터에서 P99 구하기                              │
  │    → ceil(99/100 * 200) = ceil(198) = 198                    │
  │    → 정렬된 데이터의 198번째 값                                 │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  왜 평균(Average) 대신 P95를 쓸까?
  ──────────────────────────────────
  평균은 극단값에 영향을 많이 받습니다.

  예시:
    응답시간 = [10, 12, 11, 13, 10, 11, 12, 10, 11, 5000] (ms)
    평균 = 510ms  (5000ms라는 하나의 극단값 때문에 높아짐)
    P95 = 약 13ms (실제 대부분의 사용자 경험을 반영)

  따라서 P95는 "대부분의 사용자가 체감하는 성능"을 더 정확히 나타냅니다.

===============================================================================
  3. 부하 테스트 이론 (Load Testing Theory)
===============================================================================

  부하 테스트란?
  ────────────
  실제 운영 환경에서 여러 사용자가 동시에 접속했을 때 시스템이 제대로
  작동하는지 확인하는 테스트입니다.

  마치 놀이공원에 손님이 한 명일 때는 대기시간이 없지만,
  500명이 동시에 오면 줄이 길어지는 것처럼,
  서버도 동시 접속자가 많아지면 응답이 느려질 수 있습니다.

  이 스크립트에서는 **50명의 동시 사용자**를 시뮬레이션합니다.

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  처리량 (Throughput) 공식:                                    │
  │                                                              │
  │              N                                               │
  │    lambda = ───    (requests per second, RPS)                 │
  │              T                                               │
  │                                                              │
  │  여기서:                                                      │
  │    lambda (λ) = 처리량 (초당 처리 요청 수)                     │
  │    N          = 총 처리된 요청 수                               │
  │    T          = 총 소요 시간 (초)                               │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    "1초 동안 서버가 몇 개의 요청을 처리했나?"                    │
  │    예: 60초 동안 3000개 요청 처리 → λ = 3000/60 = 50 RPS      │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  리틀의 법칙 (Little's Law):                                  │
  │                                                              │
  │              L = λ * W                                       │
  │                                                              │
  │  여기서:                                                      │
  │    L      = 시스템 내 평균 요청 수 (동시 처리 중인 요청)        │
  │    lambda = 처리량 (초당 도착하는 요청 수)                      │
  │    W      = 평균 응답시간 (초)                                 │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │    L  =  lambda  x  W                                        │
  │                                                              │
  │    (시스템 내     (초당       (평균                            │
  │     평균 요청수)  처리량)     대기시간)                         │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    식당에서 비유하면:                                           │
  │    L = 식당 안에 있는 평균 손님 수                              │
  │    λ = 매 시간 들어오는 손님 수                                 │
  │    W = 손님 1명이 식당에 머무는 평균 시간                       │
  │                                                              │
  │    만약 매시간 10명이 오고(λ=10), 평균 1시간 머문다면(W=1),    │
  │    식당 안에는 평균 10명이 있다(L=10).                         │
  │                                                              │
  │  이 법칙이 중요한 이유:                                        │
  │    서버의 동시 처리 능력(L)을 알면,                             │
  │    처리량(λ)과 응답시간(W)의 관계를 예측할 수 있습니다.         │
  │    → 응답시간이 길어지면 동시 요청 수가 늘어나고,              │
  │    → 동시 요청 수가 서버 한계를 넘으면 시스템이 불안정해짐      │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  오류율 (Error Rate) 공식:                                    │
  │                                                              │
  │                  failures                                     │
  │    epsilon = ────────────── x 100   (%)                       │
  │                  total                                        │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │              실패한 요청 수                                    │
  │    epsilon = ────────────── x 100                             │
  │              전체 요청 수                                      │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    100번 요청했는데 3번 실패했으면 오류율 = 3%                  │
  │    일반적으로 오류율 5% 미만을 기준으로 합니다.                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  Ramp-up이란?
  ────────────
  부하 테스트에서 사용자를 한꺼번에 다 투입하면 비현실적입니다.
  실제 환경에서는 사용자가 점진적으로 증가하기 때문입니다.

  Ramp-up은 "사용자 수를 서서히 늘리는 구간"을 말합니다.
    예: 10초 ramp-up, 최종 50명
    → 0초: 0명 → 5초: 25명 → 10초: 50명 (이후 50명 유지)

===============================================================================
  4. 통계적 검증 방법론 (Statistical Verification)
===============================================================================

  측정 데이터를 분석할 때 사용하는 기본 통계 도구를 설명합니다.

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  4-1. 산술 평균 (Arithmetic Mean):                            │
  │                                                              │
  │         1   n                                                │
  │    mu = ── * Σ  x_i                                          │
  │         n  i=1                                               │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │              x_1 + x_2 + x_3 + ... + x_n                    │
  │    mu  =  ─────────────────────────────────                  │
  │                        n                                     │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    모든 값을 더한 다음, 개수로 나눈 것.                         │
  │    예: 응답시간 [10, 20, 30] → 평균 = (10+20+30)/3 = 20ms    │
  │                                                              │
  │    평균의 한계: 극단값(아웃라이어)에 민감함                      │
  │    예: [10, 20, 30, 10000] → 평균 = 2515ms (비현실적)         │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  4-2. 표준편차 (Standard Deviation):                          │
  │                                                              │
  │              ┌─────────────────────────┐                     │
  │              │   1    n                │                     │
  │    sigma =   │  ── * Σ  (x_i - mu)^2  │                     │
  │            sqrt│  n   i=1              │                     │
  │              └─────────────────────────┘                     │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │                   ____________________________________       │
  │                  /  (x1-mu)^2 + (x2-mu)^2 + ... + (xn-mu)^2 │
  │    sigma = sqrt /  ──────────────────────────────────────     │
  │               \/                   n                         │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    "값들이 평균으로부터 얼마나 퍼져 있는지" 나타내는 지표.       │
  │                                                              │
  │    표준편차가 작으면 → 응답시간이 일정함 (안정적인 서버)         │
  │    표준편차가 크면   → 응답시간이 들쭉날쭉함 (불안정한 서버)     │
  │                                                              │
  │    예시:                                                      │
  │      서버 A: 응답시간 [98, 100, 102, 99, 101] → σ ≈ 1.4ms    │
  │      서버 B: 응답시간 [10, 50, 200, 30, 500]  → σ ≈ 178ms    │
  │      → 서버 A가 훨씬 안정적                                    │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  4-3. 신뢰구간 (Confidence Interval):                         │
  │                                                              │
  │                               sigma                          │
  │    CI = mu  +/-  z(alpha/2) * ─────                          │
  │                               sqrt(n)                        │
  │                                                              │
  │  ASCII 수식:                                                  │
  │                                                              │
  │                                 sigma                        │
  │    CI  =  mu  +/-  z(alpha/2) x ──────                       │
  │                                 sqrt(n)                      │
  │                                                              │
  │  여기서:                                                      │
  │    mu         = 표본 평균                                     │
  │    z(alpha/2) = 신뢰수준에 따른 z-값                           │
  │                 95% 신뢰수준 → z = 1.96                       │
  │                 99% 신뢰수준 → z = 2.576                      │
  │    sigma      = 표본 표준편차                                  │
  │    n          = 표본 크기 (측정 횟수)                           │
  │    sqrt(n)    = n의 제곱근                                    │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    "진짜 평균이 이 범위 안에 있을 확률이 95%"                    │
  │                                                              │
  │    예: 평균 응답시간 = 200ms, σ = 50ms, n = 100               │
  │    95% CI = 200 +/- 1.96 * (50 / sqrt(100))                  │
  │           = 200 +/- 1.96 * 5                                 │
  │           = 200 +/- 9.8                                      │
  │           = [190.2ms, 209.8ms]                               │
  │                                                              │
  │    → "진짜 평균 응답시간은 190.2ms~209.8ms 사이에 있을         │
  │       확률이 95%다"라고 해석합니다.                              │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  4-4. 성공률 (Success Rate):                                  │
  │                                                              │
  │                 성공한 요청 수 (HTTP 2xx, 3xx)                 │
  │    SR (%) = ──────────────────────────────── x 100            │
  │                     전체 요청 수                               │
  │                                                              │
  │  쉽게 말하면:                                                  │
  │    100번 요청해서 97번 정상 응답 → 성공률 = 97%                │
  │    일반적으로 99% 이상을 목표로 합니다.                         │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

===============================================================================
  5. UAT(사용자 수용 테스트) 방법론과 IEEE 829 표준
===============================================================================

  UAT란?
  ──────
  UAT(User Acceptance Testing)는 시스템을 실제로 사용할 사람(최종 사용자)이
  직접 테스트하여 "이 시스템이 우리 요구사항을 충족하는가?"를 확인하는
  테스트입니다.

  쉽게 비유하면:
    - 개발자가 만든 자동차를 공장에서 기계로 검사하는 것 = 단위 테스트
    - 실제 운전자가 도로에서 직접 운전해보는 것 = UAT

  UAT의 단계:
    1. 시나리오 작성: "이런 상황에서 이렇게 동작해야 한다"를 정의
    2. 테스트 실행: 실제 사용자가 시나리오대로 시스템을 사용
    3. 결과 기록: Pass(통과) / Fail(실패) 판정
    4. 결함 보고: Fail인 경우 원인과 재현 방법을 기록

  IEEE 829 표준이란?
  ──────────────────
  IEEE 829는 소프트웨어 테스트 문서화에 대한 국제 표준입니다.
  (IEEE = Institute of Electrical and Electronics Engineers,
   전기전자기술자협회)

  이 표준에서 정의하는 주요 문서:
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  IEEE 829 Test Documentation Structure:                      │
  │                                                              │
  │  1. Test Plan (테스트 계획서)                                  │
  │     → 무엇을, 왜, 어떻게, 언제 테스트할 것인가?               │
  │                                                              │
  │  2. Test Design Specification (테스트 설계 명세서)             │
  │     → 테스트 조건과 예상 결과를 정의                           │
  │                                                              │
  │  3. Test Case Specification (테스트 케이스 명세서)             │
  │     → 구체적인 입력값, 실행 조건, 예상 출력                    │
  │                                                              │
  │  4. Test Procedure Specification (테스트 절차 명세서)          │
  │     → 단계별 실행 절차                                        │
  │                                                              │
  │  5. Test Incident Report (테스트 결함 보고서)                  │
  │     → 발견된 결함의 상세 기록                                  │
  │                                                              │
  │  6. Test Summary Report (테스트 요약 보고서)                   │
  │     → 전체 테스트 결과 요약                                    │
  │                                                              │
  │  이 스크립트에서 자동 생성하는 UAT 체크리스트는                  │
  │  위 표준의 3번(Test Case)과 4번(Test Procedure)에 해당합니다.  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

===============================================================================
  6. 주요 수식 요약표 (Summary of Formulas)
===============================================================================

  ┌────────────────────┬──────────────────────────────────────────┐
  │ 수식명             │ 공식                                     │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 백분위수           │ P(k) = x[ ceil( (k/100) * n ) ]         │
  │ (Percentile)       │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 산술 평균          │ mu = (1/n) * Sigma(x_i)                  │
  │ (Mean)             │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 표준편차           │ sigma = sqrt[ (1/n) * Sigma(x_i - mu)^2 ]│
  │ (Std Deviation)    │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 처리량             │ lambda = N / T  (RPS)                    │
  │ (Throughput)       │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 리틀의 법칙        │ L = lambda * W                           │
  │ (Little's Law)     │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 오류율             │ epsilon = (failures / total) * 100       │
  │ (Error Rate)       │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 성공률             │ SR = (successes / total) * 100           │
  │ (Success Rate)     │                                          │
  ├────────────────────┼──────────────────────────────────────────┤
  │ 신뢰구간           │ CI = mu +/- z(a/2) * (sigma / sqrt(n))  │
  │ (Confidence Int.)  │                                          │
  └────────────────────┴──────────────────────────────────────────┘

===============================================================================
  7. 참고문헌 (References)
===============================================================================

  [1] RFC 7230 - Hypertext Transfer Protocol (HTTP/1.1): Message Syntax
      and Routing. IETF, June 2014.

  [2] RFC 7231 - Hypertext Transfer Protocol (HTTP/1.1): Semantics
      and Content. IETF, June 2014.

  [3] RFC 7232 - Hypertext Transfer Protocol (HTTP/1.1): Conditional
      Requests. IETF, June 2014.

  [4] RFC 7233 - Hypertext Transfer Protocol (HTTP/1.1): Range Requests.
      IETF, June 2014.

  [5] RFC 7234 - Hypertext Transfer Protocol (HTTP/1.1): Caching.
      IETF, June 2014.

  [6] RFC 7235 - Hypertext Transfer Protocol (HTTP/1.1): Authentication.
      IETF, June 2014.

  [7] ISO/IEC 25010:2011 - Systems and software engineering -- Systems
      and software Quality Requirements and Evaluation (SQuaRE).

  [8] IEEE 829-2008 - IEEE Standard for Software and System Test
      Documentation.

  [9] NIST SP 800-53 Rev. 5 - Security and Privacy Controls for
      Information Systems and Organizations. NIST, September 2020.

  [10] Little, J.D.C. (1961). "A Proof for the Queuing Formula: L = λW".
       Operations Research, 9(3), 383-387.

  [11] Jain, R. (1991). "The Art of Computer Systems Performance Analysis".
       Wiley.

  [12] Meier, J.D. et al. (2007). "Performance Testing Guidance for Web
       Applications". Microsoft Patterns & Practices.

===============================================================================
  끝 / End of Technical Report
===============================================================================
"""

import os
import sys
import json
import time
import asyncio
import argparse
import statistics
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

import requests
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from tabulate import tabulate

# ┌──────────────────────────────────────────────────────────────────────────┐
# │                                                                          │
# │  [이론 노트] 이 스크립트의 전체 구조와 데이터 흐름                         │
# │                                                                          │
# │  실행 흐름:                                                               │
# │                                                                          │
# │    main()                                                                │
# │     ├─> [1단계] ApiPerformanceTester.run_all_endpoints()                  │
# │     │     └─> 각 API 엔드포인트를 100회 호출하여 응답시간 측정             │
# │     │                                                                    │
# │     ├─> [2단계] LoadTester.run()                                         │
# │     │     └─> 50명 동시 접속을 시뮬레이션하여 부하 성능 측정               │
# │     │                                                                    │
# │     ├─> [3단계] AiJobTester.run_all()                                    │
# │     │     └─> AI 결함 탐지, 균열 분석, PDF 생성의 처리시간 측정            │
# │     │                                                                    │
# │     ├─> [4단계] UatGenerator.generate_uat_excel()                        │
# │     │     └─> UAT 시나리오 체크리스트를 Excel로 생성                      │
# │     │                                                                    │
# │     └─> [5단계] TestReportGenerator                                      │
# │           ├─> 응답시간 차트 (PNG)                                         │
# │           ├─> 결과 데이터 (JSON)                                          │
# │           └─> Pass/Fail 요약 (Excel)                                     │
# │                                                                          │
# │  데이터 구조:                                                             │
# │    TestConfig         - 시험 환경 설정 (서버 주소, 기준값 등)              │
# │    ApiTestResult      - 개별 API 엔드포인트의 측정 결과                    │
# │    LoadTestResult     - 부하 테스트의 종합 결과                            │
# │    AiJobTestResult    - AI 작업의 처리시간 측정 결과                       │
# │    UatScenario        - 개별 UAT 시나리오 정의                             │
# │                                                                          │
# └──────────────────────────────────────────────────────────────────────────┘
```

### 소스코드 Part 2/6: TestConfig · ApiTestResult · ApiPerformanceTester

```python
# ---------------------------------------------------------------------------
# 0. 설정 (NAS 경로 및 API 서버 정보)
# ---------------------------------------------------------------------------
@dataclass
class TestConfig:
    """
    시험 환경 설정 (Test Configuration)
    ====================================

    [이 클래스가 하는 일 - 쉬운 설명]
    ───────────────────────────────
    이 클래스는 시험에 필요한 모든 설정값을 한 곳에 모아놓은 "설정 상자"입니다.

    [시험 기준(criteria)의 근거]
    ────────────────────────────
    각 기준값은 비기능 요구사항 문서에서 정의된 값입니다:
      - 대시보드 API 응답시간: <= 500ms
      - 일반 API 응답시간(P95): <= 1500ms
      - 동시 접속자: 50명
      - AI 작업 처리시간: <= 60초
      - PDF 생성: <= 30초
      - 시스템 가용률: >= 99%
    """
    # NAS 서버 경로 (연구소 데이터)
    nas_base_path: str = "//192.168.0.100/ax-platform"

    # API 서버 (테스트 대상)
    api_base_url: str = "http://localhost:3000/api/v1"
    api_auth_email: str = "admin@atom-eng.co.kr"
    api_auth_password: str = "test1234!"

    # 부하 테스트 설정
    load_test_concurrent_users: int = 50
    load_test_duration_sec: int = 60
    load_test_ramp_up_sec: int = 10

    # 출력 경로
    output_dir: str = "./results"

    # 시험 기준 (비기능 요구사항에서 가져옴)
    criteria: dict = field(default_factory=lambda: {
        "dashboard_api_response_ms": 500,
        "general_api_response_p95_ms": 1500,
        "concurrent_users": 50,
        "ai_job_processing_sec": 60,
        "pdf_generation_sec": 30,
        "file_upload_max_mb": 500,
        "system_availability_pct": 99.0,
        "rto_hours": 2,
        "rpo_hours": 24,
    })

# ---------------------------------------------------------------------------
# 1. API 응답시간 측정 (개별 엔드포인트)
# ---------------------------------------------------------------------------
@dataclass
class ApiTestResult:
    """개별 API 엔드포인트의 측정 결과를 저장하는 데이터 클래스"""
    endpoint: str
    method: str
    description: str
    response_times_ms: list = field(default_factory=list)
    status_codes: list = field(default_factory=list)
    errors: list = field(default_factory=list)

    @property
    def avg_ms(self) -> float:
        """  평균 응답시간 (mu = Sigma(x_i) / n)  """
        return statistics.mean(self.response_times_ms) if self.response_times_ms else 0

    @property
    def p95_ms(self) -> float:
        """  P95 응답시간 (P(95) = x[ceil(0.95*n)])  """
        if not self.response_times_ms:
            return 0
        sorted_times = sorted(self.response_times_ms)
        idx = int(len(sorted_times) * 0.95)
        return sorted_times[min(idx, len(sorted_times) - 1)]

    @property
    def p99_ms(self) -> float:
        """  P99 응답시간 (P(99) = x[ceil(0.99*n)])  """
        if not self.response_times_ms:
            return 0
        sorted_times = sorted(self.response_times_ms)
        idx = int(len(sorted_times) * 0.99)
        return sorted_times[min(idx, len(sorted_times) - 1)]

    @property
    def min_ms(self) -> float:
        return min(self.response_times_ms) if self.response_times_ms else 0

    @property
    def max_ms(self) -> float:
        return max(self.response_times_ms) if self.response_times_ms else 0

    @property
    def success_rate(self) -> float:
        """  성공률 = (HTTP 2xx+3xx / 전체) * 100  """
        if not self.status_codes:
            return 0
        ok = sum(1 for c in self.status_codes if 200 <= c < 400)
        return (ok / len(self.status_codes)) * 100

    @property
    def total_requests(self) -> int:
        return len(self.response_times_ms)

class ApiPerformanceTester:
    """API 응답시간 성능 측정기"""

    TARGET_ENDPOINTS = [
        ("GET",  "/dashboard",              "KPI 대시보드 집계",       True),
        ("POST", "/auth/login",             "사용자 로그인",           False),
        ("POST", "/auth/refresh",           "토큰 갱신",              False),
        ("GET",  "/users",                  "사용자 목록 조회",        False),
        ("GET",  "/complexes",              "단지 목록 조회",          False),
        ("GET",  "/defects",                "결함 목록 조회",          False),
        ("GET",  "/defects?severity=HIGH",  "결함 필터링 조회",        False),
        ("GET",  "/cracks/gauge-points",    "균열 게이지 목록",        False),
        ("GET",  "/complaints",             "민원 목록 조회",          False),
        ("GET",  "/alerts",                 "경보 목록 조회",          False),
        ("GET",  "/alerts/count/active",    "활성 경보 카운트",        True),
        ("GET",  "/kpi",                    "KPI 월별 조회",           False),
        ("GET",  "/risk-scoring",           "위험도 조회",             False),
        ("GET",  "/feature-flags",          "Feature Flag 목록",      False),
        ("GET",  "/jobs/status",            "배경 작업 상태",          False),
    ]

    def __init__(self, config: TestConfig):
        self.config = config
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.results: list[ApiTestResult] = []

    def authenticate(self) -> bool:
        """JWT 토큰을 획득합니다 (로그인)."""
        try:
            resp = self.session.post(
                f"{self.config.api_base_url}/auth/login",
                json={
                    "email": self.config.api_auth_email,
                    "password": self.config.api_auth_password,
                },
                timeout=10,
            )
            if resp.status_code == 200 or resp.status_code == 201:
                data = resp.json()
                self.token = data.get("data", {}).get("accessToken") or data.get("accessToken")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                print(f"  [AUTH] 인증 성공 (토큰 획득)")
                return True
            else:
                print(f"  [AUTH] 인증 실패: {resp.status_code}")
                return False
        except Exception as e:
            print(f"  [AUTH] 인증 오류: {e}")
            return False

    def measure_endpoint(self, method: str, path: str, description: str,
                         iterations: int = 100) -> ApiTestResult:
        """단일 엔드포인트를 반복 측정합니다."""
        result = ApiTestResult(
            endpoint=path,
            method=method,
            description=description,
        )
        url = f"{self.config.api_base_url}{path}"

        for i in range(iterations):
            try:
                start = time.perf_counter()
                if method == "GET":
                    resp = self.session.get(url, timeout=15)
                elif method == "POST":
                    if "/auth/login" in path:
                        resp = self.session.post(url, json={
                            "email": self.config.api_auth_email,
                            "password": self.config.api_auth_password,
                        }, timeout=15)
                    else:
                        resp = self.session.post(url, json={}, timeout=15)
                else:
                    resp = self.session.request(method, url, timeout=15)

                elapsed_ms = (time.perf_counter() - start) * 1000
                result.response_times_ms.append(round(elapsed_ms, 2))
                result.status_codes.append(resp.status_code)

            except requests.exceptions.Timeout:
                result.errors.append(f"Iteration {i}: Timeout")
                result.response_times_ms.append(15000)
                result.status_codes.append(504)
            except Exception as e:
                result.errors.append(f"Iteration {i}: {str(e)}")

        return result

    def run_all_endpoints(self, iterations: int = 100) -> list[ApiTestResult]:
        """모든 대상 엔드포인트를 측정합니다."""
        print("\n[1단계] API 엔드포인트 응답시간 측정")
        print(f"  - 측정 대상: {len(self.TARGET_ENDPOINTS)}개 엔드포인트")
        print(f"  - 반복 횟수: {iterations}회/엔드포인트")
        print("-" * 70)

        if not self.authenticate():
            print("  [경고] 인증 실패 - 비인증 엔드포인트만 측정합니다.")

        for method, path, desc, is_cached in self.TARGET_ENDPOINTS:
            print(f"  측정 중: {method} {path} ({desc})...", end="", flush=True)
            result = self.measure_endpoint(method, path, desc, iterations)
            self.results.append(result)
            cache_tag = " [캐시]" if is_cached else ""
            print(f" AVG={result.avg_ms:.1f}ms, P95={result.p95_ms:.1f}ms, "
                  f"성공률={result.success_rate:.1f}%{cache_tag}")

        return self.results

    def generate_pass_fail_table(self) -> pd.DataFrame:
        """시험 항목별 Pass/Fail 요약표를 생성합니다."""
        rows = []
        criteria = self.config.criteria

        for r in self.results:
            is_dashboard = r.endpoint in ("/dashboard", "/alerts/count/active")
            threshold = criteria["dashboard_api_response_ms"] if is_dashboard else criteria["general_api_response_p95_ms"]
            measured = r.avg_ms if is_dashboard else r.p95_ms
            passed = measured <= threshold

            rows.append({
                "시험항목": f"{r.method} {r.endpoint}",
                "기능": r.description,
                "기준(ms)": f"≤ {threshold}",
                "측정값(ms)": f"{measured:.1f}",
                "요청수": r.total_requests,
                "성공률(%)": f"{r.success_rate:.1f}",
                "P95(ms)": f"{r.p95_ms:.1f}",
                "P99(ms)": f"{r.p99_ms:.1f}",
                "판정": "Pass" if passed else "Fail",
            })

        return pd.DataFrame(rows)
```

### 소스코드 Part 3/6: LoadTestResult · LoadTester (동시 접속 부하 테스트)

```python
# ---------------------------------------------------------------------------
# 2. 부하 테스트 (동시 접속 시뮬레이션)
# ---------------------------------------------------------------------------
#   [이론 배경] 부하 테스트 (Load Testing)
#     1. 부하 테스트 (Load Test)   — 예상 최대 부하에서 시스템 동작 확인
#     2. 스트레스 테스트 (Stress)  — 최대 부하를 초과하여 한계점 확인
#     3. 스파이크 테스트 (Spike)   — 갑작스런 부하 급증 시뮬레이션
#     4. 내구 테스트 (Endurance)   — 장시간 지속 부하, 메모리 누수 검증
#
#   리틀의 법칙으로 부하 테스트 설계하기:
#     L = lambda * W
#     예: 동시 50명(L=50), 평균 응답 1초(W=1) → 필요 처리량 λ=50 RPS
#
#   Ramp-up 전략: 0초 0명 → 10초 50명 → 60초까지 50명 유지

@dataclass
class LoadTestResult:
    """
    부하 테스트 종합 결과를 저장하는 데이터 클래스

    [Pass 판정 조건]
      1. P95 응답시간 <= 1500ms
      2. 오류율 < 5%
    """
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_ms: float = 0
    p95_response_ms: float = 0
    p99_response_ms: float = 0
    max_response_ms: float = 0
    requests_per_second: float = 0
    concurrent_users: int = 0
    duration_sec: float = 0
    error_rate_pct: float = 0
    passed: bool = False

class LoadTester:
    """
    동시 접속 부하 테스트 (Concurrent Load Tester)

    [동작 방식]
      1. Ramp-up (0~10초): 사용자 수를 0→50명으로 서서히 증가
      2. 안정 상태 (10~60초): 50명 동시 호출 지속 → 핵심 측정 구간

    [리틀의 법칙으로 검증]
      측정 RPS (λ) × 평균 응답시간(W) ≈ 동시 요청 수 (L)
    """

    def __init__(self, config: TestConfig):
        self.config = config

    def run(self) -> LoadTestResult:
        """
        [수학적 모형]
          처리량  λ = N / T
          오류율  ε = failures / total × 100
          P95     = sorted_times[ceil(0.95 × n)]

        [Pass 판정] P95 <= 1500ms AND 오류율 < 5%
        """
        print(f"\n[2단계] 부하 테스트 (동시 {self.config.load_test_concurrent_users}명)")
        print(f"  - 지속시간: {self.config.load_test_duration_sec}초")
        print(f"  - Ramp-up: {self.config.load_test_ramp_up_sec}초")
        print("-" * 70)

        all_times = []
        all_status = []
        errors = 0
        start_time = time.time()

        target_url = f"{self.config.api_base_url}/dashboard"

        def single_request(user_id: int) -> tuple[float, int]:
            """
            단일 가상 사용자 요청 (로그인 + 대시보드 조회).
            각 사용자는 독립 HTTP 세션을 사용하여 실제 환경을 모방.
            """
            try:
                session = requests.Session()
                login_resp = session.post(
                    f"{self.config.api_base_url}/auth/login",
                    json={
                        "email": self.config.api_auth_email,
                        "password": self.config.api_auth_password,
                    },
                    timeout=10,
                )
                if login_resp.status_code in (200, 201):
                    token_data = login_resp.json()
                    token = (token_data.get("data", {}).get("accessToken")
                             or token_data.get("accessToken"))
                    session.headers.update({"Authorization": f"Bearer {token}"})

                s = time.perf_counter()
                resp = session.get(target_url, timeout=15)
                elapsed = (time.perf_counter() - s) * 1000
                return elapsed, resp.status_code
            except Exception:
                return 15000.0, 500

        max_workers = self.config.load_test_concurrent_users
        end_time = start_time + self.config.load_test_duration_sec
        request_count = 0

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            while time.time() < end_time:
                # Ramp-up: current = max * (elapsed / ramp_up_sec)
                elapsed = time.time() - start_time
                if elapsed < self.config.load_test_ramp_up_sec:
                    current_users = max(1, int(
                        max_workers * (elapsed / self.config.load_test_ramp_up_sec)
                    ))
                else:
                    current_users = max_workers

                futures = [
                    executor.submit(single_request, uid)
                    for uid in range(current_users)
                ]
                for f in futures:
                    elapsed_ms, status = f.result()
                    all_times.append(elapsed_ms)
                    all_status.append(status)
                    request_count += 1
                    if status >= 400:
                        errors += 1

                time.sleep(1.0)

        actual_duration = time.time() - start_time
        sorted_times = sorted(all_times) if all_times else [0]

        result = LoadTestResult(
            total_requests=request_count,
            successful_requests=request_count - errors,
            failed_requests=errors,
            avg_response_ms=statistics.mean(all_times) if all_times else 0,
            p95_response_ms=sorted_times[int(len(sorted_times) * 0.95)] if sorted_times else 0,
            p99_response_ms=sorted_times[int(len(sorted_times) * 0.99)] if sorted_times else 0,
            max_response_ms=max(all_times) if all_times else 0,
            requests_per_second=request_count / actual_duration if actual_duration > 0 else 0,
            concurrent_users=max_workers,
            duration_sec=round(actual_duration, 1),
            error_rate_pct=round((errors / request_count) * 100, 2) if request_count > 0 else 0,
        )
        result.passed = (
            result.p95_response_ms <= self.config.criteria["general_api_response_p95_ms"]
            and result.error_rate_pct < 5.0
        )

        print(f"  총 요청: {result.total_requests}")
        print(f"  성공: {result.successful_requests} / 실패: {result.failed_requests}")
        print(f"  평균 응답: {result.avg_response_ms:.1f}ms, P95: {result.p95_response_ms:.1f}ms")
        print(f"  RPS: {result.requests_per_second:.1f}")
        print(f"  오류율: {result.error_rate_pct:.2f}%")
        print(f"  판정: {'Pass' if result.passed else 'Fail'}")

        return result
```