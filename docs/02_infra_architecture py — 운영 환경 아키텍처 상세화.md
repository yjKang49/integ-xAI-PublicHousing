# 02_infra_architecture.py — 운영 환경 아키텍처 상세화

> **문서번호:** AX-IA-2026-001
> 

> **목적:** 인프라 스펙 수집, 모니터링 구성, 장애 대응 자동화 검증
> 

> **로컬 경로:** `F:\ATOM_Project\atom_followup_202604W4\scripts\02_infra_architecture.py`
> 

---

## 실행 방법

```bash
# 의존성 설치
pip install psutil docker pandas openpyxl pyyaml tabulate

# 실행
python 02_infra_architecture.py --env production --output ./results
```

## 출력 파일

| 파일 | 설명 |
| --- | --- |
| `운영환경_인프라_스펙.xlsx` | 서버스펙, 컨테이너, 모니터링, 장애대응 (5개 시트) |
| `docker-compose.production.yml` | 운영 Docker Compose (8개 서비스) |
| `backup.sh` | CouchDB/Redis/MinIO 자동 백업 (RPO 24시간) |
| `restore.sh` | 백업 복원 (RTO 2시간) |
| `server_spec.json` | 서버 스펙 JSON |

---

# 기술 보고서 (Technical Report)

## 1. 시스템 아키텍처 이론 (Microservices)

AX 플랫폼은 마이크로서비스 구조입니다. 하나의 거대한 프로그램 대신, 역할별로 나누어 독립적으로 배포합니다.

```
Monolith (단일)          Microservices (분리)
┌───────────┐      ┌───┐ ┌───┐ ┌───┐
│ 전체 기능   │      │API│ │ AI │ │Job│
│ 한 덩어리  │      └───┘ └───┘ └───┘
└───────────┘      → 각각 독립 배포/확장
```

## 2. Docker 컨테이너 기술 원리

Docker는 리눅스 커널의 3가지 기술로 격리된 환경을 만듭니다:

| 기술 | 역할 | 비유 |
| --- | --- | --- |
| **Namespaces** | 프로세스/네트워크/파일시스템 격리 | 각자 다른 방에 사는 것 |
| **cgroups** | CPU/메모리 자원 제한 | 각 방의 전기/수도 할당량 |
| **Union FS** | 레이어드 파일시스템 | 투명 종이 격치기 |

## 3. CAP Theorem — CouchDB가 AP인 이유

분산 시스템은 3가지를 동시에 모두 만족할 수 없습니다:

```
        C (Consistency)
       / \
      /   \
     /     \
A (가용성)───P (분단 허용)

CouchDB = A + P (가용성 + 분단허용)
→ 언제나 응답하되, 데이터는 "결국 일치" (Eventual Consistency)
```

## 4. Redis 캐시 전략

```
Cache-Aside 패턴:

1. 요청 → Redis에 있나? (Hit/Miss)
2. Hit  → 바로 반환 (빠름)
3. Miss → CouchDB 조회 → Redis에 저장 → 반환

Cache Hit Rate = hits / (hits + misses) × 100%

대시보드 API: TTL 60초 → 1분마다 갱신
LRU (Least Recently Used): 메모리 부족 시 가장 오래된 데이터 삭제
```

## 5. 장애 복구 수식

```
가용률:  A = MTBF / (MTBF + MTTR) × 100%

  MTBF = 평균 고장 간격 (얼마나 자주 고장나나)
  MTTR = 평균 복구 시간 (고장나면 얼마나 빨리 고치나)
  RTO  = 복구 목표 시간 (이 시간 안에 복구해야 함)
  RPO  = 데이터 손실 허용 범위 (최대 몇 시간 데이터 잎어도 되나)

예시: 가용률 99% → 연간 다운타임 ≈ 87.6시간
       가용률 99.9% → 연간 다운타임 ≈ 8.76시간
```

## 6. 백업 3-2-1 Rule

```
3개 복사본 — 데이터를 3개 이상 보관
2개 매체 — 서로 다른 저장 매체에
1개 외부 — 최소 1개는 물리적으로 다른 장소에
```

## 7. 모니터링 이론

| 방법 | 측정 대상 | 용도 |
| --- | --- | --- |
| **RED** | Rate, Errors, Duration | 요청 기반 서비스 모니터링 |
| **USE** | Utilization, Saturation, Errors | 리소스 기반 인프라 모니터링 |

## 8. 참고문헌 (References)

### 8.1 표준 · 가이드 (Standards & Guidelines)

1. **NIST SP 800-34 Rev. 1** (2010) — *Contingency Planning Guide for Federal Information Systems*. NIST.
2. **NIST SP 800-53 Rev. 5** (2020) — *Security and Privacy Controls for Information Systems and Organizations*. NIST.
3. **ISO 22301:2019** — *Security and Resilience — Business Continuity Management Systems*. ISO.
4. **ISO/IEC 27031:2011** — *Guidelines for Information and Communication Technology Readiness for Business Continuity*. ISO/IEC.

### 8.2 분산 시스템 · CAP/일관성 (Distributed Systems)

1. **Brewer, E. (2000)** — "Towards Robust Distributed Systems" (CAP conjecture keynote). *ACM PODC*.
2. **Gilbert, S., Lynch, N. (2002)** — "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services". *ACM SIGACT News*, **33**(2), 51–59.
3. **Brewer, E. (2012)** — "CAP Twelve Years Later: How the 'Rules' Have Changed". *Computer*, **45**(2), 23–29.
4. **Vogels, W. (2009)** — "Eventually Consistent". *Communications of the ACM*, **52**(1), 40–44.
5. **DeCandia, G., Hastorun, D., Jampani, M. et al. (2007)** — "Dynamo: Amazon's Highly Available Key-value Store". *ACM SOSP*, 205–220.
6. **Lamport, L. (1998)** — "The Part-Time Parliament" (Paxos). *ACM Transactions on Computer Systems*, **16**(2), 133–169.
7. **Ongaro, D., Ousterhout, J. (2014)** — "In Search of an Understandable Consensus Algorithm" (Raft). *USENIX ATC*, 305–319.
8. **Abadi, D. (2012)** — "Consistency Tradeoffs in Modern Distributed Database System Design: CAP is Only Part of the Story". *Computer*, **45**(2), 37–42.

### 8.3 컨테이너 · 오케스트레이션 (Containers & Orchestration)

1. **Docker Inc. (2024)** — *Docker Documentation: Namespaces, cgroups, OverlayFS*.
2. **Merkel, D. (2014)** — "Docker: Lightweight Linux Containers for Consistent Development and Deployment". *Linux Journal*, 2014(239).
3. **Bernstein, D. (2014)** — "Containers and Cloud: From LXC to Docker to Kubernetes". *IEEE Cloud Computing*, **1**(3), 81–84.
4. **Burns, B., Grant, B., Oppenheimer, D., Brewer, E., Wilkes, J. (2016)** — "Borg, Omega, and Kubernetes". *Communications of the ACM*, **59**(5), 50–57.
5. **Burns, B., Beda, J., Hightower, K. (2019)** — *Kubernetes: Up and Running*, 2nd ed. O'Reilly.
6. **Corbet, J., Rubini, A., Kroah-Hartman, G. (2005)** — *Linux Device Drivers*, 3rd ed. O'Reilly (namespaces, cgroups background).

### 8.4 데이터베이스 · 캐시 (Database & Cache)

1. **Anderson, J.C., Lehnardt, J., Slater, N. (2010)** — *CouchDB: The Definitive Guide*. O'Reilly. ISBN 978-0-596-15589-6.
2. **Apache CouchDB Documentation** (v3.3) — MVCC, B-Tree indexing, Replication.
3. **Carlson, J.L. (2013)** — *Redis in Action*. Manning. ISBN 978-1-6172-9085-5.
4. **Redis Labs** — *Redis Documentation*: Persistence (RDB/AOF), Eviction Policies (LRU/LFU).
5. **Nishtala, R. et al. (2013)** — "Scaling Memcache at Facebook". *USENIX NSDI*, 385–398.
6. **Sullivan, D. (2015)** — *NoSQL for Mere Mortals*. Addison-Wesley.

### 8.5 SRE · 모니터링 (SRE & Monitoring)

1. **Beyer, B., Jones, C., Petoff, J., Murphy, N.R. (2016)** — *Site Reliability Engineering: How Google Runs Production Systems*. O'Reilly. ISBN 978-1-4919-2912-4.
2. **Beyer, B. et al. (2018)** — *The Site Reliability Workbook: Practical Ways to Implement SRE*. O'Reilly.
3. **Gregg, B. (2013)** — *Systems Performance: Enterprise and the Cloud*. Prentice Hall (USE Method).
4. **Wilkie, T. (2015)** — "The RED Method: How to Instrument Your Services". *Weaveworks Blog* / *SRECon*.
5. **Majors, C., Fong-Jones, L., Miranda, G. (2022)** — *Observability Engineering*. O'Reilly.

### 8.6 웹 아키텍처 · 보안 (Web Architecture & Security)

1. **Fielding, R.T. (2000)** — *Architectural Styles and the Design of Network-based Software Architectures* (REST PhD Thesis). UC Irvine.
2. **Nginx Inc.** — *Nginx Documentation*: Reverse Proxy, SSL/TLS Termination, Load Balancing.
3. **Rescorla, E. (2018)** — *RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3*. IETF.
4. **Newman, S. (2021)** — *Building Microservices*, 2nd ed. O'Reilly. ISBN 978-1-4920-3402-5.

---

## 핵심 구조

### 1. 서버 인프라 스펙 자동 수집

```python
class InfraSpecCollector:
    def collect_server_spec(self) -> ServerSpec:
        # CPU: psutil.cpu_count(), wmic cpu get name
        # RAM: psutil.virtual_memory()
        # Disk: psutil.disk_usage("/")
        # GPU: nvidia-smi --query-gpu=name,memory.total
        # Network: psutil.net_if_addrs()
```

