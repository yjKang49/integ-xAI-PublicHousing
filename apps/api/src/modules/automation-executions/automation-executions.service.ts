// apps/api/src/modules/automation-executions/automation-executions.service.ts
// Phase 2-7: 자동화 실행 이력 조회 + Worker 결과 수신

import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { CouchService } from '../../database/couch.service';

const CACHE_TTL = 10;
import {
  AutomationExecution, AutomationExecutionStatus, UpdateExecutionResultInput,
} from '@ax/shared';
import nano from 'nano';

@Injectable()
export class AutomationExecutionsService {
  private readonly logger = new Logger(AutomationExecutionsService.name);
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /** 실행 이력 목록 조회 */
  async findAll(orgId: string, query: {
    ruleId?: string;
    status?: AutomationExecutionStatus;
    triggerType?: string;
    page?: string;
    limit?: string;
  }) {
    const cacheKey = `automation-execs:list:${orgId}:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150));
      const retry = await this.redis.get(cacheKey);
      if (retry) return JSON.parse(retry);
    }
    this.computingKeys.add(cacheKey);
    const fresh = await this.redis.get(cacheKey);
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh); }
    try {
      const selector: nano.MangoSelector = { docType: 'automationExecution', orgId };
      if (query.ruleId) selector.ruleId = query.ruleId;
      if (query.status) selector.status = query.status;
      if (query.triggerType) selector.triggerType = query.triggerType;
      const page = query.page ? +query.page : 1;
      const limit = Math.min(query.limit ? +query.limit : 30, 100);
      const { docs } = await this.couch.find<AutomationExecution>(orgId, selector, {
        limit: limit + 1, skip: (page - 1) * limit, sort: [{ startedAt: 'desc' as const }],
      });
      const hasNext = docs.length > limit;
      const result = { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } finally { this.computingKeys.delete(cacheKey); }
  }

  /** 실행 이력 단건 조회 */
  async findById(orgId: string, id: string): Promise<AutomationExecution> {
    const doc = await this.couch.findById<AutomationExecution>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`AutomationExecution ${id} not found`);
    if (doc.orgId !== orgId) throw new ForbiddenException();
    return doc;
  }

  /** Job Worker → API 결과 콜백 수신 */
  async receiveWorkerResult(
    orgId: string,
    id: string,
    patch: UpdateExecutionResultInput,
  ): Promise<AutomationExecution> {
    const exec = await this.findById(orgId, id);
    const now = new Date().toISOString();

    const updated = {
      ...exec,
      status: patch.status,
      completedAt: now,
      actionsExecuted: patch.actionsExecuted ?? exec.actionsExecuted,
      error: patch.error,
      summary: patch.summary,
      updatedAt: now,
      updatedBy: 'system',
    };

    const saved = await this.couch.update(orgId, updated);
    this.logger.log(`실행 이력 업데이트: ${id} → ${patch.status}`);
    return saved as AutomationExecution;
  }

  /** 특정 룰의 최근 N건 이력 조회 */
  async findByRule(orgId: string, ruleId: string, limit = 10) {
    const { docs } = await this.couch.find<AutomationExecution>(orgId, {
      docType: 'automationExecution', orgId, ruleId,
    }, {
      limit,
      sort: [{ startedAt: 'desc' as const }],
    });
    return docs;
  }

  /** 전체 실행 통계 요약 */
  async getSummary(orgId: string) {
    const cacheKey = `automation-execs:summary:${orgId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150));
      const retry = await this.redis.get(cacheKey);
      if (retry) return JSON.parse(retry);
    }
    this.computingKeys.add(cacheKey);
    const fresh = await this.redis.get(cacheKey);
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh); }
    let result: any;
    try {
    const { docs } = await this.couch.find<AutomationExecution>(orgId, {
      docType: 'automationExecution', orgId,
    }, { limit: 1000, fields: ['status', 'triggerType', 'durationMs', 'startedAt'] });

    const total = docs.length;
    const completed = docs.filter(d => d.status === AutomationExecutionStatus.COMPLETED).length;
    const failed = docs.filter(d => d.status === AutomationExecutionStatus.FAILED).length;
    const durations = docs.map(d => d.durationMs ?? 0).filter(v => v > 0);
    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const byTriggerType = docs.reduce((acc, d) => {
      acc[d.triggerType] = (acc[d.triggerType] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    result = {
      total,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDurationMs,
      byTriggerType,
    };
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
    } finally { this.computingKeys.delete(cacheKey); }
  }
}
