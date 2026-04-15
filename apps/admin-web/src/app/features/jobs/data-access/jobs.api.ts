// apps/admin-web/src/app/features/jobs/data-access/jobs.api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface JobListParams {
  type?: string;
  status?: string;
  complexId?: string;
  page?: number;
  limit?: number;
}

export interface CreateJobDto {
  type: string;
  payload: Record<string, any>;
  priority?: string;
  complexId?: string;
}

@Injectable({ providedIn: 'root' })
export class JobsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/jobs`;

  list(params: JobListParams = {}): Observable<any> {
    const qs = new URLSearchParams();
    if (params.type)      qs.set('type',      params.type);
    if (params.status)    qs.set('status',    params.status);
    if (params.complexId) qs.set('complexId', params.complexId);
    if (params.page)      qs.set('page',      String(params.page));
    if (params.limit)     qs.set('limit',     String(params.limit));
    const query = qs.toString();
    return this.http.get<any>(query ? `${this.base}?${query}` : this.base);
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(dto: CreateJobDto): Observable<any> {
    return this.http.post<any>(this.base, dto);
  }

  cancel(id: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${encodeURIComponent(id)}/cancel`, {});
  }
}