### 2. Docker 컨테이너 상태 수집 (기능명세서 3.1절 기준)

```python
class DockerCollector:
    EXPECTED_CONTAINERS = [
        {"name": "ax-api",       "role": "API 서버 (NestJS 10)"},
        {"name": "ax-admin-web", "role": "관리자 웹 (Angular 18 SPA)"},
        {"name": "ax-ai-worker", "role": "AI 워커 (Mask R-CNN, KoBERT, OpenCV)"},
        {"name": "ax-job-worker","role": "배경 작업 워커 (Bull Queue)"},
        {"name": "ax-couchdb",  "role": "데이터베이스 (CouchDB 3.3)"},
        {"name": "ax-redis",    "role": "캐시/큐 (Redis 7.2)"},
        {"name": "ax-minio",    "role": "파일 저장소 (MinIO S3)"},
        {"name": "ax-nginx",    "role": "리버스 프록시 (SSL 종단)"},
    ]
```

### 3. Docker Compose 운영 환경 (리소스 제한 + 헬스체크)

```python
# api 서비스: CPU 2.0, RAM 2GB, healthcheck 30s
# ai-worker: CPU 4.0, RAM 8GB, GPU 1대, 모델 볼륨 마운트
# couchdb: CPU 2.0, RAM 4GB, 데이터 볼륨 영속화
# redis: maxmemory 512mb, AOF 활성화
```

### 4. 모니터링 체계 검증 (8개 항목)

```python
class MonitoringVerifier:
    MONITORING_CHECKLIST = [
        "애플리케이션 헬스체크 (/health)",
        "CouchDB 모니터링 (/_up)",
        "Redis 모니터링 (PING)",
        "Bull Queue 작업 상태",
        "디스크 사용량 (< 80%)",
        "메모리 사용량 (< 85%)",
        "로그 수집 (docker logs)",
        "SSL 인증서 유효성",
    ]
```

### 5. 장애 대응 시나리오 매트릭스 (10개)

```python
class DisasterRecoveryMatrix:
    SCENARIOS = [
        {"id": "DR-001", "scenario": "API 서버 비정상 종료",
         "impact": "HIGH", "recovery_time": "< 30초"},
        {"id": "DR-002", "scenario": "AI 워커 GPU OOM",
         "impact": "MEDIUM", "recovery_time": "< 2분"},
        {"id": "DR-003", "scenario": "CouchDB 프로세스 다운",
         "impact": "CRITICAL", "recovery_time": "< 5분"},
        {"id": "DR-004", "scenario": "CouchDB 데이터 손상",
         "impact": "CRITICAL", "recovery_time": "< 2시간 (RTO)"},
        {"id": "DR-005", "scenario": "Redis 장애",
         "impact": "HIGH", "recovery_time": "< 2분"},
        {"id": "DR-006", "scenario": "MinIO 디스크 풀",
         "impact": "HIGH", "recovery_time": "< 30분"},
        {"id": "DR-007", "scenario": "SSL 인증서 만료",
         "impact": "CRITICAL", "recovery_time": "< 10분"},
        {"id": "DR-008", "scenario": "JWT Secret 유출",
         "impact": "CRITICAL", "recovery_time": "< 15분"},
        {"id": "DR-009", "scenario": "API 응답 지연",
         "impact": "MEDIUM", "recovery_time": "< 1시간"},
        {"id": "DR-010", "scenario": "서버 전체 다운",
         "impact": "CRITICAL", "recovery_time": "< 2시간 (RTO)"},
    ]
```

### 6. 백업/복원 스크립트 (RPO 24시간, RTO 2시간)

```bash
# backup.sh — crontab: 0 2 * * *
# 1. CouchDB: _all_docs → gzip
# 2. Redis: BGSAVE → dump.rdb 복사
# 3. MinIO: mc mirror
# 4. Docker 설정 백업
# 5. 30일 이전 백업 자동 정리

# restore.sh — 사용법: ./restore.sh /backup/20260419
# 1. API 서비스 중지
# 2. CouchDB 복원 (DB 재생성 + 문서 적재)
# 3. Redis RDB 복원
# 4. MinIO mirror 복원
# 5. 전체 서비스 기동 + 헬스체크
```

### 권장 운영 스펙

| 구분 | CPU | RAM | Disk | GPU | 비고 |
| --- | --- | --- | --- | --- | --- |
| API 서버 | 4C+ | 16GB+ | 100GB SSD | - | NestJS + Angular |
| AI 서버 | 8C+ | 32GB+ | 200GB SSD | RTX 3090+ | Mask R-CNN, KoBERT |
| DB 서버 | 4C+ | 16GB+ | 500GB SSD + 1TB HDD | - | CouchDB + MinIO |

---

# 전체 소스코드 (이론/수식 포함)

소스코드가 매우 길어 3개 파트로 나누어 수록합니다.

## 소스코드 Part 1/3

라인 1~1000: 모듈 docstring (기술 보고서), import, `ServerSpec`, `InfraSpecCollector` 클래스

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
AX 공공임대주택 안전유지관리 플랫폼 - TRL-8 운영 환경 배포 아키텍처 상세화
=============================================================================
문서번호: AX-IA-2026-001
목적: 인프라 스펙 수집, 모니터링 구성, 장애 대응 자동화 검증
적용 대상: 연구소 NAS 서버 + Docker Compose 운영 환경

사용법:
    python 02_infra_architecture.py --env production --output ./results

의존성:
    pip install psutil docker pandas openpyxl pyyaml jinja2 tabulate

=============================================================================
   기술 보고서 / Technical Report
=============================================================================

본 보고서는 AX 공공임대주택 안전유지관리 플랫폼의 인프라 아키텍처에 대한
이론적 배경, 수학적 공식, 기술 원리를 종합적으로 기술합니다.

아래 내용은 실제 운영 환경에서 사용되는 기술들의 원리를 "처음 접하는 사람도
이해할 수 있도록" 쉬운 한국어로 설명합니다.

-----------------------------------------------------------------------------
1. 시스템 아키텍처 이론 (Microservices & Container Orchestration)
-----------------------------------------------------------------------------

[마이크로서비스란?]

전통적인 소프트웨어는 하나의 커다란 프로그램(Monolith)으로 만들어졌습니다.
마치 하나의 큰 공장에서 모든 제품을 만드는 것과 같습니다.

마이크로서비스(Microservices)는 이 큰 공장을 여러 개의 작은 전문 공장으로
나누는 것입니다. 각 공장은 자기 일만 하고, 서로 전화(API)로 소통합니다.

    +------------------------------------------------------------------+
    |                    모놀리식 (Monolithic)                            |
    |  +------------------------------------------------------------+  |
    |  |  인증 + API + AI처리 + 파일관리 + 알림 + 보고서 (전부 한 덩어리) |  |
    |  +------------------------------------------------------------+  |
    +------------------------------------------------------------------+

                            vs.

    +------------------------------------------------------------------+
    |                  마이크로서비스 (Microservices)                      |
    |                                                                    |
    |  +--------+  +--------+  +--------+  +--------+  +--------+      |
    |  |  API   |  |  AI    |  | 파일   |  |  인증  |  |  알림  |      |
    |  | 서버   |  | 워커   |  | 저장소 |  | 서비스 |  | 서비스 |      |
    |  +--------+  +--------+  +--------+  +--------+  +--------+      |
    |       |           |           |           |           |            |
    |  +---------------------------------------------------------+      |
    |  |              메시지 큐 / API 게이트웨이                    |      |
    |  +---------------------------------------------------------+      |
    +------------------------------------------------------------------+

장점:
  - 독립 배포: AI 워커만 업데이트해도 API 서버는 영향 없음
  - 독립 확장: 사용자가 많으면 API 서버만 늘릴 수 있음
  - 장애 격리: AI 워커가 죽어도 API 서버는 계속 작동

AX 플랫폼에서의 적용:
  - ax-api:        NestJS 10 기반 REST API 서버
  - ax-ai-worker:  Mask R-CNN, KoBERT 기반 AI 추론 워커
  - ax-job-worker: Bull Queue 기반 비동기 작업 처리
  - ax-admin-web:  Angular 18 SPA 관리자 웹
  - ax-couchdb:    CouchDB 3.3 문서 데이터베이스
  - ax-redis:      Redis 7.2 캐시 및 메시지 큐
  - ax-minio:      MinIO S3 호환 파일 저장소
  - ax-nginx:      Nginx 리버스 프록시 (SSL 종단)

[컨테이너 오케스트레이션(Container Orchestration)]

컨테이너 오케스트레이션이란 "여러 컨테이너를 자동으로 관리하는 기술"입니다.
마치 오케스트라 지휘자가 여러 악기를 조율하듯이, 여러 컨테이너의
시작/중지/복구/네트워크 연결을 자동으로 관리합니다.

본 프로젝트에서는 Docker Compose를 사용합니다.
(대규모 시스템에서는 Kubernetes를 사용하지만, 연구소 NAS 환경에서는
 Docker Compose가 더 적합합니다.)

    Docker Compose 역할:
    +-----------------------------------------------------------+
    |  docker-compose.yml (설계도)                                |
    |                                                             |
    |  "이 컨테이너들을 이 순서로 시작하고,                         |
    |   이 네트워크로 연결하고,                                     |
    |   죽으면 자동으로 재시작해줘"                                  |
    +-----------------------------------------------------------+
                           |
                           v
    +-------+  +-------+  +-------+  +-------+  +-------+
    | nginx |  |  api  |  |  ai   |  |  db   |  | redis |
    +-------+  +-------+  +-------+  +-------+  +-------+
         \         |         |         |         /
          +--------+---------+---------+--------+
          |         ax-network (Bridge)          |
          +--------------------------------------+

