import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserRole } from '@ax/shared';

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  assignedComplexIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  assignedComplexIds?: string[];
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  assignedComplexIds?: string[];
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  list(organizationId?: string): Observable<UserProfile[]> {
    const params = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    return this.http.get<any>(`${this.base}${params}`).pipe(map((r) => r.data ?? r));
  }

  get(id: string): Observable<UserProfile> {
    return this.http.get<any>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map((r) => r.data ?? r),
    );
  }

  create(dto: CreateUserDto): Observable<UserProfile> {
    return this.http.post<any>(this.base, dto).pipe(map((r) => r.data ?? r));
  }

  update(id: string, dto: UpdateUserDto): Observable<UserProfile> {
    return this.http.patch<any>(`${this.base}/${encodeURIComponent(id)}`, dto).pipe(
      map((r) => r.data ?? r),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
