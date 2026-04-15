import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateRpaTaskInput, RpaAutomationSummary } from '@ax/shared';
import { environment } from '../../../environments/environment';

export interface EnqueueRpaTaskResult {
  jobId: string;
  taskType: string;
}

@Injectable({ providedIn: 'root' })
export class RpaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/rpa`;

  /** RPA 자동화 현황 집계 조회 */
  getSummary(): Observable<RpaAutomationSummary> {
    return this.http.get<any>(`${this.base}/summary`).pipe(
      map((r) => r.data ?? r),
    );
  }

  /** RPA 작업 즉시 실행 또는 스케줄 등록 */
  enqueueTask(input: CreateRpaTaskInput): Observable<EnqueueRpaTaskResult> {
    return this.http.post<any>(`${this.base}/tasks`, input).pipe(
      map((r) => r.data ?? r),
    );
  }

  /** 계약 만료 알림 즉시 실행 */
  runContractExpiryNotice(): Observable<EnqueueRpaTaskResult> {
    return this.http.post<any>(`${this.base}/contract-expiry/run`, {}).pipe(
      map((r) => r.data ?? r),
    );
  }
}
