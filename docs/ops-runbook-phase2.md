# Phase 2 운영자 매뉴얼 (Runbook)

> **대상:** 시스템 관리자, 운영 담당자  
> **플랫폼:** AX 공공임대주택 관리 플랫폼 Phase 2  
> **최종 수정:** 2026-04-14

---

## 1. 시스템 구성 개요

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐
│ Admin Web   │    │  API Server  │    │   CouchDB     │
│ :4200       │───▶│  :3000       │───▶│  :5984        │
└─────────────┘    └──────┬───────┘    └───────────────┘
                          │
                    ┌─────┴──────┐
                    │   Redis    │
                    │   :6379    │
                    └─────┬──────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       ┌──────────────┐      ┌───────────────┐
       │  AI Worker   │      │  Job Worker   │
       │  (ai-queue)  │      │  (job-queue)  │
       └──────────────┘      └───────────────┘
                    │
              ┌─────┴─────┐
              │  MinIO    │
              │ :9000     │
              └───────────┘
```

---

## 2. 서비스 기동 및 종료

### 2.1 전체 기동 (개발/파일럿)

```bash
# 1. 인프라 기동 (CouchDB, Redis, MinIO)
yarn docker:up

# 2. 시드 데이터 로드 (최초 1회)
yarn seed:demo

# 3. API 서버 기동
yarn dev:api

# 4. Admin Web 기동
yarn dev:admin

# 5. 워커 기동 (별도 터미널)
yarn dev:workers
```

### 2.2 서비스 종료

```bash
# 인프라 종료
yarn docker:down

# 프로세스 종료: Ctrl+C (각 터미널)
```

### 2.3 컨테이너 상태 확인

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

---

## 3. 상태 점검 (Health Check)

### 3.1 API 서버 상태

```bash
curl http://localhost:3000/api/v1/health
# 기대 응답: {"status":"ok","timestamp":"..."}
```

### 3.2 CouchDB 상태

```bash
curl http://admin:password@localhost:5984/_up
# 기대 응답: {"status":"ok"}

# 전체 데이터베이스 목록
curl http://admin:password@localhost:5984/_all_dbs
```

### 3.3 Redis 상태

```bash
docker exec xai-publichousing-redis-1 redis-cli ping
# 기대 응답: PONG
```

### 3.4 Job Queue 상태 확인

Admin Web > 작업 큐 모니터 또는:

```bash
curl http://localhost:3000/api/v1/jobs?status=RUNNING \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 4. Feature Flag 관리

### 4.1 현재 플래그 상태 확인

```bash
curl http://localhost:3000/api/v1/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4.2 플래그 활성화/비활성화

```bash
# 활성화
curl -X PATCH http://localhost:3000/api/v1/feature-flags/PHASE2_AI \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 비활성화 (긴급 차단)
curl -X PATCH http://localhost:3000/api/v1/feature-flags/PHASE2_AI \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'
```

### 4.3 긴급 시 AI 전체 차단

```bash
for FLAG in PHASE2_AI AI_DEFECT_DETECTION AI_CRACK_ANALYSIS AI_DIAGNOSIS_OPINION AI_COMPLAINT_TRIAGE; do
  curl -s -X PATCH "http://localhost:3000/api/v1/feature-flags/$FLAG" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"enabled": false}'
  echo "$FLAG 비활성화 완료"
done
```

---

## 5. 잡 큐 운영

### 5.1 FAILED 잡 재처리

```bash
# 실패한 잡 목록
curl "http://localhost:3000/api/v1/jobs?status=FAILED&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 잡 재시작 (Admin Web > 작업 큐 > 재시도 버튼)
curl -X POST "http://localhost:3000/api/v1/jobs/{jobId}/retry" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 5.2 잡 큐 정체 해소

```bash
# Redis 큐 길이 확인
docker exec xai-publichousing-redis-1 redis-cli LLEN bull:ai-queue:wait
docker exec xai-publichousing-redis-1 redis-cli LLEN bull:job-queue:wait

# 워커 재시작
yarn dev:workers
```

