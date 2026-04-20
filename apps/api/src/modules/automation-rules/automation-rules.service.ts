// apps/api/src/modules/automation-rules/automation-rules.service.ts
// Phase 2-7: RPA/업무 자동화 엔진 — 룰 CRUD + 룰 엔진 핵심 로직

import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, Logger, BadRequestException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';

const CACHE_TTL = 10;
import {
  AutomationRule, AutomationAction, AutomationExecution, AutomationActionResult,
  CreateAutomationRuleInput, UpdateAutomationRuleInput,
  AutomationTriggerType, AutomationActionType, AutomationExecutionStatus,
  AutomationRuleCategory, NotificationChannel, AlertType, SeverityLevel,
  JobType,
} from '@ax/shared';
import nano from 'nano';

const QUEUE_JOB = 'job-queue';

// ── 내부 헬퍼 타입 ────────────────────────────────────────────────────────

interface TriggerContext {
  triggerType: AutomationTriggerType;
  [key: string]: unknown;
}

@Injectable()
export class AutomationRulesService {
  private readonly logger = new Logger(AutomationRulesService.name);
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    @InjectQueue(QUEUE_JOB) private readonly jobQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  // =========================================================
  // CRUD
  // =========================================================

  async create(orgId: string, dto: CreateAutomationRuleInput, userId: string): Promise<AutomationRule> {
    // ruleKey 중복 체크
    const { docs: existing } = await this.couch.find<AutomationRule>(orgId, {
      docType: 'automationRule', orgId, ruleKey: dto.ruleKey,
    }, { limit: 1, fields: ['_id'] });

    if (existing.length > 0) {
      throw new ConflictException(`ruleKey '${dto.ruleKey}'는 이미 존재합니다.`);
    }

    const now = new Date().toISOString();
    const id = `automationRule:${orgId}:rule_${Date.now()}_${uuid().slice(0, 8)}`;

    const rule: AutomationRule = {
      _id: id,
      docType: 'automationRule',
      orgId,
      name: dto.name,
      description: dto.description,
      ruleKey: dto.ruleKey,
      category: dto.category ?? AutomationRuleCategory.MAINTENANCE,
      isActive: dto.isActive ?? true,
      trigger: dto.trigger,
      conditions: dto.conditions ?? [],
      actions: dto.actions,
      targetComplexId: dto.targetComplexId,
      priority: dto.priority ?? 100,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, rule);
    this.logger.log(`자동화 룰 생성: ${rule.ruleKey} (orgId=${orgId})`);
    return saved;
  }

  async findAll(orgId: string, query: {
    isActive?: string;
    category?: AutomationRuleCategory;
    page?: string;
    limit?: string;
  }) {
    const cacheKey = `automation-rules:list:${orgId}:${JSON.stringify(query)}`;
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
      const selector: nano.MangoSelector = { docType: 'automationRule', orgId };
      if (query.isActive !== undefined) selector.isActive = query.isActive === 'true';
      if (query.category) selector.category = query.category;
      const page = query.page ? +query.page : 1;
      const limit = Math.min(query.limit ? +query.limit : 20, 100);
      const { docs } = await this.couch.find<AutomationRule>(orgId, selector, {
        limit: limit + 1, skip: (page - 1) * limit,
        sort: [{ priority: 'asc' as const }, { createdAt: 'asc' as const }],
      });
      const hasNext = docs.length > limit;
      const result = { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    } finally { this.computingKeys.delete(cacheKey); }
  }

