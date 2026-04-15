// apps/api/src/common/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps all successful responses in the standard ApiResponse envelope:
 * { success: true, data: ..., meta?: ..., timestamp: ... }
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data?.data ?? data,
        ...(data?.meta && { meta: data.meta }),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