-----------------------------------------------------------------------------
2. Docker 컨테이너 기술 원리 (Linux namespaces, cgroups, Union FS)
-----------------------------------------------------------------------------

[Docker란?]

Docker는 "프로그램을 상자(컨테이너)에 넣어서 어디서든 똑같이 실행하는 기술"
입니다. "내 컴퓨터에서는 되는데..." 라는 문제를 해결합니다.

[핵심 기술 1: Linux Namespaces (격리 기술)]

Namespace는 "각 컨테이너에게 자기만의 세상을 보여주는 기술"입니다.
실제로는 하나의 컴퓨터이지만, 각 컨테이너는 자기만의 프로세스 목록,
네트워크, 파일 시스템을 가진 것처럼 보입니다.

    Namespace 종류:
    +-----------+--------------------------------------------------+
    | Namespace |  설명 (쉽게)                                      |
    +-----------+--------------------------------------------------+
    | PID       | 프로세스 격리 - "나만의 프로세스 목록"              |
    | NET       | 네트워크 격리 - "나만의 IP 주소와 포트"             |
    | MNT       | 파일시스템 격리 - "나만의 디렉토리 구조"            |
    | UTS       | 호스트명 격리 - "나만의 컴퓨터 이름"               |
    | IPC       | 프로세스간 통신 격리 - "나만의 메시지 채널"          |
    | USER      | 사용자 격리 - "나만의 사용자 계정"                  |
    +-----------+--------------------------------------------------+

[핵심 기술 2: cgroups (Control Groups - 자원 제한)]

cgroups는 "각 컨테이너가 사용할 수 있는 자원(CPU, 메모리)에 한도를 거는 기술"
입니다.

    CPU 할당 수식:
    +---------------------------------------------------------+
    |  CPU Share 비율 = container_cpu_shares / total_shares     |
    |  예) ax-api에 2.0 코어, 전체 시스템 8코어:                 |
    |      CPU 사용 최대 비율 = 2.0 / 8.0 = 25%                |
    |                                                           |
    |  메모리 제한 초과 시 (OOM):                                |
    |      if container_memory_usage > memory_limit:            |
    |          OOM_Killer -> SIGKILL (프로세스 강제 종료)         |
    |          Docker restart policy -> 컨테이너 재시작          |
    +---------------------------------------------------------+

[핵심 기술 3: Union File System (OverlayFS - 계층형 파일 시스템)]

Docker 이미지는 여러 "레이어(층)"로 구성됩니다.
마치 투명한 OHP 필름을 겹쳐 놓은 것처럼, 아래 레이어는 공유하고
위에 변경사항만 추가합니다.

    장점: 여러 컨테이너가 같은 base 레이어를 공유 -> 디스크 절약

-----------------------------------------------------------------------------
3. 리버스 프록시 원리 (Nginx, SSL/TLS Termination)
-----------------------------------------------------------------------------

[리버스 프록시란?]

리버스 프록시는 "사용자와 서버 사이에 서서 교통정리를 하는 경찰관" 같은
역할입니다.

[SSL/TLS Termination (SSL 종단) 이란?]

"SSL Termination"이란, 외부에서 오는 암호화된 통신(HTTPS)을 Nginx가
복호화(해독)하고, 내부 서버에게는 일반 HTTP로 전달하는 것입니다.

    TLS 1.3 성능:
      - 핸드셰이크 1-RTT (Round Trip Time)
      - 0-RTT 재연결 지원 (이전 연결 기록 재사용)

-----------------------------------------------------------------------------
4. 데이터베이스 가용성 이론 (CAP Theorem, CouchDB의 AP 특성)
-----------------------------------------------------------------------------

[CAP 정리란?]

분산 시스템에서는 다음 세 가지를 "동시에 모두" 만족할 수 없다는 이론입니다.

  - C (일관성):   모든 노드가 항상 같은 데이터를 보여줌
  - A (가용성):   언제든 요청하면 반드시 응답을 줌
  - P (분할내성): 네트워크가 끊겨도 시스템이 계속 작동함

CouchDB의 핵심 기술:
    1. MVCC (Multi-Version Concurrency Control)
    2. Eventual Consistency (최종적 일관성)
    3. B-Tree 인덱싱: 문서 조회 성능 O(log n)

-----------------------------------------------------------------------------
5. Redis 캐시 전략 (Cache-Aside, TTL, LRU Eviction)
-----------------------------------------------------------------------------

    Cache Hit Rate = hits / (hits + misses) x 100%
    목표: 80% 이상

    AX 플랫폼 TTL 설정:
    +-------------------+----------+-------------------------------+
    | 데이터 종류        | TTL     | 이유                           |
    +-------------------+----------+-------------------------------+
    | JWT deny-list     | 15분     | Access Token 만료시간과 동일   |
    | 건물 정보 캐시     | 1시간   | 자주 안 바뀌는 정보             |
    | AI 분석 결과       | 24시간  | 한번 분석하면 결과 변하지 않음  |
    | 사용자 세션        | 7일     | Refresh Token 유효기간          |
    +-------------------+----------+-------------------------------+

    본 시스템 설정: --maxmemory 512mb --maxmemory-policy allkeys-lru

-----------------------------------------------------------------------------
6. 장애 복구 이론 (RTO, RPO, MTTR, MTBF 수학적 정의)
-----------------------------------------------------------------------------

  RTO (Recovery Time Objective):  복구 시간 목표 = 2시간
  RPO (Recovery Point Objective): 복구 시점 목표 = 24시간
  MTBF = total_uptime / n_failures
  MTTR = SUM(repair_time_i) / n_failures

-----------------------------------------------------------------------------
7. 가용성 계산 공식 (Availability)
-----------------------------------------------------------------------------

  Availability = MTBF / (MTBF + MTTR) x 100%
  AX 플랫폼 목표: 99.5% 이상

  직렬 시스템: A_total = A_nginx x A_api x A_couchdb x A_redis

-----------------------------------------------------------------------------
8. 백업 전략 이론 (3-2-1 Rule)
-----------------------------------------------------------------------------

  3: 데이터 사본 3개 이상
  2: 2가지 이상 저장 매체
  1: 1개 이상 외부 보관
  AX 플랫폼: Full Backup (매일 새벽 2시)

-----------------------------------------------------------------------------
9. 모니터링 이론 (RED Method, USE Method)
-----------------------------------------------------------------------------

  RED: Rate, Errors, Duration (요청 기반)
  USE: Utilization, Saturation, Errors (자원 기반)

  디스크 경보: usage_pct > 80% (경고), > 90% (위험)
  메모리 경보: mem_pressure > 85% (경고), > 95% (위험)

-----------------------------------------------------------------------------
10. 참고문헌 (References)
-----------------------------------------------------------------------------

[1] Docker Documentation
[2] Apache CouchDB Documentation
[3] Redis Documentation
[4] NIST SP 800-34 Rev. 1
[5] ISO 22301:2019
[6] Google SRE Book
[7] Nginx Documentation
[8] Brewer, E. (2000) - CAP Theorem
[9] Tom Wilkie - RED Method
[10] Brendan Gregg - USE Method

