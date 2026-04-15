// apps/admin-web/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { UserRole } from '@ax/shared';

export const routes: Routes = [
  // ── Public routes ──────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // ── Protected shell ────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Dashboard
      {
        path: 'dashboard',
        title: '대시보드',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },

      // Housing Complex management
      {
        path: 'complexes',
        title: '단지 관리',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/complexes/complex-list/complex-list.component').then(
                (m) => m.ComplexListComponent,
              ),
          },
          {
            path: 'new',
            canActivate: [roleGuard([UserRole.ORG_ADMIN])],
            loadComponent: () =>
              import('./features/complexes/complex-form/complex-form.component').then(
                (m) => m.ComplexFormComponent,
              ),
          },
          {
            path: ':complexId',
            loadComponent: () =>
              import('./features/complexes/complex-detail/complex-detail.component').then(
                (m) => m.ComplexDetailComponent,
              ),
          },
          {
            path: ':complexId/buildings/:buildingId/3d',
            title: '3D 디지털 트윈',
            loadComponent: () =>
              import('./features/viewer/pages/model-viewer-page.component').then(
                (m) => m.ModelViewerPageComponent,
              ),
          },
        ],
      },

      // Inspection Projects & Sessions
      {
        path: 'inspection',
        title: '점검 관리',
        children: [
          {
            path: 'projects',
            loadComponent: () =>
              import('./features/inspection/projects/project-list/project-list.component').then(
                (m) => m.ProjectListComponent,
              ),
          },
          {
            path: 'projects/new',
            canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER])],
            loadComponent: () =>
              import('./features/inspection/projects/project-form/project-form.component').then(
                (m) => m.ProjectFormComponent,
              ),
          },
          {
            path: 'projects/:projectId',
            loadComponent: () =>
              import('./features/inspection/projects/project-detail/project-detail.component').then(
                (m) => m.ProjectDetailComponent,
              ),
          },
          {
            path: 'projects/:projectId/sessions/:sessionId',
            loadComponent: () =>
              import('./features/inspection/sessions/session-detail/session-detail.component').then(
                (m) => m.SessionDetailComponent,
              ),
          },
        ],
      },

      // Work Orders
      {
        path: 'work-orders',
        title: '작업지시',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/work-orders/pages/work-order-list-page.component').then(
                (m) => m.WorkOrderListPageComponent,
              ),
          },
        ],
      },

      // Defects
      {
        path: 'defects',
        title: '결함 관리',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/defects/defect-list/defect-list.component').then(
                (m) => m.DefectListComponent,
              ),
          },
          {
            path: ':defectId',
            loadComponent: () =>
              import('./features/defects/defect-detail/defect-detail.component').then(
                (m) => m.DefectDetailComponent,
              ),
          },
        ],
      },

      // Crack Monitoring
      {
        path: 'cracks',
        title: '균열 모니터링',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/cracks/crack-dashboard/crack-dashboard.component').then(
                (m) => m.CrackDashboardComponent,
              ),
          },
          {
            path: 'gauge/:gaugeId',
            title: '균열 이력',
            loadComponent: () =>
              import('./features/cracks/pages/crack-history-page.component').then(
                (m) => m.CrackHistoryPageComponent,
              ),
          },
          {
            path: 'gauge/:gaugeId/legacy',
            title: '균열 이력 (레거시)',
            loadComponent: () =>
              import('./features/cracks/crack-history/crack-history.component').then(
                (m) => m.CrackHistoryComponent,
              ),
          },
        ],
      },

      // Complaint Management
      {
        path: 'complaints',
        title: '민원 관리',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/complaints/complaint-list/complaint-list.component').then(
                (m) => m.ComplaintListComponent,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/complaints/complaint-form/complaint-form.component').then(
                (m) => m.ComplaintFormComponent,
              ),
          },
          // ── integ-AX: AI 민원 트리아지 + KoBERT 시뮬레이터 ──────────
          {
            path: 'triage',
            title: 'AI 민원 트리아지',
            canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.REVIEWER, UserRole.SUPER_ADMIN])],
            loadComponent: () =>
              import('./features/complaints/pages/triage-queue-page.component').then(
                (m) => m.TriageQueuePageComponent,
              ),
          },
          {
            path: ':complaintId',
            loadComponent: () =>
              import('./features/complaints/pages/complaint-detail-page.component').then(
                (m) => m.ComplaintDetailPageComponent,
              ),
          },
        ],
      },

      // Schedules
      {
        path: 'schedules',
        title: '일정 관리',
        loadComponent: () =>
          import('./features/schedules/schedule-list/schedule-list.component').then(
            (m) => m.ScheduleListComponent,
          ),
      },

      // Alerts
      {
        path: 'alerts',
        title: '경보 관리',
        loadComponent: () =>
          import('./features/alerts/pages/alert-list-page.component').then(
            (m) => m.AlertListPageComponent,
          ),
      },

      // Reports
      {
        path: 'reports',
        title: '보고서',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/reports/pages/report-list-page.component').then(
                (m) => m.ReportListPageComponent,
              ),
          },
          {
            path: 'generate',
            canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER])],
            loadComponent: () =>
              import('./features/reports/report-generate/report-generate.component').then(
                (m) => m.ReportGenerateComponent,
              ),
          },
        ],
      },

      // ── integ-AX: AI 통합 검토 수신함 ───────────────────────────
      {
        path: 'ai-inbox',
        title: 'AI 검토 수신함',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/ai-inbox/ai-inbox-page.component').then(
            (m) => m.AiInboxPageComponent,
          ),
      },

      // ── integ-AX: AI 운영 성과 대시보드 ──────────────────────────
      {
        path: 'ai-performance',
        title: 'AI 운영 성과',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/ai-performance/ai-performance-page.component').then(
            (m) => m.AiPerformancePageComponent,
          ),
      },

      // ── integ-AX: AI 파이프라인 트레이스 ─────────────────────────
      {
        path: 'ai-pipeline',
        title: 'AI 파이프라인',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/ai-pipeline/ai-pipeline-page.component').then(
            (m) => m.AiPipelinePageComponent,
          ),
      },

      // ── integ-AX: CleanHouse 마일리지 인센티브 ────────────────────
      {
        path: 'mileage',
        title: 'CleanHouse 마일리지',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/mileage/mileage-page.component').then(
            (m) => m.MileagePageComponent,
          ),
      },

      // ── integ-AX: Vision 2030 ML 예측 분석 ───────────────────────
      {
        path: 'vision2030',
        title: 'Vision 2030 예측분석',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.VIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/vision2030/vision2030-page.component').then(
            (m) => m.Vision2030PageComponent,
          ),
      },

      // AX-SPRINT: RPA 지능형 행정자동화 대시보드
      {
        path: 'rpa',
        title: '행정자동화 (RPA)',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER])],
        loadComponent: () =>
          import('./features/rpa/pages/rpa-dashboard-page.component').then(
            (m) => m.RpaDashboardPageComponent,
          ),
      },

      // Jobs (Phase 2)
      {
        path: 'jobs',
        title: '비동기 작업',
        loadComponent: () =>
          import('./features/jobs/pages/job-list-page.component').then(
            (m) => m.JobListPageComponent,
          ),
      },
      {
        path: 'jobs/:jobId',
        title: '작업 상세',
        loadComponent: () =>
          import('./features/jobs/pages/job-detail-page.component').then(
            (m) => m.JobDetailPageComponent,
          ),
      },

      // Feature Flags (Phase 2)
      {
        path: 'feature-flags',
        title: '기능 플래그',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/feature-flags/pages/feature-flag-page.component').then(
            (m) => m.FeatureFlagPageComponent,
          ),
      },

      // AI 결함 탐지 검토 (Phase 2)
      {
        path: 'ai-detections',
        title: 'AI 결함 탐지 검토',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/ai-detections/pages/detection-review-page.component').then(
            (m) => m.DetectionReviewPageComponent,
          ),
      },

      // AI 진단 의견 검토 (Phase 2)
      {
        path: 'diagnosis',
        title: 'AI 진단 의견',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/diagnosis/pages/diagnosis-review-page.component').then(
            (m) => m.DiagnosisReviewPageComponent,
          ),
      },

      // 균열 심층 분석 검토 (Phase 2)
      {
        path: 'crack-analysis',
        title: '균열 분석 검토',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/cracks/pages/crack-analysis-review-page.component').then(
            (m) => m.CrackAnalysisReviewPageComponent,
          ),
      },
      {
        path: 'crack-analysis/:analysisId',
        title: '균열 분석 상세',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/cracks/pages/crack-analysis-detail-page.component').then(
            (m) => m.CrackAnalysisDetailPageComponent,
          ),
      },

      // Drone Missions (Phase 2)
      {
        path: 'drone',
        title: '드론 점검',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/drone/pages/drone-mission-list-page.component').then(
                (m) => m.DroneMissionListPageComponent,
              ),
          },
          {
            path: 'new',
            title: '드론 미션 생성',
            loadComponent: () =>
              import('./features/drone/pages/drone-mission-new-page.component').then(
                (m) => m.DroneMissionNewPageComponent,
              ),
          },
          {
            path: ':missionId',
            title: '드론 미션 상세',
            loadComponent: () =>
              import('./features/drone/pages/drone-mission-detail-page.component').then(
                (m) => m.DroneMissionDetailPageComponent,
              ),
          },
        ],
      },

      // 예지정비 위험도 (Phase 2-9)
      {
        path: 'risk',
        title: '예지정비 위험도',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/risk/pages/risk-overview-page.component').then(
            (m) => m.RiskOverviewPageComponent,
          ),
      },

      // IoT 센서 대시보드 (Phase 2-8)
      {
        path: 'iot',
        title: 'IoT 센서',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN])],
        loadComponent: () =>
          import('./features/iot/pages/sensor-dashboard-page.component').then(
            (m) => m.SensorDashboardPageComponent,
          ),
      },

      // KPI
      {
        path: 'kpi',
        title: 'KPI',
        canActivate: [roleGuard([UserRole.ORG_ADMIN, UserRole.VIEWER])],
        loadComponent: () =>
          import('./features/kpi/kpi-dashboard/kpi-dashboard.component').then(
            (m) => m.KpiDashboardComponent,
          ),
      },

      // Settings
      {
        path: 'settings',
        title: '설정',
        canActivate: [roleGuard([UserRole.ORG_ADMIN])],
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./features/settings/users/user-management/user-management.component').then(
                (m) => m.UserManagementComponent,
              ),
          },
          {
            path: 'organization',
            loadComponent: () =>
              import('./features/settings/organizations/org-settings/org-settings.component').then(
                (m) => m.OrgSettingsComponent,
              ),
          },
          { path: '', redirectTo: 'users', pathMatch: 'full' },
        ],
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
