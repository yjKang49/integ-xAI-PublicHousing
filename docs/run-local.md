# 로컬 개발 환경 실행 가이드

## 사전 요구사항

| 도구 | 버전 | 확인 |
|------|------|------|
| Docker Desktop | 24+ | `docker --version` |
| Node.js | 20 LTS | `node --version` |
| Yarn | 1.22+ | `yarn --version` |

---

## 빠른 시작 (최초 1회)

```bash
# 저장소 클론 후
bash scripts/dev/bootstrap.sh
```

bootstrap.sh가 아래 모든 단계를 자동으로 수행합니다.

---

## 수동 설정 (단계별)

### 1. 환경변수 설정

```bash
cp apps/api/.env.example apps/api/.env
```

기본값으로 로컬 실행 가능합니다.  
운영 배포 시 `JWT_SECRET`, `JWT_REFRESH_SECRET` 등 반드시 교체하세요.

---

### 2. 의존성 설치

```bash
yarn install
yarn build:shared          # @ax/shared dist/ 생성 (다른 앱보다 먼저)
```

---

### 3. 인프라 기동 (Docker)

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 서비스 접속 정보

| 서비스 | URL | 계정 |
|--------|-----|------|
| CouchDB | http://localhost:5984/_utils | admin / secret |
| Redis | localhost:6379 | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |

---

### 4. 데이터베이스 초기화

```bash
# 메인 seed (사용자, 단지, 건물, 결함, 민원, 균열 등 전체)
yarn workspace @ax/api ts-node src/database/seed.ts

# 데모 시나리오 추가 데이터 (데모 시연 시에만 필요)
yarn workspace @ax/api ts-node src/database/seeds/demo.seed.ts
```

또는 한 번에 초기화 + seed:

```bash
bash scripts/dev/reset-and-seed.sh --demo
```

### 생성되는 로그인 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| SUPER_ADMIN | super@ax-platform.kr | Super@1234 |
| ORG_ADMIN | admin@happy-housing.kr | Admin@1234 |
| INSPECTOR | hong@happy-housing.kr | Inspector@1234 |
| INSPECTOR | lee@happy-housing.kr | Inspector@1234 |
| REVIEWER | choi@happy-housing.kr | Reviewer@1234 |
| COMPLAINT_MGR | park@happy-housing.kr | Cmgr@1234 |

---

### 5. 앱 실행

**한 번에 실행:**
```bash
bash scripts/dev/run-all.sh
# 모바일 포함:
bash scripts/dev/run-all.sh --with-mobile
```

**개별 실행 (터미널 3개):**

```bash
# 터미널 1 — API (NestJS)
yarn dev:api
# → http://localhost:3000/api/v1
# → Health: http://localhost:3000/api/v1/health
# → Swagger: http://localhost:3000/api/docs

# 터미널 2 — Admin Web (Angular)
yarn dev:admin
# → http://localhost:4200

# 터미널 3 — Mobile App (Ionic, 선택)
yarn dev:mobile
# → http://localhost:8100
```

---

## 테스트 실행

```bash
# 유닛 테스트
yarn workspace @ax/api test

# E2E 테스트 (인프라 기동 + seed 필수)
yarn workspace @ax/api test:e2e

# 특정 E2E 테스트만 실행
yarn workspace @ax/api test:e2e --testPathPattern=auth
yarn workspace @ax/api test:e2e --testPathPattern=inspection-flow
yarn workspace @ax/api test:e2e --testPathPattern=complaint-flow
```

---

## 데이터 초기화

```bash
# 데이터만 초기화 후 재투입 (컨테이너 유지)
bash scripts/dev/reset-and-seed.sh

# 데모 시나리오 데이터 포함
bash scripts/dev/reset-and-seed.sh --demo

# 볼륨 포함 완전 초기화 (모든 데이터 삭제)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
# 이후 seed 재실행
```

---

## 프로덕션 빌드 테스트

```bash
docker compose up -d --build
```

API(`localhost:3000`), Admin Web(`localhost:4200`) 컨테이너로 실행됩니다.  
Mobile App은 별도 Capacitor 빌드 필요합니다.

---

## 디렉토리 구조

```
xAI-PublicHousing/
├── apps/
│   ├── api/              NestJS 백엔드 (port 3000)
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── seed.ts          메인 시드
│   │   │   │   ├── seeds/           시나리오별 시드
│   │   │   │   └── indexes/         CouchDB Mango 인덱스
│   │   │   ├── modules/             도메인 모듈
│   │   │   └── templates/           Handlebars 보고서 템플릿
│   │   └── test/
│   │       ├── e2e/                 E2E 테스트
│   │       └── jest-e2e.json
│   ├── admin-web/        Angular 18 관리자 웹 (port 4200)
│   └── mobile-app/       Ionic 8 모바일 앱 (port 8100)
├── packages/
│   └── shared/           공유 타입 (엔티티, 열거형, API 타입)
├── scripts/
│   └── dev/              개발 유틸리티 스크립트
├── docs/                 개발 문서
│   ├── demo-scenario.md
│   ├── kpi-definition.md
│   ├── phase1-mvp-checklist.md
│   └── known-issues.md
├── docker-compose.yml    프로덕션 전체 스택
└── docker-compose.dev.yml  개발용 인프라 only
```

---

## 자주 발생하는 문제

### `Cannot find module '@ax/shared'`
```bash
yarn build:shared
```

### CouchDB 인덱스 오류 (`No index exists for this sort`)
API 서버가 시작 직후 인덱스를 자동 생성합니다.  
서버 완전 기동 후 30초 대기 또는 워밍업 요청 1회 실행 후 재시도하세요.

### `ECONNREFUSED` — API 미응답
```bash
curl http://localhost:3000/api/v1/health
```
응답 없으면 API 서버 실행 확인: `yarn dev:api`

### 보고서 생성 실패 — 템플릿 없음
`known-issues.md` KI-001 참조.

### E2E 테스트 — 429 Too Many Requests
`known-issues.md` KI-006 참조.

### Windows 환경에서 bash 스크립트 실행
Git Bash 또는 WSL 2 터미널에서 실행하세요:
```bash
# Git Bash
bash scripts/dev/bootstrap.sh

# WSL 2
wsl bash scripts/dev/bootstrap.sh
```