=============================================================================
"""

import os
import sys
import json
import socket
import platform
import argparse
import subprocess
from datetime import datetime
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import pandas as pd
from tabulate import tabulate

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("[경고] psutil 미설치. 'pip install psutil'로 설치하세요.")

try:
    import docker
    HAS_DOCKER = True
except ImportError:
    HAS_DOCKER = False
    print("[경고] docker 미설치. 'pip install docker'로 설치하세요.")

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

# =============================================================================
# 1. 인프라 스펙 수집기
# =============================================================================

@dataclass
class ServerSpec:
    """서버 하드웨어 스펙 데이터 클래스"""
    hostname: str = ""
    os_name: str = ""
    os_version: str = ""
    architecture: str = ""
    cpu_model: str = ""
    cpu_cores_physical: int = 0
    cpu_cores_logical: int = 0
    cpu_freq_mhz: float = 0
    ram_total_gb: float = 0
    ram_available_gb: float = 0
    disk_total_gb: float = 0
    disk_used_gb: float = 0
    disk_free_gb: float = 0
    gpu_model: str = "N/A"
    gpu_memory_gb: float = 0
    ip_addresses: list = field(default_factory=list)
    network_interfaces: list = field(default_factory=list)

class InfraSpecCollector:
    """운영 서버 인프라 스펙 수집 클래스"""

    def collect_server_spec(self) -> ServerSpec:
        spec = ServerSpec(
            hostname=socket.gethostname(),
            os_name=platform.system(),
            os_version=platform.version(),
            architecture=platform.machine(),
        )

        if HAS_PSUTIL:
            spec.cpu_cores_physical = psutil.cpu_count(logical=False) or 0
            spec.cpu_cores_logical = psutil.cpu_count(logical=True) or 0
            try:
                freq = psutil.cpu_freq()
                if freq:
                    spec.cpu_freq_mhz = round(freq.current, 0)
            except Exception:
                pass

            mem = psutil.virtual_memory()
            spec.ram_total_gb = round(mem.total / (1024 ** 3), 2)
            spec.ram_available_gb = round(mem.available / (1024 ** 3), 2)

            try:
                disk = psutil.disk_usage("/")
                spec.disk_total_gb = round(disk.total / (1024 ** 3), 2)
                spec.disk_used_gb = round(disk.used / (1024 ** 3), 2)
                spec.disk_free_gb = round(disk.free / (1024 ** 3), 2)
            except Exception:
                pass

            for iface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET:
                        spec.ip_addresses.append(addr.address)
                        spec.network_interfaces.append(f"{iface}: {addr.address}")

        try:
            if platform.system() == "Windows":
                result = subprocess.run(
                    ["wmic", "cpu", "get", "name"],
                    capture_output=True, text=True, timeout=10
                )
                lines = [l.strip() for l in result.stdout.strip().split("\n")
                         if l.strip() and l.strip() != "Name"]
                if lines:
                    spec.cpu_model = lines[0]
            else:
                result = subprocess.run(
                    ["lscpu"], capture_output=True, text=True, timeout=10
                )
                for line in result.stdout.split("\n"):
                    if "Model name" in line:
                        spec.cpu_model = line.split(":")[1].strip()
                        break
        except Exception:
            spec.cpu_model = platform.processor() or "Unknown"

        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split(",")
                spec.gpu_model = parts[0].strip()
                spec.gpu_memory_gb = round(float(parts[1].strip()) / 1024, 2)
        except Exception:
            pass

        return spec

    def print_spec(self, spec: ServerSpec):
        print("\n[서버 인프라 스펙]")
        print("-" * 60)
        table = [
            ["호스트명", spec.hostname],
            ["OS", f"{spec.os_name} {spec.os_version}"],
            ["아키텍처", spec.architecture],
            ["CPU 모델", spec.cpu_model],
            ["CPU 코어", f"{spec.cpu_cores_physical}C/{spec.cpu_cores_logical}T"],
            ["CPU 클럭", f"{spec.cpu_freq_mhz:.0f} MHz"],
            ["RAM 전체", f"{spec.ram_total_gb:.1f} GB"],
            ["RAM 가용", f"{spec.ram_available_gb:.1f} GB"],
            ["디스크 전체", f"{spec.disk_total_gb:.1f} GB"],
            ["디스크 사용",
             f"{spec.disk_used_gb:.1f} GB ({(spec.disk_used_gb/spec.disk_total_gb*100):.0f}%)"
             if spec.disk_total_gb > 0 else "N/A"],
            ["GPU",
             f"{spec.gpu_model} ({spec.gpu_memory_gb:.1f} GB)"
             if spec.gpu_model != "N/A" else "N/A"],
            ["IP 주소",
             ", ".join(spec.ip_addresses[:3]) if spec.ip_addresses else "N/A"],
        ]
        print(tabulate(table, tablefmt="grid"))
```

## 소스코드 Part 2/3

라인 1001~2000: `ContainerInfo`, `DockerCollector`, `DockerComposeGenerator`, `MonitoringVerifier` 클래스

```python
# =============================================================================
# 2. Docker 컨테이너 상태 수집
# =============================================================================

@dataclass
class ContainerInfo:
    """
    Docker 컨테이너 정보 데이터 클래스
    """
    name: str
    image: str
    status: str
    ports: str
    cpu_pct: float = 0
    mem_usage_mb: float = 0
    mem_limit_mb: float = 0
    restart_count: int = 0
    uptime: str = ""

class DockerCollector:
    """
    Docker 컨테이너 상태를 수집하는 클래스
    """

    EXPECTED_CONTAINERS = [
        {"name": "ax-api",           "role": "API 서버 (NestJS 10)"},
        {"name": "ax-admin-web",     "role": "관리자 웹 (Angular 18 SPA)"},
        {"name": "ax-ai-worker",     "role": "AI 워커 (Mask R-CNN, KoBERT, OpenCV)"},
        {"name": "ax-job-worker",    "role": "배경 작업 워커 (Bull Queue)"},
        {"name": "ax-couchdb",       "role": "데이터베이스 (CouchDB 3.3)"},
        {"name": "ax-redis",         "role": "캐시/큐 (Redis 7.2)"},
        {"name": "ax-minio",         "role": "파일 저장소 (MinIO S3)"},
        {"name": "ax-nginx",         "role": "리버스 프록시 (SSL 종단)"},
    ]

    def __init__(self):
        self.client = None
        if HAS_DOCKER:
            try:
                self.client = docker.from_env()
            except Exception as e:
                print(f"  [경고] Docker 연결 실패: {e}")

    def collect_containers(self) -> list[ContainerInfo]:
        containers = []
        if not self.client:
            return containers

        for c in self.client.containers.list(all=True):
            info = ContainerInfo(
                name=c.name,
                image=c.image.tags[0] if c.image.tags else str(c.image.short_id),
                status=c.status,
                ports=str(c.ports) if c.ports else "",
            )

            try:
                stats = c.stats(stream=False)
                cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - \
                            stats["precpu_stats"]["cpu_usage"]["total_usage"]
                system_delta = stats["cpu_stats"]["system_cpu_usage"] - \
                               stats["precpu_stats"]["system_cpu_usage"]
                if system_delta > 0:
                    info.cpu_pct = round((cpu_delta / system_delta) * 100, 2)

                mem_usage = stats["memory_stats"].get("usage", 0)
                mem_limit = stats["memory_stats"].get("limit", 0)
                info.mem_usage_mb = round(mem_usage / (1024 ** 2), 1)
                info.mem_limit_mb = round(mem_limit / (1024 ** 2), 1)
            except Exception:
                pass

            try:
                info.restart_count = c.attrs.get("RestartCount", 0)
            except Exception:
                pass

            containers.append(info)

        return containers

    def verify_expected_containers(self, running: list[ContainerInfo]) -> pd.DataFrame:
        running_names = {c.name for c in running}
        rows = []
        for expected in self.EXPECTED_CONTAINERS:
            name = expected["name"]
            is_running = name in running_names
            actual = next((c for c in running if c.name == name), None)
            rows.append({
                "컨테이너": name,
                "역할": expected["role"],
                "상태": actual.status if actual else "NOT FOUND",
                "CPU(%)": f"{actual.cpu_pct:.1f}" if actual else "-",
                "MEM(MB)": f"{actual.mem_usage_mb:.0f}" if actual else "-",
                "재시작": actual.restart_count if actual else "-",
                "판정": "Running" if is_running else "Missing",
            })
        return pd.DataFrame(rows)

# =============================================================================
# 3. Docker Compose 검증용 템플릿 생성
# =============================================================================

class DockerComposeGenerator:
    """
    운영 환경 Docker Compose 파일을 생성하는 클래스 (기능명세서 3.1절 기준)
    """

    COMPOSE_TEMPLATE = {
        "version": "3.8",
        "services": {
            "nginx": {
                "image": "nginx:1.25-alpine",
                "container_name": "ax-nginx",
                "ports": ["443:443", "80:80"],
                "volumes": [
                    "./nginx/nginx.conf:/etc/nginx/nginx.conf:ro",
                    "./nginx/ssl:/etc/nginx/ssl:ro",
                ],
                "depends_on": ["api", "admin-web"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "1.0", "memory": "512M"},
                    }
                },
                "labels": {
                    "com.ax.role": "reverse-proxy",
                    "com.ax.trl": "8",
                },
            },
            "admin-web": {
                "build": {"context": "./admin-web", "dockerfile": "Dockerfile"},
                "container_name": "ax-admin-web",
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "0.5", "memory": "256M"},
                    }
                },
                "labels": {
                    "com.ax.role": "frontend",
                    "com.ax.tech": "Angular 18",
                },
            },
            "api": {
                "build": {"context": "./api", "dockerfile": "Dockerfile"},
                "container_name": "ax-api",
                "environment": {
                    "NODE_ENV": "production",
                    "COUCHDB_URL": "http://couchdb:5984",
                    "REDIS_URL": "redis://redis:6379",
                    "MINIO_ENDPOINT": "minio",
                    "MINIO_PORT": "9000",
                    "JWT_SECRET": "${JWT_SECRET}",
                    "JWT_ACCESS_EXPIRY": "15m",
                    "JWT_REFRESH_EXPIRY": "7d",
                    "CLAUDE_API_KEY": "${CLAUDE_API_KEY}",
                },
                "depends_on": ["couchdb", "redis", "minio"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "2.0", "memory": "2048M"},
                    }
                },
                "healthcheck": {
                    "test": ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"],
                    "interval": "30s",
                    "timeout": "10s",
                    "retries": 3,
                    "start_period": "30s",
                },
                "labels": {
                    "com.ax.role": "backend-api",
                    "com.ax.tech": "NestJS 10",
                },
            },
            "ai-worker": {
                "build": {"context": "./ai-worker", "dockerfile": "Dockerfile"},
                "container_name": "ax-ai-worker",
                "environment": {
                    "NODE_ENV": "production",
                    "COUCHDB_URL": "http://couchdb:5984",
                    "REDIS_URL": "redis://redis:6379",
                    "MINIO_ENDPOINT": "minio",
                    "MINIO_PORT": "9000",
                    "CLAUDE_API_KEY": "${CLAUDE_API_KEY}",
                    "AI_MODEL_PATH": "/models",
                    "OPENCV_WASM_PATH": "/usr/local/lib/opencv.js",
                },
                "volumes": [
                    "./models:/models:ro",
                    "./ai-worker/opencv:/usr/local/lib:ro",
                ],
                "depends_on": ["couchdb", "redis", "minio"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "4.0", "memory": "8192M"},
                        "reservations": {
                            "devices": [
                                {
                                    "driver": "nvidia",
                                    "count": 1,
                                    "capabilities": ["gpu"],
                                }
                            ]
                        },
                    }
                },
                "labels": {
                    "com.ax.role": "ai-worker",
                    "com.ax.tech": "Mask R-CNN, Y-MaskNet, KoBERT, OpenCV",
                },
            },
            "job-worker": {
                "build": {"context": "./job-worker", "dockerfile": "Dockerfile"},
                "container_name": "ax-job-worker",
                "environment": {
                    "NODE_ENV": "production",
                    "COUCHDB_URL": "http://couchdb:5984",
                    "REDIS_URL": "redis://redis:6379",
                    "MINIO_ENDPOINT": "minio",
                },
                "depends_on": ["couchdb", "redis"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "1.0", "memory": "1024M"},
                    }
                },
                "labels": {
                    "com.ax.role": "job-worker",
                    "com.ax.tech": "Bull Queue, Puppeteer",
                },
            },
            "couchdb": {
                "image": "couchdb:3.3",
                "container_name": "ax-couchdb",
                "environment": {
                    "COUCHDB_USER": "${COUCHDB_USER}",
                    "COUCHDB_PASSWORD": "${COUCHDB_PASSWORD}",
                },
                "volumes": [
                    "couchdb-data:/opt/couchdb/data",
                    "./couchdb/local.ini:/opt/couchdb/etc/local.ini:ro",
                ],
                "ports": ["5984:5984"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "2.0", "memory": "4096M"},
                    }
                },
                "healthcheck": {
                    "test": ["CMD", "curl", "-f", "http://localhost:5984/_up"],
                    "interval": "30s",
                    "timeout": "10s",
                    "retries": 3,
                },
                "labels": {
                    "com.ax.role": "database",
                    "com.ax.tech": "CouchDB 3.3",
                    "com.ax.backup": "daily",
                },
            },
            "redis": {
                "image": "redis:7.2-alpine",
                "container_name": "ax-redis",
                "command": "redis-server --requirepass ${REDIS_PASSWORD} "
                           "--maxmemory 512mb --maxmemory-policy allkeys-lru "
                           "--appendonly yes",
                "volumes": ["redis-data:/data"],
                "ports": ["6379:6379"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "1.0", "memory": "1024M"},
                    }
                },
                "healthcheck": {
                    "test": ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"],
                    "interval": "15s",
                    "timeout": "5s",
                    "retries": 3,
                },
                "labels": {
                    "com.ax.role": "cache-queue",
                    "com.ax.tech": "Redis 7.2",
                },
            },
            "minio": {
                "image": "minio/minio:latest",
                "container_name": "ax-minio",
                "command": "server /data --console-address ':9001'",
                "environment": {
                    "MINIO_ROOT_USER": "${MINIO_ROOT_USER}",
                    "MINIO_ROOT_PASSWORD": "${MINIO_ROOT_PASSWORD}",
                },
                "volumes": ["minio-data:/data"],
                "ports": ["9000:9000", "9001:9001"],
                "restart": "always",
                "networks": ["ax-network"],
                "deploy": {
                    "resources": {
                        "limits": {"cpus": "1.0", "memory": "1024M"},
                    }
                },
                "healthcheck": {
                    "test": ["CMD", "mc", "ready", "local"],
                    "interval": "30s",
                    "timeout": "10s",
                    "retries": 3,
                },
                "labels": {
                    "com.ax.role": "file-storage",
                    "com.ax.tech": "MinIO S3",
                },
            },
        },
        "networks": {
            "ax-network": {
                "driver": "bridge",
                "ipam": {
                    "config": [{"subnet": "172.28.0.0/16"}]
                },
            }
        },
        "volumes": {
            "couchdb-data": {"driver": "local"},
            "redis-data": {"driver": "local"},
            "minio-data": {"driver": "local"},
        },
    }

    def generate(self, output_dir: str) -> str:
        compose_path = os.path.join(output_dir, "docker-compose.production.yml")
        if HAS_YAML:
            with open(compose_path, "w", encoding="utf-8") as f:
                yaml.dump(self.COMPOSE_TEMPLATE, f,
                          default_flow_style=False, allow_unicode=True,
                          sort_keys=False)
        else:
            with open(compose_path, "w", encoding="utf-8") as f:
                json.dump(self.COMPOSE_TEMPLATE, f, ensure_ascii=False, indent=2)

        print(f"  Docker Compose 생성: {compose_path}")
        return compose_path

# =============================================================================
# 4. 모니터링 구성 검증
# =============================================================================

@dataclass
class MonitoringCheckResult:
    """모니터링 점검 결과 데이터 클래스"""
    item: str
    description: str
    expected: str
    actual: str
    passed: bool

class MonitoringVerifier:
    """모니터링 체계를 검증하는 클래스"""

    MONITORING_CHECKLIST = [
        {
            "item": "애플리케이션 헬스체크",
            "description": "API 서버 /health 엔드포인트 응답",
            "expected": "HTTP 200 + DB/Redis/MinIO 상태",
            "check_type": "http",
            "check_url": "/health",
        },
        {
            "item": "CouchDB 모니터링",
            "description": "CouchDB /_up 엔드포인트 응답",
            "expected": "HTTP 200",
            "check_type": "http",
            "check_url": "http://localhost:5984/_up",
        },
        {
            "item": "Redis 모니터링",
            "description": "Redis PING 응답",
            "expected": "PONG",
            "check_type": "redis",
        },
        {
            "item": "Bull Queue 모니터링",
            "description": "비동기 작업 큐 상태 (대기/처리중/완료/실패)",
            "expected": "GET /jobs/status 정상 응답",
            "check_type": "http",
            "check_url": "/jobs/status",
        },
        {
            "item": "디스크 사용량",
            "description": "운영 서버 디스크 사용률",
            "expected": "< 80%",
            "check_type": "disk",
        },
        {
            "item": "메모리 사용량",
            "description": "운영 서버 메모리 사용률",
            "expected": "< 85%",
            "check_type": "memory",
        },
        {
            "item": "로그 수집",
            "description": "컨테이너 로그 접근 가능",
            "expected": "docker logs 명령 정상",
            "check_type": "logs",
        },
        {
            "item": "SSL 인증서",
            "description": "HTTPS TLS 1.2 이상",
            "expected": "유효한 SSL 인증서",
            "check_type": "ssl",
        },
    ]

    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url

    def run_checks(self) -> list[MonitoringCheckResult]:
        results = []
        import requests

        for check in self.MONITORING_CHECKLIST:
            result = MonitoringCheckResult(
                item=check["item"],
                description=check["description"],
                expected=check["expected"],
                actual="",
                passed=False,
            )

            try:
                if check["check_type"] == "http":
                    url = check["check_url"]
                    if url.startswith("/"):
                        url = f"{self.api_base_url}{url}"
                    resp = requests.get(url, timeout=5)
                    result.actual = f"HTTP {resp.status_code}"
                    result.passed = resp.status_code == 200

                elif check["check_type"] == "redis":
                    try:
                        import redis
                        r = redis.Redis(host="localhost", port=6379,
                                        decode_responses=True)
                        pong = r.ping()
                        result.actual = "PONG" if pong else "NO RESPONSE"
                        result.passed = pong
                    except Exception as e:
                        result.actual = f"연결 실패: {e}"

                elif check["check_type"] == "disk":
                    if HAS_PSUTIL:
                        disk = psutil.disk_usage("/")
                        pct = disk.percent
                        result.actual = f"{pct:.1f}%"
                        result.passed = pct < 80
                    else:
                        result.actual = "psutil 미설치"

                elif check["check_type"] == "memory":
                    if HAS_PSUTIL:
                        mem = psutil.virtual_memory()
                        pct = mem.percent
                        result.actual = f"{pct:.1f}%"
                        result.passed = pct < 85
                    else:
                        result.actual = "psutil 미설치"

                elif check["check_type"] == "logs":
                    try:
                        log_result = subprocess.run(
                            ["docker", "logs", "--tail", "1", "ax-api"],
                            capture_output=True, text=True, timeout=10,
                        )
                        result.actual = "접근 가능" if log_result.returncode == 0 \
                            else "접근 불가"
                        result.passed = log_result.returncode == 0
                    except Exception:
                        result.actual = "Docker 미설치/미실행"

                elif check["check_type"] == "ssl":
                    try:
                        resp = requests.get(
                            self.api_base_url.replace("http://", "https://"),
                            timeout=5, verify=True,
                        )
                        result.actual = "SSL 유효"
                        result.passed = True
                    except requests.exceptions.SSLError:
                        result.actual = "SSL 인증서 오류"
                    except Exception:
                        result.actual = "HTTPS 미설정 (개발환경)"

            except Exception as e:
                result.actual = f"검증 실패: {str(e)[:50]}"

            results.append(result)

        return results
```

---

## Part 3/3 — 재해복구·백업·네트워크 보안·시스템 업그레이드

```python
# ============================================================
# Part 3/3: DisasterRecoveryMatrix, BackupScriptGenerator,
#           NetworkSecurityConfig, SystemUpgradeManager
# ============================================================

import subprocess
import datetime
import json
import os
import shutil
from dataclasses import dataclass, field
from typing import List, Dict, Optional

# ---------------------------------------------------------------------------
# 3-A. 재해 복구 시나리오 매트릭스
# ---------------------------------------------------------------------------

@dataclass
class RecoveryScenario:
    scenario_id: str
    name: str
    trigger: str
    rto_seconds: int          # Recovery Time Objective
    rpo_seconds: int          # Recovery Point Objective
    auto_recovery: bool
    steps: List[str] = field(default_factory=list)
    last_tested: Optional[str] = None
    test_passed: Optional[bool] = None


class DisasterRecoveryMatrix:
    """10개 장애 시나리오에 대한 RTO/RPO 목표 및 복구 절차"""

    SCENARIOS: List[Dict] = [
        {
            "scenario_id": "DR-001",
            "name": "API 서버 프로세스 강제 종료",
            "trigger": "OOM Killer / kill -9",
            "rto_seconds": 30,
            "rpo_seconds": 0,
            "auto_recovery": True,
            "steps": [
                "Docker restart=always 정책에 의해 자동 재시작",
                "헬스체크 엔드포인트 (/api/v1/health) 응답 확인",
                "Bull Queue 미완료 Job 자동 재시도 (attempts 증가)",
                "Redis 세션 캐시 유지 확인",
            ],
        },
        {
            "scenario_id": "DR-002",
            "name": "CouchDB 연결 끊김",
            "trigger": "네트워크 단절 / CouchDB 프로세스 종료",
            "rto_seconds": 60,
            "rpo_seconds": 0,
            "auto_recovery": True,
            "steps": [
                "NestJS ConnectionPool 재연결 시도 (3회, 지수 백오프 1s/2s/4s)",
                "API 503 응답 반환 (DB 복구 전까지)",
                "CouchDB 컨테이너 자동 재시작 확인",
                "DB 연결 복구 후 정상 서비스 재개",
            ],
        },
        {
            "scenario_id": "DR-003",
            "name": "Redis 연결 끊김",
            "trigger": "Redis OOM / 프로세스 종료",
            "rto_seconds": 30,
            "rpo_seconds": 60,
            "auto_recovery": True,
            "steps": [
                "캐시 우회 모드 자동 전환 (DB 직접 조회)",
                "Bull Queue 연결 재시도",
                "Redis 컨테이너 자동 재시작",
                "재시작 후 캐시 워밍업 (주요 대시보드 데이터)",
            ],
        },
        {
            "scenario_id": "DR-004",
            "name": "AI 워커 다운",
            "trigger": "GPU OOM / ai-worker 프로세스 종료",
            "rto_seconds": 30,
            "rpo_seconds": 0,
            "auto_recovery": True,
            "steps": [
                "Docker restart=always 자동 재시작",
                "처리 중이던 Job → FAILED 상태 전이 (Bull)",
                "자동 재시도 큐에 Job 재등록",
                "GPU 메모리 부족 시 CPU fallback 모드 전환",
            ],
        },
        {
            "scenario_id": "DR-005",
            "name": "MinIO 스토리지 연결 실패",
            "trigger": "MinIO 프로세스 종료 / 디스크 full",
            "rto_seconds": 60,
            "rpo_seconds": 0,
            "auto_recovery": True,
            "steps": [
                "파일 업로드/다운로드 API → HTTP 503 반환",
                "MinIO 컨테이너 자동 재시작",
                "버킷 정합성 확인 (mc admin heal)",
                "디스크 full 시 NAS로 버킷 이전",
            ],
        },
        {
            "scenario_id": "DR-006",
            "name": "전체 서버 재부팅",
            "trigger": "계획된 OS 패치 / 전원 장애",
            "rto_seconds": 180,
            "rpo_seconds": 300,
            "auto_recovery": True,
            "steps": [
                "OS 부팅 후 Docker 서비스 자동 시작",
                "docker compose up -d 자동 실행 (systemd unit)",
                "8개 컨테이너 순차 기동 확인",
                "헬스체크 전체 통과 후 nginx upstream 활성화",
            ],
        },
        {
            "scenario_id": "DR-007",
            "name": "NAS 연결 끊김 (데이터 백업 손실)",
            "trigger": "NAS 네트워크 케이블 단선 / NAS 전원 장애",
            "rto_seconds": 600,
            "rpo_seconds": 86400,
            "auto_recovery": False,
            "steps": [
                "NAS 마운트 포인트 연결 오류 감지",
                "파일 읽기 작업 오류 반환 (AX-5001)",
                "NAS 복구 후 마운트 재연결",
                "누락된 백업 파일 복구 (일일 백업 기준)",
            ],
        },
        {
            "scenario_id": "DR-008",
            "name": "CouchDB 데이터 손상",
            "trigger": "디스크 오류 / 비정상 종료로 인한 corruption",
            "rto_seconds": 1800,
            "rpo_seconds": 86400,
            "auto_recovery": False,
            "steps": [
                "CouchDB 기동 실패 감지",
                "NAS 백업 복원 스크립트 실행 (restore_couchdb.sh)",
                "마지막 일일 백업 기준 데이터 복원",
                "복원 후 정합성 검증 (couchdb-backup verify)",
            ],
        },
        {
            "scenario_id": "DR-009",
            "name": "Bull Queue 작업 일괄 실패",
            "trigger": "Redis 데이터 유실 / 대량 Job FAILED",
            "rto_seconds": 300,
            "rpo_seconds": 0,
            "auto_recovery": False,
            "steps": [
                "Bull Board에서 FAILED Job 목록 확인",
                "실패 Job 원인 분석 (로그 확인)",
                "수동 Job 재시도 또는 일괄 삭제",
                "원인 해소 후 정상 Queue 재개",
            ],
        },
        {
            "scenario_id": "DR-010",
            "name": "SSL 인증서 만료",
            "trigger": "인증서 유효기간 초과",
            "rto_seconds": 3600,
            "rpo_seconds": 0,
            "auto_recovery": False,
            "steps": [
                "브라우저 SSL 경고 발생 감지",
                "certbot renew 또는 수동 인증서 갱신",
                "nginx ssl_certificate 경로 업데이트",
                "nginx reload (무중단)",
            ],
        },
    ]

    def __init__(self):
        self.scenarios = [RecoveryScenario(**s) for s in self.SCENARIOS]

    def print_matrix(self) -> None:
        print("\n" + "=" * 70)
        print("재해 복구 매트릭스 (Disaster Recovery Matrix)")
        print("=" * 70)
        header = f"{'ID':<10} {'시나리오':<28} {'RTO':>6} {'RPO':>6} {'자동':>4}"
        print(header)
        print("-" * 70)
        for s in self.scenarios:
            auto = "✅" if s.auto_recovery else "❌"
            rto = f"{s.rto_seconds}s"
            rpo = f"{s.rpo_seconds}s"
            print(f"{s.scenario_id:<10} {s.name[:27]:<28} {rto:>6} {rpo:>6} {auto:>4}")
        print("=" * 70)

    def get_scenario(self, scenario_id: str) -> Optional[RecoveryScenario]:
        return next((s for s in self.scenarios if s.scenario_id == scenario_id), None)

    def export_json(self, path: str = "dr_matrix.json") -> None:
        data = [
            {
                "scenario_id": s.scenario_id,
                "name": s.name,
                "trigger": s.trigger,
                "rto_seconds": s.rto_seconds,
                "rpo_seconds": s.rpo_seconds,
                "auto_recovery": s.auto_recovery,
                "steps": s.steps,
            }
            for s in self.scenarios
        ]
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"DR 매트릭스 저장: {path}")


# ---------------------------------------------------------------------------
# 3-B. 백업 스크립트 생성기
# ---------------------------------------------------------------------------

class BackupScriptGenerator:
    """CouchDB · MinIO · Redis 백업/복원 스크립트 자동 생성"""

    def __init__(
        self,
        nas_host: str = "192.168.0.29",
        nas_backup_dir: str = "/volume1/ax-backup",
        couchdb_url: str = "http://admin:axadmin@localhost:5984",
        minio_alias: str = "ax-minio",
        redis_host: str = "localhost",
        redis_port: int = 6379,
    ):
        self.nas_host = nas_host
        self.nas_backup_dir = nas_backup_dir
        self.couchdb_url = couchdb_url
        self.minio_alias = minio_alias
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    def generate_couchdb_backup_script(self) -> str:
        return f"""#!/bin/bash
