# 테스트 전략

## 피라미드 구조

```
          ▲
         /E2E\          5%  — Supertest, 핵심 흐름 only
        /─────\
       / Integ \        20% — DB 연동, Bull Queue
      /─────────\
     /  Unit     \      75% — Service, Pipe, Guard, Util
    /─────────────\
```

## Layer별 전략

### 1. Unit Tests (`*.spec.ts`)

**대상:** Service, Guard, Interceptor, Pipe, Utility

**원칙:**
- CouchDB, Redis, S3 — 모두 mock (`jest.fn()`)
- 비즈니스 로직 집중: 상태 전환 검증, 사이드이펙트 확인
- 100% 경계값 커버: null, undefined, 빈 배열, 최대값

**실행:**
```bash
yarn workspace @ax/api test --coverage
# 커버리지 목표: Statements 80%+, Branches 75%+
```

**샘플 패턴:**
```typescript
// 1. Arrange
couch.findById.mockResolvedValue(makeEntity({ status: 'ACTIVE' }));
// 2. Act
const result = await service.doSomething(...);
// 3. Assert
expect(couch.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'DONE' }));
```

---

### 2. Integration Tests (`*.integration-spec.ts`)

**대상:** CouchService, MediaService(S3), Auth flow

**환경:** `docker-compose up couchdb redis minio`

**패턴:**
```typescript
// apps/api/src/database/couch.service.integration-spec.ts
describe('CouchService (integration)', () => {
  let service: CouchService;
  const testOrgId = `test_${Date.now()}`;

  afterAll(async () => {
    // Cleanup test database
    await service['client'].db.destroy(`ax_${testOrgId}_dev`);
  });

  it('should create and retrieve document', async () => {
    const doc = { _id: `defect:${testOrgId}:001`, docType: 'defect', orgId: testOrgId, ... };
    await service.create(testOrgId, doc);
    const retrieved = await service.findById(testOrgId, doc._id);
    expect(retrieved).toMatchObject(doc);
  });
});
```

---

### 3. E2E Tests (`test/*.e2e-spec.ts`)

**대상:** 핵심 API 흐름 (결함 CRUD, 민원 워크플로우, 인증)

**환경:** 전체 docker-compose stack

**커버 시나리오:**
1. 로그인 → 토큰 발급 → API 호출 → 토큰 갱신
2. 결함 등록 → CRITICAL 경보 자동 생성 확인
3. 민원 상태 전환 전체 플로우 (RECEIVED → CLOSED)
4. S3 presigned URL 발급 → 업로드 완료 처리
5. Dashboard 캐싱 (첫 요청 DB, 두 번째 요청 Redis)

**실행:**
```bash
yarn workspace @ax/api test:e2e
```

---

### 4. Angular 컴포넌트 테스트

**대상:** 핵심 컴포넌트 (Dashboard, ComplaintDetail, Viewer3D)

**도구:** Jasmine + Angular Testing Utilities

```typescript
// complaint-detail.component.spec.ts
describe('ComplaintDetailComponent', () => {
  let component: ComplaintDetailComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => TestBed.configureTestingModule({
    imports: [ComplaintDetailComponent, HttpClientTestingModule],
    providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: ... } } }
    ]
  }).compileComponents());

  it('should show RESOLVED actions when status is IN_PROGRESS', () => {
    component.complaint.set(makeComplaint({ status: ComplaintStatus.IN_PROGRESS }));
    fixture.detectChanges();
    expect(compiled.querySelector('.resolve-section')).toBeTruthy();
  });

  it('should NOT show actions when status is CLOSED', () => {
    component.complaint.set(makeComplaint({ status: ComplaintStatus.CLOSED }));
    fixture.detectChanges();
    expect(compiled.querySelector('.action-card')).toBeNull();
  });
});
```

---

### 5. PouchDB Sync 테스트 (Mobile)

**도구:** pouchdb-adapter-memory (in-memory DB)

```typescript
// pouch.service.spec.ts
import PouchDB from 'pouchdb-browser';
import PouchDBMemory from 'pouchdb-adapter-memory';

PouchDB.plugin(PouchDBMemory);

describe('PouchService offline behavior', () => {
  it('should mark document as PENDING after offline create', async () => {
    const doc = await pouchService.create({ _id: 'test_001', docType: 'defect', ... });
    expect(doc.syncStatus).toBe('PENDING');
  });

  it('should increment pendingCount in syncState', async () => {
    await pouchService.create({ _id: 'test_002', ... });
    const state = await firstValueFrom(pouchService.syncState);
    expect(state.pendingCount).toBeGreaterThan(0);
  });
});
```

---

## CI/CD 파이프라인

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-api:
    runs-on: ubuntu-latest
    services:
      couchdb:
        image: couchdb:3.3
        env: { COUCHDB_USER: admin, COUCHDB_PASSWORD: secret }
        ports: ['5984:5984']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: yarn install --frozen-lockfile
      - run: yarn build:shared
      - run: yarn workspace @ax/api test --coverage
      - run: yarn workspace @ax/api test:e2e
      - uses: codecov/codecov-action@v4

  test-admin-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --frozen-lockfile
      - run: yarn build:shared
      - run: yarn workspace @ax/admin-web test --browsers=ChromeHeadless --watch=false

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --frozen-lockfile
      - run: yarn lint
```

---

## 품질 게이트

| 항목 | 기준 |
|------|------|
| Unit test 커버리지 | ≥ 80% (Statements) |
| E2E 통과율 | 100% |
| TypeScript strict | no errors |
| ESLint | no errors |
| API 응답시간 | P95 < 200ms |
| 동시 접속 | 100 users, P99 < 500ms |
