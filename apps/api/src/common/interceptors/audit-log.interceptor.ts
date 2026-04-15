// apps/api/src/common/interceptors/audit-log.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const AUDIT_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (!AUDIT_METHODS.includes(req.method)) return next.handle();

    const { user, method, url, ip, headers } = req;
    const actor = user?.id ?? 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              actor,
              method,
              url,
              ip,
              userAgent: headers['user-agent'],
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (err) => {
          this.logger.error(
            JSON.stringify({
              actor,
              method,
              url,
              error: err.message,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