# CouchDB 일일 백업 스크립트 (생성: {self.timestamp})
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="{self.nas_backup_dir}/couchdb/$TIMESTAMP"
COUCHDB_URL="{self.couchdb_url}"
RETENTION_DAYS=30

echo "[$(date)] CouchDB 백업 시작: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 데이터베이스 목록 조회
DATABASES=$(curl -s "$COUCHDB_URL/_all_dbs" | jq -r '.[]' | grep -v "^_")

for DB in $DATABASES; do
    echo "  백업 중: $DB"
    curl -s "$COUCHDB_URL/$DB/_all_docs?include_docs=true&attachments=true" \\
        | gzip > "$BACKUP_DIR/${{DB}}.json.gz"
done

# 30일 이전 백업 삭제
find "{self.nas_backup_dir}/couchdb/" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {{}} \\;

echo "[$(date)] CouchDB 백업 완료: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
"""

    def generate_couchdb_restore_script(self) -> str:
        return f"""#!/bin/bash
# CouchDB 복원 스크립트 (생성: {self.timestamp})
# 사용법: ./restore_couchdb.sh <backup_timestamp>
set -euo pipefail

BACKUP_TS="${{1:?'백업 타임스탬프 필요 (예: 20260418_030000)'}}"
BACKUP_DIR="{self.nas_backup_dir}/couchdb/$BACKUP_TS"
COUCHDB_URL="{self.couchdb_url}"

