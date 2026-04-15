// apps/job-worker/src/services/rule-evaluator.service.ts
// Phase 2-7: Job Worker 측 룰 액션 평가/실행기 (mock 외부 발송 담당)

import { Injectable, Logger } from '@nestjs/common';

export interface ExternalNotification {
  channel: 'EMAIL' | 'SMS';
  to: string;
  subject?: string;
  body: string;
  ruleId?: string;
  ruleKey?: string;
}

export interface ActionExecutionResult {
  channel: string;
  to: string;
  status: 'SUCCESS' | 'FAILED';
  mock: true;
  sentAt: string;
  messageId?: string;
  error?: string;
}

/**
 * RuleEvaluatorService
 * Job Worker 내에서 외부 채널(Email/SMS) mock 발송을 담당.
 * 실제 발송 SDK는 연결하지 않고 로그 + delay로 시뮬레이션합니다.
 */
@Injectable()
export class RuleEvaluatorService {
  private readonly logger = new Logger(RuleEvaluatorService.name);
  private readonly isDryRun = process.env.RPA_DRY_RUN !== 'false';

  async sendExternalNotification(notif: ExternalNotification): Promise<ActionExecutionResult> {
    const { channel, to, subject, body, ruleKey } = notif;
    this.logger.log(`[${channel}] ${this.isDryRun ? '[DRY-RUN] ' : ''}발송 → ${to} | 룰=${ruleKey}`);

    // 네트워크 지연 시뮬레이션
    await this.delay(channel === 'SMS' ? 300 : 600);

    if (this.isDryRun) {
      this.logger.debug(
        `[MOCK ${channel}]\n  To: ${to}\n  Subject: ${subject ?? '—'}\n  Body: ${body.slice(0, 100)}`,
      );
      return {
        channel,
        to,
        status: 'SUCCESS',
        mock: true,
        sentAt: new Date().toISOString(),
        messageId: `mock-${channel.toLowerCase()}-${Date.now()}`,
      };
    }

    // 실제 발송 어댑터 연결 자리 (현재는 DRY-RUN과 동일)
    return {
      channel,
      to,
      status: 'SUCCESS',
      mock: true,
      sentAt: new Date().toISOString(),
      messageId: `${channel.toLowerCase()}-${Date.now()}`,
    };
  }

  /** 여러 알림을 순차 처리 */
  async sendAll(notifications: ExternalNotification[]): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];
    for (const n of notifications) {
      results.push(await this.sendExternalNotification(n));
    }
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
