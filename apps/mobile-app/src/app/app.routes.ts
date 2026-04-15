// apps/mobile-app/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // ── Auth ────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // ── Main tabs shell ─────────────────────────────
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/tabs/tabs.component').then((m) => m.TabsComponent),
    children: [
      // Tab 1: 홈 / 대시보드
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent),
      },

      // Tab 2: 점검 (QR → 체크리스트 → 결함 등록)
      {
        path: 'inspection',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/inspection/inspection-home/inspection-home.component').then(
                (m) => m.InspectionHomeComponent,
              ),
          },
          {
            path: 'qr-scan',
            loadComponent: () =>
              import('./features/inspection/qr-scan/qr-scan.component').then(
                (m) => m.QrScanComponent,
              ),
          },
          {
            path: 'checklist',
            loadComponent: () =>
              import('./features/inspection/checklist/checklist.component').then(
                (m) => m.ChecklistComponent,
              ),
          },
          {
            path: 'defect-form',
            loadComponent: () =>
              import('./features/inspection/defect-form/defect-form.component').then(
                (m) => m.DefectFormComponent,
              ),
          },
          {
            path: 'defects/:sessionId',
            loadComponent: () =>
              import('./features/inspection/defect-list/defect-list.component').then(
                (m) => m.DefectListMobileComponent,
              ),
          },
          {
            path: 'viewer',
            title: '3D 디지털 트윈',
            loadComponent: () =>
              import('./features/viewer/viewer.page').then((m) => m.ViewerPage),
          },
          {
            path: 'complaint-action',
            title: '현장 조치',
            loadComponent: () =>
              import('./features/complaints/complaint-action.page').then((m) => m.ComplaintActionPage),
          },
          {
            path: 'work-orders',
            title: '작업지시',
            loadComponent: () =>
              import('./features/work-orders/work-order-list.page').then((m) => m.WorkOrderListPage),
          },
        ],
      },

      // Tab 3: 균열 측정
      {
        path: 'cracks',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/crack-measure/crack-home/crack-home.component').then(
                (m) => m.CrackHomeComponent,
              ),
          },
          {
            path: 'capture',
            loadComponent: () =>
              import('./features/crack-measure/capture/crack-capture.component').then(
                (m) => m.CrackCaptureComponent,
              ),
          },
          {
            path: 'history/:gaugeId',
            loadComponent: () =>
              import('./features/crack-measure/history/crack-history-mobile.component').then(
                (m) => m.CrackHistoryMobileComponent,
              ),
          },
        ],
      },

      // Tab 4: 민원
      {
        path: 'complaints',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/complaints/complaint-list-mobile/complaint-list-mobile.component').then(
                (m) => m.ComplaintListMobileComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/complaints/complaint-detail-mobile/complaint-detail-mobile.component').then(
                (m) => m.ComplaintDetailMobileComponent,
              ),
          },
        ],
      },

      // 드론 미디어 업로드 (현장)
      {
        path: 'drone-upload',
        title: '드론 업로드',
        loadComponent: () =>
          import('./features/drone/drone-upload.page').then((m) => m.DroneUploadPage),
      },

      // Tab 5: 동기화 상태
      {
        path: 'sync',
        loadComponent: () =>
          import('./features/sync-status/sync-status.component').then(
            (m) => m.SyncStatusComponent,
          ),
      },

      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/home' },
];