### 5.3 잡 체류 시간 기준

| 큐 | 정상 처리 시간 | 경고 기준 |
|----|---------------|-----------|
| ai-queue (결함 탐지) | ≤ 30초 | > 2분 |
| ai-queue (LLM 의견/분류) | ≤ 15초 | > 1분 |
| job-queue (보고서 생성) | ≤ 60초 | > 5분 |
| job-queue (알림 발송) | ≤ 5초 | > 30초 |

---

## 6. 데이터베이스 운영

### 6.1 CouchDB 백업

```bash
# 데이터베이스 목록
curl -s http://admin:password@localhost:5984/_all_dbs | jq '.[]'

# 단일 DB 백업 (org_demo001 예시)
curl -s "http://admin:password@localhost:5984/org_demo001/_all_docs?include_docs=true" \
  > backup_$(date +%Y%m%d).json
```

### 6.2 인덱스 재생성

```bash
# API 기동 시 자동 생성. 강제 재실행:
curl -X POST http://localhost:3000/api/v1/admin/init-indexes \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 6.3 데이터 정합성 확인

```bash
# 매달 실행 권장 — orphan document 확인
curl "http://localhost:3000/api/v1/admin/health/data-integrity" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 7. 로그 수집 및 모니터링

### 7.1 API 서버 로그

```bash
# Docker 환경
docker logs xai-publichousing-api-1 --tail 100 -f

# 로컬 실행 시 — NestJS 로그가 터미널에 직접 출력됨
```

### 7.2 에러 로그 필터

```bash
docker logs xai-publichousing-api-1 2>&1 | grep -E "ERROR|WARN" | tail -50
```

### 7.3 AI Worker 로그

```bash
docker logs xai-publichousing-ai-worker-1 --tail 100 -f
```

---

## 8. 자주 발생하는 문제 및 해결

### 문제 1: API 포트 3000 사용 중

```bash
# 점유 프로세스 확인
netstat -ano | findstr :3000

# Docker api 컨테이너가 점유한 경우
docker stop xai-publichousing-api-1

# 로컬에서 API 재기동
yarn dev:api
```

### 문제 2: AI 잡이 RUNNING에서 멈춤

```bash
# 1. AI Worker 상태 확인
docker logs xai-publichousing-ai-worker-1 --tail 50

# 2. Redis 연결 확인
docker exec xai-publichousing-redis-1 redis-cli ping

# 3. Worker 재시작
# Ctrl+C 후 yarn dev:workers
```

### 문제 3: @ax/shared 타입 오류

```bash
# Shared 패키지 재빌드
yarn build:shared

# API 감시 모드 재시작 (파일 변경 감지)
yarn dev:api
```

### 문제 4: CouchDB 인증 실패

```bash
# 환경변수 확인
cat apps/api/.env | grep COUCH

# CouchDB 접속 테스트
curl -u admin:password http://localhost:5984/
```

### 문제 5: MinIO 파일 업로드 실패

```bash
# MinIO 상태 확인
docker logs xai-publichousing-minio-1 --tail 20

# 버킷 존재 확인
curl http://localhost:9000/ax-media-bucket/
```

---

## 9. 정기 운영 체크리스트

### 일간

- [ ] API 헬스체크 정상 응답
- [ ] FAILED 잡 건수 확인 (임계치: 일 10건 이상 시 조사)
- [ ] ACTIVE 경보 건수 확인

### 주간

- [ ] Job Queue 평균 처리 시간 확인
- [ ] Feature Flag 설정 이력 검토
- [ ] AI 거부율 확인 (기준: ≤ 30%)

### 월간

- [ ] CouchDB 백업 실행 및 검증
- [ ] AI 모델 성능 지표 측정
- [ ] 사용자 계정 및 권한 점검
- [ ] 보안 패치 적용 여부 확인
