import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ComplexesService, Complex } from '../../../core/api/complexes.service';
import { ComplexFormComponent } from '../complex-form/complex-form.component';
import {
  PageHeaderComponent,
  EmptyStateComponent,
  SkeletonComponent,
} from '../../../shared/components';

@Component({
  selector: 'ax-complex-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule,
    PageHeaderComponent, EmptyStateComponent, SkeletonComponent,
  ],
  template: `
    <ax-page-header
      title="단지 관리"
      description="공공임대주택 단지 등록 및 기본 정보 관리"
      icon="apartment"
      [meta]="complexes().length + '개 단지'">
      <div ax-page-actions>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> 새 단지 등록
        </button>
      </div>
    </ax-page-header>

    @if (loading()) {
      <div class="ax-table-container">
        <ax-skeleton type="table" />
      </div>
    } @else {
      <div class="ax-table-container">
        <table mat-table [dataSource]="complexes()" class="ax-complex-table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>단지명</th>
            <td mat-cell *matCellDef="let row">
              <a [routerLink]="['/complexes', row._id]" class="complex-link">{{ row.name }}</a>
              <div class="complex-addr ax-text-meta">{{ row.address }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="builtYear">
            <th mat-header-cell *matHeaderCellDef>준공</th>
            <td mat-cell *matCellDef="let row" class="ax-text-meta">{{ row.builtYear }}년</td>
          </ng-container>

          <ng-container matColumnDef="units">
            <th mat-header-cell *matHeaderCellDef>규모</th>
            <td mat-cell *matCellDef="let row" class="ax-text-body">
              {{ row.totalBuildings }}동 / {{ row.totalUnits }}세대
            </td>
          </ng-container>

          <ng-container matColumnDef="tags">
            <th mat-header-cell *matHeaderCellDef>태그</th>
            <td mat-cell *matCellDef="let row">
              <div class="tag-list">
                @for (tag of row.tags; track tag) {
                  <span class="tag-chip">{{ tag }}</span>
                }
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>등록일</th>
            <td mat-cell *matCellDef="let row" class="ax-text-meta">
              {{ row.createdAt | date:'yyyy-MM-dd' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>액션</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary" matTooltip="상세/편집"
                [routerLink]="['/complexes', row._id]">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button matTooltip="수정"
                (click)="openForm(row); $event.stopPropagation()">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="삭제"
                (click)="confirmDelete(row); $event.stopPropagation()">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" class="ax-table-row"></tr>
        </table>

        @if (complexes().length === 0) {
          <ax-empty-state
            type="empty"
            title="등록된 단지가 없습니다"
            description="첫 번째 공공임대주택 단지를 등록해 주세요."
            primaryLabel="단지 등록하기"
            (primaryAction)="openForm()" />
        }
      </div>
    }
  `,
  styles: [`
    /* Table */
    .ax-complex-table { width: 100%; }

    .ax-table-row {
      transition: background 0.12s;
      &:hover { background: var(--ax-color-bg-surface-alt); }
    }

    .complex-link {
      font-weight: 500;
      color: var(--ax-color-brand-primary);
      text-decoration: none;
      font-size: var(--ax-font-size-sm);
      &:hover { text-decoration: underline; }
    }
    .complex-addr { margin-top: 2px; }

    /* Tag chips */
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ax-space-1);
    }
    .tag-chip {
      display: inline-block;
      padding: 2px var(--ax-space-2);
      background: var(--ax-color-brand-primary-subtle);
      color: var(--ax-color-brand-primary);
      border-radius: var(--ax-radius-pill);
      font-size: var(--ax-font-size-xs);
      font-weight: 500;
    }
  `],
})
export class ComplexListComponent implements OnInit {
  private readonly svc    = inject(ComplexesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);
  private readonly router = inject(Router);

  complexes = signal<Complex[]>([]);
  loading   = signal(true);

  columns = ['name', 'builtYear', 'units', 'tags', 'createdAt', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.complexes.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openForm(complex?: Complex) {
    const ref = this.dialog.open(ComplexFormComponent, {
      width: '600px',
      data: complex ?? null,
    });
    ref.afterClosed().subscribe((saved) => { if (saved) this.load(); });
  }

  confirmDelete(complex: Complex) {
    if (!confirm(`"${complex.name}" 단지를 삭제하시겠습니까?`)) return;
    this.svc.delete(complex._id).subscribe({
      next: () => {
        this.snack.open('단지가 삭제되었습니다.', '닫기', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snack.open(err.error?.message ?? '삭제 실패', '닫기', { duration: 4000 }),
    });
  }
}
