// apps/ai-worker/src/job-status.client.ts
import * as http from 'http';
import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class JobStatusClient {
  private readonly logger = new Logger(JobStatusClient.name);
  private readonly apiUrl = process.env.API_URL ?? 'http://api:3000';
  private readonly secret = process.env.WORKER_SECRET ?? 'dev-worker-secret';

  async updateStatus(
    jobDocId: string,
    orgId: string,
    patch: {
      status: string;
      progress?: number;
      result?: Record<string, any>;
      error?: string;
    },
  ): Promise<void> {
    return new Promise((resolve) => {
      const body = JSON.stringify(patch);
      const url = new URL(
        `/api/v1/jobs/${encodeURIComponent(jobDocId)}/status?orgId=${encodeURIComponent(orgId)}`,
        this.apiUrl,
      );
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Worker-Secret': this.secret,
          },
        },
        (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 400) {
            this.logger.error(
              `Status update failed: ${res.statusCode} for job ${jobDocId}`,
            );
          }
          resolve();
        },
      );
      req.on('error', (err) => {
        this.logger.error(`Status update error: ${err.message}`);
        resolve();
      });
      req.write(body);
      req.end();
    });
  }
}
