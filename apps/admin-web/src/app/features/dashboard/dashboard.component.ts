// apps/admin-web/src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { DashboardResponse } from '@ax/shared';
import { KpiCardComponent } from './components/kpi-card.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'ax-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatChipsModule, RouterLink,
    KpiCardComponent,
  ],
  template: `
    @if (loading()) {
      <div class="loading-center">
        <mat-spinner diameter="48" />
      </div>
    } @else if (data()) {
      <div class="dashboard-grid">
        <!-- KPI Cards Row 1: Risk -->
        <section class="section-title">시설물 위험 현황</section>

        <ax-kpi-card icon="warning" color="error"
          label="긴급 결함" [value]="data()!.criticalDefects"
          unit="건" routerLink="/defects" [queryParams]="{severity:'CRITICAL'}" />
        <ax-kpi-card icon="report_problem" color="warn"
          label="높음 결함" [value]="data()!.highDefects"
          unit="건" />
        <ax-kpi-card icon="build_circle" color="info"
          label="미수리 결함" [value]="data()!.unrepairedDefects"
          unit="건" />
        <ax-kpi-card icon="notifications_active" color="error"
          label="활성 경보" [value]="data()!.activeAlerts"
          unit="건" routerLink="/alerts" />

        <!-- KPI Cards Row 2: Complaints -->
        <section class="section-title">민원 처리 현황</section>

        <ax-kpi-card icon="support_agent" color="primary"
          label="처리 대기" [value]="data()!.pendingComplaints"
          unit="건" routerLink="/complaints" />
        <ax-kpi-card icon="schedule" color="error"
          label="기한 초과" [value]="data()!.overdueComplaints"
          unit="건" />
        <ax-kpi-card icon="timer" color="info"
          label="평균 처리 시간" [value]="data()!.avgResolutionHours | number:'1.1-1'"
          unit="시간" />
        <ax-kpi-card icon="trending_up" color="success"
          label="해결률" [value]="data()!.complaintResolutionRate"
          unit="%" />

        <!-- KPI Cards Row 3: Inspection -->
        <section class="section-title">점검 진행 현황</section>

        <ax-kpi-card icon="assignment_turned_in" color="primary"
          label="진행 중 프로젝트" [value]="data()!.activeProjects"
          unit="건" routerLink="/inspection/projects" />
        <ax-kpi-card icon="assignment_late" color="error"
          label="지연 점검" [value]="data()!.overdueInspections"
          unit="건" />
        <ax-kpi-card icon="timeline" color="warn"
          label="균열 임계치 초과" [value]="data()!.thresholdExceedances"
          unit="개소" routerLink="/cracks" />
        <ax-kpi-card icon="sensors" color="info"
          label="모니터링 포인트" [value]="data()!.activeGaugePoints"
          unit="개" />

        <!-- Charts Row -->
        <div class="chart-row">
          <!-- Defect distribution -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>결함 유형 분포</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="defect-bars">
                @for (item of data()!.defectsByType; track item.type) {
                  <div class="bar-row">
                    <span class="bar-label">{{ item.type }}</span>
                    <div class="bar-track">
                      <div class="bar-fill"
                        [style.width.%]="getBarPercent(item.count)"
                        [class]="'bar-' + item.type.toLowerCase()">
                      </div>
                    </div>
                    <span class="bar-value">{{ item.count }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Recent alerts -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>최근 경보</mat-card-title>
              <button mat-button routerLink="/alerts" class="see-all">전체 보기</button>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.recentAlerts.length === 0) {
                <p class="empty-state">활성 경보 없음</p>
              } @else {
                @for (alert of data()!.recentAlerts; track alert.id) {
                  <div class="alert-item" [class]="'alert-' + alert.severity.toLowerCase()">
                    <mat-icon class="alert-icon">{{ getSeverityIcon(alert.severity) }}</mat-icon>
                    <div class="alert-info">
                      <span class="alert-title">{{ alert.title }}</span>
                      <small>{{ alert.createdAt | date:'MM/dd HH:mm' }}</small>
                    </div>
                    <mat-chip [class]="'chip-' + alert.severity.toLowerCase()">
                      {{ alert.severity }}
                    </mat-chip>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Recent complaints -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>최근 민원</mat-card-title>
              <button mat-button routerLink="/complaints" class="see-all">전체 보기</button>
            </mat-card-header>
            <mat-card-content>
              @if (data()!.recentComplaints.length === 0) {
                <p class="empty-state">대기 민원 없음</p>
              } @else {
                @for (c of data()!.recentComplaints; track c.id) {
                  <div class="complaint-item" [routerLink]="['/complaints', c.id]">
                    <mat-icon>support_agent</mat-icon>
                    <div class="complaint-info">
                      <span>{{ c.title }}</span>
                      <small>{{ c.submittedAt | date:'MM/dd HH:mm' }}</small>
                    </div>
                    <mat-chip>{{ c.status }}</mat-chip>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    }
  `,
  styles: [`
    .dashboard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .section-title {
      grid-column: 1 / -1; font-size: 14px; font-weight: 600;
      color: #555; text-transform: uppercase; letter-spacing: 0.5px;
      margin-top: 8px;
    }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .chart-row { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .chart-card { min-height: 280px; }
    .empty-state { color: #999; text-align: center; padding: 24px; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .bar-label { width: 100px; font-size: 12px; }
    .bar-track { flex: 1; height: 20px; background: #eee; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #1976d2; border-radius: 4px; transition: width 0.3s; }
    .bar-value { width: 32px; text-align: right; font-size: 12px; font-weight: 600; }
    .alert-item, .complaint-item {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer;
    }
    .alert-info, .complaint-info { flex: 1; display: flex; flex-direction: column; }
    .alert-title { font-size: 13px; }
    .see-all { margin-left: auto; }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly data = signal<DashboardResponse | null>(null);

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/dashboard`).subscribe({
      next: (res) => { this.data.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getBarPercent(count: number): number {
    const max = Math.max(...(this.data()?.defectsByType.map((d) => d.count) ?? [1]));
    return max === 0 ? 0 : (count / max) * 100;
  }

  getSeverityIcon(severity: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'error', HIGH: 'warning', MEDIUM: 'info', LOW: 'check_circle',
    };
    return map[severity] ?? 'info';
  }
}