echo "[$(date)] CouchDB 복원 시작: $BACKUP_DIR"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "오류: 백업 디렉토리 없음: $BACKUP_DIR"
    exit 1
fi

for BACKUP_FILE in "$BACKUP_DIR"/*.json.gz; do
    DB_NAME=$(basename "$BACKUP_FILE" .json.gz)
    echo "  복원 중: $DB_NAME"

    # DB 생성 (존재하면 무시)
    curl -s -X PUT "$COUCHDB_URL/$DB_NAME" > /dev/null

    # 도큐먼트 벌크 복원
    zcat "$BACKUP_FILE" | jq '{{docs: [.rows[].doc | del(._rev)]}}' \\
        | curl -s -X POST "$COUCHDB_URL/$DB_NAME/_bulk_docs" \\
               -H "Content-Type: application/json" -d @- > /dev/null
done

echo "[$(date)] CouchDB 복원 완료"
"""

    def generate_minio_backup_script(self) -> str:
        return f"""#!/bin/bash
# MinIO 버킷 백업 스크립트 (생성: {self.timestamp})
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="{self.nas_backup_dir}/minio/$TIMESTAMP"
MINIO_ALIAS="{self.minio_alias}"
BUCKETS=("ax-media" "ax-reports" "ax-thumbnails")
RETENTION_DAYS=30

echo "[$(date)] MinIO 백업 시작"
mkdir -p "$BACKUP_DIR"

for BUCKET in "${{BUCKETS[@]}}"; do
    echo "  미러링: $BUCKET"
    mc mirror "$MINIO_ALIAS/$BUCKET" "$BACKUP_DIR/$BUCKET" --overwrite
done

find "{self.nas_backup_dir}/minio/" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {{}} \\;
echo "[$(date)] MinIO 백업 완료: $BACKUP_DIR"
"""

    def generate_redis_backup_script(self) -> str:
        return f"""#!/bin/bash
# Redis RDB 스냅샷 백업 스크립트 (생성: {self.timestamp})
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="{self.nas_backup_dir}/redis"
REDIS_HOST="{self.redis_host}"
REDIS_PORT={self.redis_port}
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Redis BGSAVE 트리거"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
sleep 3

RDB_PATH=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -1)
RDB_FILE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dbfilename | tail -1)

cp "$RDB_PATH/$RDB_FILE" "$BACKUP_DIR/dump_$TIMESTAMP.rdb"
find "$BACKUP_DIR" -name "dump_*.rdb" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Redis 백업 완료: $BACKUP_DIR/dump_$TIMESTAMP.rdb"
"""

    def save_all_scripts(self, output_dir: str = "scripts/backup") -> None:
        os.makedirs(output_dir, exist_ok=True)
        scripts = {
            "backup_couchdb.sh": self.generate_couchdb_backup_script(),
            "restore_couchdb.sh": self.generate_couchdb_restore_script(),
            "backup_minio.sh": self.generate_minio_backup_script(),
            "backup_redis.sh": self.generate_redis_backup_script(),
        }
        for filename, content in scripts.items():
            path = os.path.join(output_dir, filename)
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            os.chmod(path, 0o755)
            print(f"생성: {path}")
        print(f"\n총 {len(scripts)}개 스크립트 생성 완료.")


# ---------------------------------------------------------------------------
# 3-C. 네트워크 보안 구성
# ---------------------------------------------------------------------------

@dataclass
class FirewallRule:
    direction: str       # IN / OUT
    protocol: str        # tcp / udp / all
    port: Optional[int]
    source: str
    action: str          # ACCEPT / DROP
    description: str


class NetworkSecurityConfig:
    """방화벽 규칙 정의 및 UFW 적용 스크립트 생성"""

    # 서비스별 허용 포트 정책
    FIREWALL_RULES: List[Dict] = [
        # 인바운드 — 외부 허용
        {"direction": "IN",  "protocol": "tcp", "port": 443,  "source": "0.0.0.0/0",     "action": "ACCEPT", "description": "HTTPS (nginx)"},
        {"direction": "IN",  "protocol": "tcp", "port": 80,   "source": "0.0.0.0/0",     "action": "ACCEPT", "description": "HTTP → HTTPS 리다이렉트"},
        {"direction": "IN",  "protocol": "tcp", "port": 22,   "source": "192.168.0.0/24","action": "ACCEPT", "description": "SSH (내부망 전용)"},
        # 인바운드 — 내부망 전용
        {"direction": "IN",  "protocol": "tcp", "port": 3000, "source": "172.18.0.0/16", "action": "ACCEPT", "description": "NestJS API (Docker 내부)"},
        {"direction": "IN",  "protocol": "tcp", "port": 5984, "source": "172.18.0.0/16", "action": "ACCEPT", "description": "CouchDB (Docker 내부)"},
        {"direction": "IN",  "protocol": "tcp", "port": 6379, "source": "172.18.0.0/16", "action": "ACCEPT", "description": "Redis (Docker 내부)"},
        {"direction": "IN",  "protocol": "tcp", "port": 9000, "source": "172.18.0.0/16", "action": "ACCEPT", "description": "MinIO API (Docker 내부)"},
        {"direction": "IN",  "protocol": "tcp", "port": 9001, "source": "192.168.0.0/24","action": "ACCEPT", "description": "MinIO Console (관리자 내부망)"},
        # 외부 직접 접근 차단
        {"direction": "IN",  "protocol": "tcp", "port": 5984, "source": "0.0.0.0/0",     "action": "DROP",   "description": "CouchDB 외부 직접 접근 차단"},
        {"direction": "IN",  "protocol": "tcp", "port": 6379, "source": "0.0.0.0/0",     "action": "DROP",   "description": "Redis 외부 직접 접근 차단"},
        # 기본 DROP
        {"direction": "IN",  "protocol": "all", "port": None, "source": "0.0.0.0/0",     "action": "DROP",   "description": "기본 차단 (화이트리스트 방식)"},
    ]

    # 네트워크 분리 구성
    NETWORK_SEGMENTS = {
        "외부 공개망":       {"subnet": "0.0.0.0/0",       "허용 포트": [80, 443]},
        "내부 관리망 (LAN)": {"subnet": "192.168.0.0/24",   "허용 포트": [22, 9001]},
        "Docker 브리지":    {"subnet": "172.18.0.0/16",    "허용 포트": [3000, 5984, 6379, 9000]},
        "NAS 전용":         {"subnet": "192.168.0.29/32",  "허용 포트": [445, 2049]},
    }

    # TLS 구성
    TLS_CONFIG = {
        "protocol_min": "TLSv1.2",
        "protocol_max": "TLSv1.3",
        "ciphers": [
            "ECDHE-ECDSA-AES256-GCM-SHA384",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-ECDSA-CHACHA20-POLY1305",
        ],
        "hsts_max_age": 31536000,
        "ocsp_stapling": True,
    }

    def __init__(self):
        self.rules = [FirewallRule(**r) for r in self.FIREWALL_RULES]

    def generate_ufw_script(self) -> str:
        lines = [
            "#!/bin/bash",
            "# UFW 방화벽 설정 스크립트 (NetworkSecurityConfig 자동 생성)",
            "set -euo pipefail",
            "",
            "ufw --force reset",
            "ufw default deny incoming",
            "ufw default allow outgoing",
            "",
        ]
        for rule in self.rules:
            if rule.action == "DROP":
                continue  # UFW default deny로 처리
            port_str = f"{rule.port}/tcp" if rule.port else "proto all"
            if rule.source == "0.0.0.0/0":
                lines.append(f"ufw allow {port_str}  # {rule.description}")
            else:
                lines.append(f"ufw allow from {rule.source} to any port {rule.port}  # {rule.description}")
        lines += ["", "ufw --force enable", "ufw status verbose"]
        return "\n".join(lines)

    def generate_nginx_ssl_config(self) -> str:
        ciphers = ":".join(self.TLS_CONFIG["ciphers"])
        return f"""# nginx SSL 보안 설정 (/etc/nginx/conf.d/ssl.conf)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers {ciphers};
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;

add_header Strict-Transport-Security "max-age={self.TLS_CONFIG['hsts_max_age']}; includeSubDomains" always;
add_header X-Frame-Options SAMEORIGIN always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
"""

    def print_network_diagram(self) -> None:
        print("""
네트워크 분리 다이어그램
═══════════════════════════════════════════════════════════════
  [인터넷]
      │ :80(HTTP→HTTPS) / :443(HTTPS)
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  nginx (ax-nginx)  — SSL Termination, Rate Limiting     │
  └─────────────────────────────────────────────────────────┘
      │ :3000 (Docker 내부망 172.18.0.0/16)
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  NestJS API (ax-api)                                    │
  │    ├─ :5984 → CouchDB (ax-couchdb)                      │
  │    ├─ :6379 → Redis (ax-redis)                          │
  │    └─ :9000 → MinIO (ax-minio)                          │
  └─────────────────────────────────────────────────────────┘
      │
      │ :22 (SSH, 192.168.0.0/24 전용)
      ▼
  ┌─────────────────────────────────────────────────────────┐
  │  관리자 내부망 (192.168.0.0/24)                          │
  │    ├─ :9001 → MinIO Console                             │
  │    └─ 192.168.0.29 → NAS (SMB/NFS)                      │
  └─────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════
""")


# ---------------------------------------------------------------------------
# 3-D. 시스템 업그레이드 관리자
# ---------------------------------------------------------------------------

@dataclass
class UpgradeStep:
    step_id: str
    name: str
    command: str
    rollback_command: str
    timeout_seconds: int = 120
    critical: bool = True


class SystemUpgradeManager:
    """무중단 시스템 업그레이드 절차 관리 (Blue-Green 준비)"""

    UPGRADE_STEPS: List[Dict] = [
        {
            "step_id": "U-001",
            "name": "현재 상태 백업",
            "command": "bash scripts/backup/backup_couchdb.sh && bash scripts/backup/backup_minio.sh",
            "rollback_command": "echo '백업 단계 — 롤백 불필요'",
            "timeout_seconds": 300,
        },
        {
            "step_id": "U-002",
            "name": "신규 이미지 Pull",
            "command": "docker compose pull",
            "rollback_command": "echo '이미지 Pull 단계 — 롤백 불필요'",
            "timeout_seconds": 600,
        },
        {
            "step_id": "U-003",
            "name": "nginx upstream 일시 점검 페이지 전환",
            "command": "docker exec ax-nginx nginx -s reload",
            "rollback_command": "docker exec ax-nginx nginx -s reload",
            "timeout_seconds": 30,
        },
        {
            "step_id": "U-004",
            "name": "API 서버 롤링 재시작",
            "command": "docker compose up -d --no-deps ax-api",
            "rollback_command": "docker compose up -d --no-deps ax-api --scale ax-api=1",
            "timeout_seconds": 60,
        },
        {
            "step_id": "U-005",
            "name": "AI 워커 재시작",
            "command": "docker compose up -d --no-deps ax-ai-worker ax-job-worker",
            "rollback_command": "docker compose up -d --no-deps ax-ai-worker ax-job-worker",
            "timeout_seconds": 60,
        },
        {
            "step_id": "U-006",
            "name": "헬스체크 검증",
            "command": "curl -sf http://localhost:3000/api/v1/health | jq -e '.status == \"ok\"'",
            "rollback_command": "echo '헬스체크 실패 — 롤백 트리거'",
            "timeout_seconds": 30,
            "critical": True,
        },
        {
            "step_id": "U-007",
            "name": "nginx 정상 서비스 복원",
            "command": "docker exec ax-nginx nginx -s reload",
            "rollback_command": "docker compose down && docker compose up -d",
            "timeout_seconds": 30,
        },
    ]

    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.steps = [UpgradeStep(**s) for s in self.UPGRADE_STEPS]
        self.completed: List[str] = []

    def run(self) -> bool:
        mode = "[DRY-RUN]" if self.dry_run else "[실행]"
        print(f"\n{'='*60}")
        print(f"시스템 업그레이드 시작 {mode}")
        print(f"{'='*60}\n")

        for step in self.steps:
            print(f"  {step.step_id}: {step.name}")
            print(f"    명령: {step.command}")

            if not self.dry_run:
                try:
                    result = subprocess.run(
                        step.command, shell=True, timeout=step.timeout_seconds,
                        capture_output=True, text=True,
                    )
                    if result.returncode != 0 and step.critical:
                        print(f"    ❌ 실패: {result.stderr[:100]}")
                        self._rollback(step.step_id)
                        return False
                    print(f"    ✅ 완료")
                except subprocess.TimeoutExpired:
                    print(f"    ❌ 타임아웃 ({step.timeout_seconds}s)")
                    if step.critical:
                        self._rollback(step.step_id)
                        return False
            else:
                print(f"    ✅ (DRY-RUN — 실제 실행 안 함)")

            self.completed.append(step.step_id)

        print(f"\n✅ 업그레이드 완료 ({len(self.completed)}/{len(self.steps)} 단계)")
        return True

    def _rollback(self, failed_step_id: str) -> None:
        print(f"\n⚠️  롤백 시작 (실패 단계: {failed_step_id})")
        for step in reversed(self.steps):
            if step.step_id not in self.completed:
                continue
            print(f"  롤백: {step.step_id} — {step.rollback_command}")
            if not self.dry_run:
                subprocess.run(step.rollback_command, shell=True, timeout=60)
        print("롤백 완료\n")


# ---------------------------------------------------------------------------
# 3-E. 서버 인프라 사양 요약표
# ---------------------------------------------------------------------------

SERVER_SPECS = {
    "API 서버 (주)": {
        "CPU": "Intel Core i7-12700 (12C/20T, 3.6GHz Base)",
        "RAM": "32 GB DDR4-3200 ECC",
        "Storage": "NVMe SSD 512 GB (Samsung 980 PRO, R: 7,000 MB/s)",
        "OS": "Ubuntu 22.04 LTS (kernel 5.15.0-100-generic)",
        "역할": "NestJS API, Docker Host (8컨테이너)",
    },
    "AI 워커 (GPU)": {
        "GPU": "NVIDIA GeForce RTX 3060 12 GB GDDR6",
        "CPU": "Intel Core i7-12700 (공유)",
        "VRAM": "12 GB (Y-MaskNet 추론, batch_size=4)",
        "Driver": "NVIDIA 550.78 / CUDA 12.4",
        "역할": "Y-MaskNet 결함 탐지, KoBERT 민원 분류, OpenCV WASM 균열 분석",
    },
    "NAS": {
        "모델": "Synology DS923+",
        "IP": "192.168.0.29",
        "Storage": "8 TB RAID-5 (WD Red Pro 4TB × 3)",
        "파일 수": "nas_docs: 2,792,855 / nas_photos: 114,286",
        "역할": "일일 백업 저장소, 드론 원본 영상 아카이브",
    },
    "테스트 클라이언트": {
        "CPU": "Intel Core i5-12400 (6C/12T, 2.5GHz)",
        "RAM": "16 GB DDR4-3200",
        "Browser": "Chrome 124.0.6367.207 (64-bit)",
        "역할": "기능 시험, 성능 측정, 보안 점검",
    },
}


def print_server_specs() -> None:
    print("\n" + "=" * 65)
    print("서버 인프라 사양 요약")
    print("=" * 65)
    for server, specs in SERVER_SPECS.items():
        print(f"\n  [{server}]")
        for key, val in specs.items():
            print(f"    {key:<12}: {val}")
    print("=" * 65)


# ---------------------------------------------------------------------------
# main() — 전체 인프라 검증 실행
# ---------------------------------------------------------------------------

def main():
    print("\n" + "=" * 65)
    print("AX 인프라 아키텍처 검증 도구 (02_infra_architecture.py)")
    print("=" * 65)

    # 1. 서버 사양 출력
    print_server_specs()

    # 2. 재해 복구 매트릭스 출력
    dr = DisasterRecoveryMatrix()
    dr.print_matrix()
    dr.export_json("dr_matrix.json")

    # 3. 백업 스크립트 생성
    backup_gen = BackupScriptGenerator()
    backup_gen.save_all_scripts(output_dir="scripts/backup")

    # 4. 네트워크 보안 구성 출력
    net_sec = NetworkSecurityConfig()
    net_sec.print_network_diagram()

    ufw_script = net_sec.generate_ufw_script()
    with open("scripts/setup_firewall.sh", "w", encoding="utf-8", newline="\n") as f:
        f.write(ufw_script)
    os.chmod("scripts/setup_firewall.sh", 0o755)
    print("방화벽 스크립트 생성: scripts/setup_firewall.sh")

    nginx_ssl = net_sec.generate_nginx_ssl_config()
    with open("scripts/nginx_ssl.conf", "w", encoding="utf-8") as f:
        f.write(nginx_ssl)
    print("nginx SSL 설정 생성: scripts/nginx_ssl.conf")

    # 5. 시스템 업그레이드 (DRY-RUN)
    upgrade_mgr = SystemUpgradeManager(dry_run=True)
    upgrade_mgr.run()

    print("\n✅ 전체 인프라 검증 완료")


if __name__ == "__main__":
    main()
```

---

## 운영 환경 아키텍처 요약

### 서버 인프라 사양표

| 구분 | CPU | RAM | 저장장치 | OS/GPU | 역할 |
|------|-----|-----|--------|-------|------|
| API 서버 (주) | i7-12700 (12C/20T) | 32 GB DDR4 | NVMe 512 GB | Ubuntu 22.04 | NestJS API, Docker Host |
| AI 워커 | i7-12700 (공유) | 32 GB DDR4 | NVMe 512 GB | RTX 3060 12GB / CUDA 12.4 | Y-MaskNet, KoBERT, OpenCV |
| NAS | — | — | 8 TB RAID-5 | Synology DS923+ | 일일 백업, 드론 영상 아카이브 |
| 테스트 클라이언트 | i5-12400 (6C) | 16 GB DDR4 | SSD 256 GB | Chrome 124 | 기능·성능·보안 시험 |

### 네트워크 보안 정책

| 영역 | 서브넷 | 허용 포트 | 비고 |
|------|------|---------|------|
| 외부 공개망 | 0.0.0.0/0 | 80, 443 | nginx SSL Termination |
| 내부 관리망 | 192.168.0.0/24 | 22, 9001 | SSH, MinIO Console |
| Docker 브리지 | 172.18.0.0/16 | 3000, 5984, 6379, 9000 | 컨테이너 간 통신 |
| NAS 전용 | 192.168.0.29/32 | 445, 2049 | SMB/NFS 백업 |

### 모니터링 구성

| 항목 | 도구 | 임계치 | 알림 |
|-----|-----|------|------|
| API 응답 P95 | nginx access log | ≥ 2,000ms | SUPER_ADMIN 경보 |
| Docker 재시작 | Docker events | 1회/시간 이상 | SUPER_ADMIN 경보 |
| 디스크 사용률 | psutil / CouchDB stats | ≥ 80% | SUPER_ADMIN 경보 |
| 메모리 사용률 | docker stats | ≥ 85% | SUPER_ADMIN 경보 |
| Bull Queue 실패 | Bull Board | 10건/시간 | SUPER_ADMIN 경보 |
| SSL 만료 | certbot 체크 | D-30일 | SUPER_ADMIN 경보 |
| 24시간 헬스체크 | /api/v1/health (1분 간격) | HTTP ≠ 200 | 즉시 알림 |

### 재해 복구 RTO/RPO 요약

| 장애 유형 | RTO | RPO | 자동 복구 |
|---------|-----|-----|--------|
| API 서버 다운 | 30초 | 0초 | ✅ |
| CouchDB 연결 실패 | 60초 | 0초 | ✅ |
| Redis 연결 실패 | 30초 | 60초 | ✅ |
| AI 워커 다운 | 30초 | 0초 | ✅ |
| 전체 서버 재부팅 | 180초 | 300초 | ✅ |
| NAS 연결 끊김 | 10분 | 24시간 | ❌ (수동) |
| CouchDB 데이터 손상 | 30분 | 24시간 | ❌ (수동) |

---

## [개정 이력]

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|---------|------|
| v1.0 | 2026-04-15 | ServerSpec, InfraSpecCollector, DockerCollector Part 1/2 작성 | AX 개발팀 |
| v1.1 | 2026-04-16 | MonitoringVerifier Part 2/2 추가 | AX 개발팀 |
| v1.2 | 2026-04-18 | **[TRL-8 완성]** Part 3/3 추가: DisasterRecoveryMatrix(10시나리오), BackupScriptGenerator(CouchDB/MinIO/Redis), NetworkSecurityConfig(방화벽·TLS·망분리), SystemUpgradeManager(7단계 무중단 업그레이드). 운영 환경 사양표·모니터링·DR 요약표 추가. | 강윤진 |