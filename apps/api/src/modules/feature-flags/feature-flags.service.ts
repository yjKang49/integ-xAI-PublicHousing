// apps/api/src/modules/feature-flags/feature-flags.service.ts
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import { CouchService } from '../../database/couch.service'
import {
  FeatureFlag,
  FeatureFlagKey,
  DEFAULT_FEATURE_FLAGS,
} from '@ax/shared'

/** 플래그는 플랫폼 레벨 DB에 저장 */
const PLATFORM_ORG = '_platform'

/** Redis 캐시 TTL (초) */
const CACHE_TTL_SEC = 30

export class UpsertFeatureFlagDto {
  enabled?: boolean
  description?: string
  enabledForOrgIds?: string[]
  metadata?: Record<string, any>
}

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name)

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    // 비동기로 실행 — API 기동을 블록하지 않음
    this.seed().catch((err) =>
      this.logger.warn(`Feature flag seed failed: ${err.message}`),
    )
  }

  // ─── 공개 API ─────────────────────────────────────────────────────────────

  /**
   * 특정 플래그의 활성화 여부 확인.
   * orgId가 제공된 경우 enabledForOrgIds 목록도 확인.
   * Redis에 30초 캐시.
   */
  async isEnabled(key: string, orgId?: string): Promise<boolean> {
    const cacheKey = `ff:${key}`
    const cached = await this.redis.get(cacheKey)

    let flag: FeatureFlag | null = null

    if (cached) {
      flag = JSON.parse(cached) as FeatureFlag
    } else {
      flag = await this.fetchByKey(key)
      if (flag) {
        await this.redis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(flag))
      }
    }

    if (!flag) return false
    if (!flag.enabled) return false

    // enabledForOrgIds가 지정된 경우 orgId 포함 여부 검사
    if (
      flag.enabledForOrgIds &&
      flag.enabledForOrgIds.length > 0 &&
      orgId
    ) {
      return flag.enabledForOrgIds.includes(orgId)
    }

    return true
  }

  /**
   * 전체 플래그 목록 조회
   */
  async findAll(): Promise<FeatureFlag[]> {
    const { docs } = await this.couch.find<FeatureFlag>(
      PLATFORM_ORG,
      { docType: 'featureFlag' },
      { limit: 200, sort: [{ createdAt: 'asc' }] },
    )
    return docs
  }

  /**
   * 키로 단일 플래그 조회 (없으면 404)
   */
  async findByKey(key: string): Promise<FeatureFlag> {
    const flag = await this.fetchByKey(key)
    if (!flag) throw new NotFoundException(`Feature flag '${key}' 를 찾을 수 없습니다.`)
    return flag
  }

  /**
   * 플래그 생성 또는 업데이트 (upsert)
   * 캐시 무효화 포함
   */
  async upsert(key: string, dto: UpsertFeatureFlagDto, userId: string): Promise<FeatureFlag> {
    const now = new Date().toISOString()
    const existing = await this.fetchByKey(key)

    let saved: FeatureFlag

    if (existing) {
      // 업데이트
      const updated: FeatureFlag = {
        ...existing,
        ...(dto.enabled !== undefined   ? { enabled: dto.enabled }               : {}),
        ...(dto.description             ? { description: dto.description }        : {}),
        ...(dto.enabledForOrgIds        ? { enabledForOrgIds: dto.enabledForOrgIds } : {}),
        ...(dto.metadata                ? { metadata: dto.metadata }              : {}),
        updatedAt: now,
        updatedBy: userId,
      }
      saved = await this.couch.update(PLATFORM_ORG, updated) as FeatureFlag
    } else {
      // 신규 생성
      const docId = `featureFlag:${PLATFORM_ORG}:${key}`
      const newFlag: FeatureFlag = {
        _id: docId,
        docType: 'featureFlag',
        key,
        enabled: dto.enabled ?? false,
        description: dto.description ?? '',
        ...(dto.enabledForOrgIds ? { enabledForOrgIds: dto.enabledForOrgIds } : {}),
        ...(dto.metadata         ? { metadata: dto.metadata }                 : {}),
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
      }
      saved = await this.couch.create(PLATFORM_ORG, newFlag) as FeatureFlag
    }

    // Redis 캐시 무효화
    await this.redis.del(`ff:${key}`)
    this.logger.log(`Feature flag upserted: key=${key} enabled=${saved.enabled} by=${userId}`)
    return saved
  }

  /**
   * 기본 플래그 시드 — 존재하지 않는 플래그만 삽입
   */
  async seed(): Promise<void> {
    this.logger.log('Seeding default feature flags…')
    const now = new Date().toISOString()
    let created = 0

    for (const def of DEFAULT_FEATURE_FLAGS) {
      const existing = await this.fetchByKey(def.key)
      if (existing) continue

      const docId = `featureFlag:${PLATFORM_ORG}:${def.key}`
      const flag: FeatureFlag = {
        _id: docId,
        ...def,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'system',
      }

      try {
        await this.couch.create(PLATFORM_ORG, flag)
        created++
      } catch (err: any) {
        // 동시 실행 시 conflict 무시
        if (err?.statusCode !== 409) throw err
      }
    }

    this.logger.log(`Feature flags seed complete: ${created} created, ${DEFAULT_FEATURE_FLAGS.length - created} already exist`)
  }

  // ─── 내부 헬퍼 ────────────────────────────────────────────────────────────

  private async fetchByKey(key: string): Promise<FeatureFlag | null> {
    const docId = `featureFlag:${PLATFORM_ORG}:${key}`

    // 먼저 _id로 직접 조회
    const byId = await this.couch.findById<FeatureFlag>(PLATFORM_ORG, docId)
    if (byId && !(byId as any)._deleted) return byId

    // _id 패턴이 다를 수 있으므로 Mango로 폴백
    const { docs } = await this.couch.find<FeatureFlag>(
      PLATFORM_ORG,
      { docType: 'featureFlag', key },
      { limit: 1 },
    )
    return docs[0] ?? null
  }
}
