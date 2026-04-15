// apps/job-worker/src/processors/notification.processor.ts
// Phase 2-7: 이메일/SMS 단건 알림 발송 프로세서 (mock)

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RuleEvaluatorService } from '../services/rule-evaluator.service';

interface NotificationSendPayload {
  orgId: string;
  channel: 'EMAIL' | 'SMS';
  to: string;
  subject?: string;
  body: string;
  ruleId?: string;
  ruleKey?: string;
}

@Processor('job-queue')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly evaluator: RuleEvaluatorService) {}

  @Process('NOTIFICATION_SEND')
  async handleNotificationSend(job: Job<NotificationSendPayload>): Promise<void> {
    const { channel, to, subject, body, ruleKey, orgId } = job.data;
    this.logger.log(`NOTIFICATION_SEND 처리: [${channel}] → ${to}, 룰=${ruleKey ?? '—'}, orgId=${orgId}`);

    try {
      await job.progress(20);

      const result = await this.evaluator.sendExternalNotification({
        channel,
        to,
        subject,
        body,
        ruleKey,
      });

      await job.progress(100);

      if (result.status === 'SUCCESS') {
        this.logger.log(
          `알림 발송 완료 [${channel}]: to=${to}, messageId=${result.messageId}`,
        );
      } else {
        this.logger.warn(`알림 발송 실패 [${channel}]: to=${to}, error=${result.error}`);
        throw new Error(result.error ?? '알림 발송 실패');
      }
    } catch (err: unknown) {
      this.logger.error(`NOTIFICATION_SEND 처리 오류: ${(err as Error).message}`);
      throw err;
    }
  }
}