  async findById(orgId: string, id: string): Promise<AutomationRule> {
    const doc = await this.couch.findById<AutomationRule>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`AutomationRule ${id} not found`);
    if (doc.orgId !== orgId) throw new ForbiddenException();
    return doc;
  }

  async update(orgId: string, id: string, dto: UpdateAutomationRuleInput, userId: string): Promise<AutomationRule> {
    const rule = await this.findById(orgId, id);
    const now = new Date().toISOString();

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.trigger !== undefined) rule.trigger = dto.trigger;
    if (dto.conditions !== undefined) rule.conditions = dto.conditions;
    if (dto.actions !== undefined) rule.actions = dto.actions;
    if (dto.targetComplexId !== undefined) rule.targetComplexId = dto.targetComplexId;
    if (dto.priority !== undefined) rule.priority = dto.priority;

    rule.updatedAt = now;
    rule.updatedBy = userId;
    return this.couch.update(orgId, rule);
  }

  async toggle(orgId: string, id: string, isActive: boolean, userId: string): Promise<AutomationRule> {
    return this.update(orgId, id, { isActive }, userId);
  }

  async remove(orgId: string, id: string, userId: string): Promise<void> {
    const rule = await this.findById(orgId, id);
    await this.couch.update(orgId, {
      ...rule,
      _deleted: true,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    } as any);
  }

  // =========================================================
  // 룰 엔진 — 수동 트리거
  // =========================================================

  async triggerManual(orgId: string, id: string, userId: string): Promise<AutomationExecution> {
    const rule = await this.findById(orgId, id);
    if (!rule.isActive) throw new BadRequestException('비활성화된 룰은 실행할 수 없습니다.');

    this.logger.log(`수동 트리거: ${rule.ruleKey} by ${userId}`);
    return this.executeRule(orgId, rule, {
      triggerType: AutomationTriggerType.MANUAL,
      triggeredBy: userId,
      triggeredAt: new Date().toISOString(),
    }, []);
  }

  // =========================================================
  // 룰 엔진 — 날짜 기반 스캔
  // =========================================================

  async scanDateBasedRules(orgId: string): Promise<{ scanned: number; triggered: number }> {
    const { docs: allRules } = await this.couch.find<AutomationRule>(orgId, {
      docType: 'automationRule', orgId, isActive: true,
    }, { limit: 200 });

    const dateBased = allRules.filter(r =>
      r.trigger.type === AutomationTriggerType.DATE_BASED ||
      r.trigger.type === AutomationTriggerType.MANUAL,
    );

    let triggered = 0;
    for (const rule of dateBased) {
      if (this.shouldFireDateBasedRule(rule)) {
        void this.executeRule(orgId, rule, {
          triggerType: AutomationTriggerType.DATE_BASED,
          scannedAt: new Date().toISOString(),
        }, []);
        triggered++;
      }
    }

    this.logger.log(`날짜 기반 스캔 완료 — orgId=${orgId}, scanned=${dateBased.length}, triggered=${triggered}`);
    return { scanned: dateBased.length, triggered };
  }

  private shouldFireDateBasedRule(rule: AutomationRule): boolean {
    const now = Date.now();
    const lastTriggered = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
    const interval = this.parseCronInterval(rule.trigger.cronExpression);
    return (now - lastTriggered) >= interval;
  }

  /** cron 표현식에서 대략적인 실행 주기(ms)를 추출 */
  private parseCronInterval(cron?: string): number {
    const DAY = 24 * 60 * 60 * 1000;
    if (!cron) return DAY;
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return DAY;
    const [, , dom, , dow] = parts;
    if (dom !== '*' && dow === '*') return 30 * DAY;   // '0 9 1 * *' = 월별
    if (dom === '*' && dow !== '*') return 7 * DAY;    // '0 9 * * 1' = 주별
    return DAY;                                         // '0 9 * * *' = 일별
  }

  // =========================================================
  // 룰 엔진 — 상태 변경 훅 (ComplaintsService 등에서 호출)
  // =========================================================

  /**
   * 상태 변경 이벤트 발생 시 매칭 룰을 찾아 실행
   * fire-and-forget: 호출자는 결과를 기다리지 않음
   */
  async checkStatusChangeTriggers(
    orgId: string,
    watchDocType: string,
    docId: string,
    doc: Record<string, unknown>,
    fromStatus: string | null,
    toStatus: string,
  ): Promise<void> {
    try {
      const { docs: allRules } = await this.couch.find<AutomationRule>(orgId, {
        docType: 'automationRule', orgId, isActive: true,
      }, { limit: 200 });

      const matching = allRules.filter(r =>
        r.trigger.type === AutomationTriggerType.STATUS_CHANGE &&
        r.trigger.watchDocType === watchDocType &&
        r.trigger.toStatus === toStatus &&
        (r.trigger.fromStatus == null || r.trigger.fromStatus === fromStatus),
      );

      for (const rule of matching) {
        void this.executeRule(orgId, rule, {
          triggerType: AutomationTriggerType.STATUS_CHANGE,
          watchDocType,
          docId,
          fromStatus,
          toStatus,
          docSnapshot: { title: doc['title'], complexId: doc['complexId'] },
        }, [docId]);
      }
    } catch (e: unknown) {
      this.logger.error(`상태 변경 트리거 평가 오류: ${(e as Error).message}`);
    }
  }

  // =========================================================
  // 룰 실행 (핵심)
  // =========================================================

  async executeRule(
    orgId: string,
    rule: AutomationRule,
    triggerContext: TriggerContext,
    affectedDocIds: string[],
  ): Promise<AutomationExecution> {
    const now = new Date().toISOString();
    const startMs = Date.now();

    // 1. 실행 기록 생성 (RUNNING)
    const execId = `automationExecution:${orgId}:exec_${Date.now()}_${uuid().slice(0, 8)}`;
    const execution: AutomationExecution = {
      _id: execId,
      docType: 'automationExecution',
      orgId,
      ruleId: rule._id,
      ruleName: rule.name,
      ruleKey: rule.ruleKey,
      triggerType: triggerContext.triggerType,
      triggerContext: triggerContext as Record<string, unknown>,
      status: AutomationExecutionStatus.RUNNING,
      startedAt: now,
      actionsExecuted: [],
      affectedDocIds,
      affectedCount: affectedDocIds.length,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };

    let savedExec = await this.couch.create(orgId, execution);

    // 2. 액션 순차 실행
    const actionResults: AutomationActionResult[] = [];
    let overallSuccess = true;

    for (const action of rule.actions) {
      const actionStart = Date.now();
      try {
        const result = await this.executeAction(orgId, rule, action, triggerContext, affectedDocIds);
        actionResults.push({
          type: action.type,
          status: 'SUCCESS',
          result,
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - actionStart,
        });
      } catch (e: unknown) {
        overallSuccess = false;
        this.logger.error(`액션 실행 실패 [${action.type}] 룰=${rule.ruleKey}: ${(e as Error).message}`);
        actionResults.push({
          type: action.type,
          status: 'FAILED',
          error: (e as Error).message,
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - actionStart,
        });
      }
    }

    // 3. 실행 기록 완료 처리
    const completedAt = new Date().toISOString();
    const successCount = actionResults.filter(a => a.status === 'SUCCESS').length;
    const finalStatus = overallSuccess
      ? AutomationExecutionStatus.COMPLETED
      : AutomationExecutionStatus.FAILED;

    const finalExec = await this.couch.update(orgId, {
      ...savedExec,
      status: finalStatus,
      completedAt,
      durationMs: Date.now() - startMs,
      actionsExecuted: actionResults,
      affectedCount: affectedDocIds.length,
      summary: `${successCount}/${rule.actions.length} 액션 성공`,
      updatedAt: completedAt,
    });

    // 4. 룰 통계 업데이트 (race-condition 허용 — 통계이므로 무방)
    const latestRule = await this.couch.findById<AutomationRule>(orgId, rule._id);
    if (latestRule) {
      await this.couch.update(orgId, {
        ...latestRule,
        executionCount: (latestRule.executionCount ?? 0) + 1,
        successCount: overallSuccess
          ? (latestRule.successCount ?? 0) + 1
          : (latestRule.successCount ?? 0),
        failureCount: overallSuccess
          ? (latestRule.failureCount ?? 0)
          : (latestRule.failureCount ?? 0) + 1,
        lastTriggeredAt: now,
        lastSuccessAt: overallSuccess ? completedAt : latestRule.lastSuccessAt,
        lastFailedAt: overallSuccess ? latestRule.lastFailedAt : completedAt,
        updatedAt: completedAt,
        updatedBy: 'system',
      });
    }

    this.logger.log(
      `룰 실행 완료: ${rule.ruleKey} → ${finalStatus} (${Date.now() - startMs}ms)`,
    );

    return finalExec as AutomationExecution;
  }

  // =========================================================
  // 액션 실행기
  // =========================================================

  private async executeAction(
    orgId: string,
    rule: AutomationRule,
    action: AutomationAction,
    context: TriggerContext,
    affectedDocIds: string[],
  ): Promise<unknown> {
    switch (action.type) {
      case AutomationActionType.SEND_NOTIFICATION:
        return this.actionSendNotification(orgId, rule, action as any, context, affectedDocIds);
      case AutomationActionType.CREATE_ALERT:
        return this.actionCreateAlert(orgId, rule, action as any, context, affectedDocIds);
      case AutomationActionType.CREATE_SCHEDULE:
        return this.actionCreateSchedule(orgId, rule, action as any, context);
      default:
        this.logger.warn(`미구현 액션 타입: ${action.type} — 건너뜀`);
        return { skipped: true, reason: `액션 타입 '${action.type}' 미구현` };
    }
  }

  /** 알림 발송 액션: IN_APP은 즉시 문서 생성, EMAIL/SMS는 job-queue 위임 */
  private async actionSendNotification(
    orgId: string,
    rule: AutomationRule,
    action: {
      channel?: NotificationChannel;
      titleTemplate?: string;
      bodyTemplate?: string;
      recipientField?: string;
      recipientStatic?: string;
    },
    context: TriggerContext,
    affectedDocIds: string[],
  ): Promise<unknown> {
    const channel = action.channel ?? NotificationChannel.IN_APP;
    const title = this.renderTemplate(action.titleTemplate ?? rule.name, context);
    const body = this.renderTemplate(
      action.bodyTemplate ?? `자동화 룰 '${rule.name}'이 실행되었습니다.`,
      context,
    );
    const recipient = action.recipientStatic ?? (context['docSnapshot'] as any)?.assignedTo ?? 'system';

    if (channel === NotificationChannel.IN_APP) {
      // IN_APP: CouchDB에 notification 문서 생성
      const now = new Date().toISOString();
      const notif = {
        _id: `notification:${orgId}:notif_${Date.now()}_${uuid().slice(0, 8)}`,
        docType: 'notification',
        orgId,
        ruleId: rule._id,
        ruleKey: rule.ruleKey,
        channel,
        title,
        body,
        recipientId: recipient,
        relatedDocIds: affectedDocIds,
        isRead: false,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      };
      const saved = await this.couch.create(orgId, notif);
      this.logger.log(`인앱 알림 생성: ${title} → ${recipient}`);
      return { notificationId: saved._id, channel, recipient };
    }

    // EMAIL / SMS: job-queue에 위임 (mock)
    const bullJob = await this.jobQueue.add(JobType.NOTIFICATION_SEND, {
      orgId,
      channel,
      to: recipient,
      subject: title,
      body,
      ruleId: rule._id,
      ruleKey: rule.ruleKey,
    }, { attempts: 2, backoff: { type: 'fixed', delay: 3000 }, removeOnComplete: true });

    this.logger.log(`외부 알림 큐 등록 [${channel}]: jobId=${bullJob.id}, to=${recipient}`);
    return { bullJobId: String(bullJob.id), channel, to: recipient };
  }

  /** 경보 생성 액션: CouchDB alert 문서 직접 생성 */
  private async actionCreateAlert(
    orgId: string,
    rule: AutomationRule,
    action: {
      alertType?: AlertType;
      alertSeverity?: SeverityLevel;
      alertTitle?: string;
      alertBody?: string;
    },
    context: TriggerContext,
    affectedDocIds: string[],
  ): Promise<unknown> {
    const now = new Date().toISOString();
    const docSnapshot = (context['docSnapshot'] as Record<string, unknown>) ?? {};

    const alert = {
      _id: `alert:${orgId}:alrt_${Date.now()}_${uuid().slice(0, 8)}`,
      docType: 'alert',
      orgId,
      complexId: (docSnapshot['complexId'] as string) ?? rule.targetComplexId,
      alertType: action.alertType ?? AlertType.AUTOMATION_FAILURE,
      status: 'ACTIVE',
      severity: action.alertSeverity ?? SeverityLevel.MEDIUM,
      title: this.renderTemplate(action.alertTitle ?? `자동화 경보: ${rule.name}`, context),
      message: this.renderTemplate(action.alertBody ?? rule.description ?? '', context),
      sourceEntityType: 'automationRule',
      sourceEntityId: rule._id,
      automationRuleKey: rule.ruleKey,
      relatedDocIds: affectedDocIds,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const saved = await this.couch.create(orgId, alert);
    this.logger.log(`경보 생성: ${alert.title} (${alert.alertType})`);
    return { alertId: saved._id, alertType: alert.alertType };
  }

  /** 점검 일정 생성 액션: CouchDB schedule 문서 생성 */
  private async actionCreateSchedule(
    orgId: string,
    rule: AutomationRule,
    action: {
      scheduleTitle?: string;
      scheduleDaysOffset?: number;
    },
    context: TriggerContext,
  ): Promise<unknown> {
    const now = new Date();
    const offset = action.scheduleDaysOffset ?? 30;
    const scheduledDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nowStr = now.toISOString();

    const schedule = {
      _id: `schedule:${orgId}:sched_${Date.now()}_${uuid().slice(0, 8)}`,
      docType: 'schedule',
      orgId,
      complexId: rule.targetComplexId,
      title: this.renderTemplate(action.scheduleTitle ?? `[자동] ${rule.name}`, context),
      scheduleType: 'INSPECTION',
      scheduledDate,
      isActive: true,
      isAutoGenerated: true,
      automationRuleKey: rule.ruleKey,
      createdAt: nowStr,
      updatedAt: nowStr,
      createdBy: 'system',
      updatedBy: 'system',
    };

    const saved = await this.couch.create(orgId, schedule);
    this.logger.log(`일정 자동 생성: ${schedule.title} (${scheduledDate})`);
    return { scheduleId: saved._id, scheduledDate };
  }

  /** 간단한 템플릿 렌더링: {{key}} → context[key] */
  private renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key] ?? (context['docSnapshot'] as Record<string, unknown>)?.[key];
      return val != null ? String(val) : `{{${key}}}`;
    });
  }
}
