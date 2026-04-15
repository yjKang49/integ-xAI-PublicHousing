// apps/job-worker/src/processors/automation-rule.processor.ts
// Phase 2-7: 자동화 룰 실행 Bull 프로세서 (외부 알림 처리 전담)

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';
import { RuleEvaluatorService, ExternalNotification } from '../services/rule-evaluator.service';

/**
 * AUTOMATION_RULE_EXECUTE Job Payload
 * API에서 rule을 평가한 후, 외부 채널(Email/SMS) 발송이 필요한 경우에만 큐에 등록됩니다.
 */
interface AutomationRuleExecutePayload {
  executionDocId: string;   // automationExecution._id (결과 콜백용)
  orgId: string;
  ruleId: string;
  ruleName: string;
  ruleKey: string;
  notifications: ExternalNotification[]; // 발송할 외부 알림 목록
}

/**
 * AUTOMATION_RULE_SCAN Job Payload
 * 주기적으로 날짜 기반 룰 전체를 API에 scan 요청합니다.
 */
interface AutomationRuleScanPayload {
  orgId: string;
}

@Processor('job-queue')
export class AutomationRuleProcessor {
  private readonly logger = new Logger(AutomationRuleProcessor.name);
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000';
  private readonly workerSecret = process.env.WORKER_SECRET ?? 'dev-worker-secret';

  constructor(
    private readonly client: JobStatusClient,
    private readonly evaluator: RuleEvaluatorService,
  ) {}

  /** 자동화 룰 외부 알림 발송 처리 */
  @Process('AUTOMATION_RULE_EXECUTE')
  async handleRuleExecute(job: Job<AutomationRuleExecutePayload>): Promise<void> {
    const { executionDocId, orgId, ruleKey, notifications } = job.data;
    this.logger.log(`AUTOMATION_RULE_EXECUTE 시작: 룰=${ruleKey}, 알림=${notifications.length}건`);

    try {
      await job.progress(10);

      // 외부 알림 발송 (mock)
      const results = await this.evaluator.sendAll(notifications);
      await job.progress(80);

      const successCount = results.filter(r => r.status === 'SUCCESS').length;
      const summary = `외부 알림 ${successCount}/${notifications.length}건 발송 완료 (mock)`;

      // 실행 결과 API에 보고
      if (executionDocId) {
        await this.patchExecutionResult(orgId, executionDocId, {
          status: 'COMPLETED',
          summary,
          actionsExecuted: results.map(r => ({
            type: `SEND_NOTIFICATION_${r.channel}`,
            status: r.status,
            result: { messageId: r.messageId, sentAt: r.sentAt, mock: true },
            executedAt: r.sentAt,
            durationMs: 0,
          })),
        });
      }

      await job.progress(100);
      this.logger.log(`AUTOMATION_RULE_EXECUTE 완료: 룰=${ruleKey}, ${summary}`);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      this.logger.error(`AUTOMATION_RULE_EXECUTE 실패: 룰=${ruleKey} — ${msg}`);

      if (executionDocId) {
        await this.patchExecutionResult(orgId, executionDocId, {
          status: 'FAILED',
          error: msg,
          summary: `외부 알림 발송 실패: ${msg}`,
        });
      }
      throw err;
    }
  }

  /** 날짜 기반 룰 전체 스캔 — API /automation-rules/scan 호출 */
  @Process('AUTOMATION_RULE_SCAN')
  async handleRuleScan(job: Job<AutomationRuleScanPayload>): Promise<void> {
    const { orgId } = job.data;
    this.logger.log(`AUTOMATION_RULE_SCAN 시작: orgId=${orgId}`);

    try {
      await job.progress(10);
      const result = await this.callApiScan(orgId);
      await job.progress(100);
      this.logger.log(
        `AUTOMATION_RULE_SCAN 완료: orgId=${orgId}, triggered=${result?.triggered ?? 0}`,
      );
    } catch (err: unknown) {
      this.logger.error(`AUTOMATION_RULE_SCAN 실패: ${(err as Error).message}`);
      throw err;
    }
  }

  // ── 내부 헬퍼 ─────────────────────────────────────────────────────────

  private async patchExecutionResult(
    orgId: string,
    executionDocId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const http = this.apiUrl.startsWith('https') ? await import('https') : await import('http');
    const body = JSON.stringify(patch);
    const url = new URL(
      `/api/v1/automation-executions/${encodeURIComponent(executionDocId)}/result?orgId=${encodeURIComponent(orgId)}`,
      this.apiUrl,
    );

    await new Promise<void>(resolve => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Worker-Secret': this.workerSecret,
          },
        },
        res => { res.resume(); resolve(); },
      );
      req.on('error', () => resolve());
      req.write(body);
      req.end();
    });
  }

  private async callApiScan(orgId: string): Promise<{ scanned: number; triggered: number } | null> {
    const http = this.apiUrl.startsWith('https') ? await import('https') : await import('http');
    const url = new URL(
      `/api/v1/automation-rules/scan`,
      this.apiUrl,
    );

    return new Promise(resolve => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': 0,
            'X-Worker-Secret': this.workerSecret,
            'X-OrgId': orgId,
          },
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch { resolve(null); }
          });
        },
      );
      req.on('error', () => resolve(null));
      req.end();
    });
  }
}
