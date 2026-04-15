/**
 * Standalone users seed — CouchDB 사용자 5종 초기화
 *
 * 실행:
 *   yarn workspace @ax/api ts-node src/database/seeds/users.seed.ts
 *
 * 이미 같은 이메일이 있으면 건너뜁니다 (멱등).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import * as nano from 'nano';
import * as bcrypt from 'bcrypt';

const COUCHDB_URL      = process.env.COUCHDB_URL      ?? 'http://localhost:5984';
const COUCHDB_USER     = process.env.COUCHDB_USER     ?? 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD ?? 'secret';
const ENV              = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const PLATFORM_DB      = `ax__platform_${ENV}`;
const ORG_ID           = 'org_seed001';

const connection = nano({
  url: COUCHDB_URL,
  requestDefaults: {
    auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD },
  },
});

interface SeedUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  organizationId: string | null;
  phone?: string;
}

const USERS: SeedUser[] = [
  {
    id: 'user:_platform:usr_super01',
    email: 'super@ax-platform.kr',
    name: '슈퍼관리자',
    password: 'Super@1234',
    role: 'SUPER_ADMIN',
    organizationId: null,
  },
  {
    id: 'user:_platform:usr_admin01',
    email: 'admin@happy-housing.kr',
    name: '김관리',
    password: 'Admin@1234',
    role: 'ORG_ADMIN',
    organizationId: ORG_ID,
    phone: '010-1234-5678',
  },
  {
    id: 'user:_platform:usr_insp01',
    email: 'hong@happy-housing.kr',
    name: '홍길동',
    password: 'Inspector@1234',
    role: 'INSPECTOR',
    organizationId: ORG_ID,
    phone: '010-2345-6789',
  },
  {
    id: 'user:_platform:usr_insp02',
    email: 'lee@happy-housing.kr',
    name: '이현장',
    password: 'Inspector@1234',
    role: 'INSPECTOR',
    organizationId: ORG_ID,
    phone: '010-3456-7890',
  },
  {
    id: 'user:_platform:usr_rev01',
    email: 'choi@happy-housing.kr',
    name: '최기술',
    password: 'Reviewer@1234',
    role: 'REVIEWER',
    organizationId: ORG_ID,
    phone: '010-4567-8901',
  },
  {
    id: 'user:_platform:usr_cmgr01',
    email: 'park@happy-housing.kr',
    name: '박민원',
    password: 'Cmgr@1234',
    role: 'COMPLAINT_MGR',
    organizationId: ORG_ID,
    phone: '010-5678-9012',
  },
];

async function run() {
  // Ensure platform DB exists
  try {
    await connection.db.create(PLATFORM_DB);
    console.log(`Created DB: ${PLATFORM_DB}`);
  } catch (e: any) {
    if (e.statusCode !== 412) throw e; // 412 = already exists, ok
  }

  const db = connection.use(PLATFORM_DB);

  for (const u of USERS) {
    // Check if already exists by email
    let existing: any = null;
    try {
      existing = await (db as any).find({
        selector: { docType: 'user', email: u.email },
        limit: 1,
      });
    } catch {}

    if (existing?.docs?.length > 0) {
      console.log(`  SKIP  ${u.email} (already exists)`);
      continue;
    }

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(u.password, 12);

    const doc = {
      _id: u.id,
      docType: 'user',
      orgId: PLATFORM_DB,
      email: u.email,
      name: u.name,
      phone: u.phone ?? null,
      role: u.role,
      organizationId: u.organizationId,
      assignedComplexIds: [],
      passwordHash,
      refreshTokenHash: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'seed',
      updatedBy: 'seed',
      lastLoginAt: null,
    };

    try {
      await db.insert(doc as any);
      console.log(`  OK    ${u.email} (${u.role})`);
    } catch (e: any) {
      if (e.statusCode === 409) {
        console.log(`  SKIP  ${u.email} (conflict — already exists)`);
      } else {
        throw e;
      }
    }
  }

  // Ensure email index exists
  try {
    await (db as any).createIndex({
      index: { fields: ['docType', 'email'] },
      name: 'idx-user-email',
    });
  } catch {}

  console.log('\nDone. Users seed complete.');
  console.log(`\nLogin accounts:`);
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(14)} ${u.email}  /  ${u.password}`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
