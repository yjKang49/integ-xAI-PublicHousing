import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { InspectionSession, Defect, DefectMedia } from '@ax/shared';
import { UsersApiService } from '../../../../core/api/users.service';
import { BuildingsService } from '../../../../core/api/buildings.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { environment } from '../../../../../environments/environment';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안', ASSIGNED: '배정됨',
  PLANNED: '계획됨', IN_PROGRESS: '진행 중', PENDING_REVIEW: '검토 대기',
  REVIEWED: '검토 완료', SUBMITTED: '제출됨', APPROVED: '승인됨', COMPLETED: '완료', CANCELLED: '취소됨',
};

const CHECKLIST_RESULT_LABELS: Record<string, string> = {
  PASS: '양호', FAIL: '불량', 'N/A': '해당없음',
};

const CHECKLIST_RESULT_ICONS: Record<string, string> = {
  PASS: 'check_circle', FAIL: 'cancel', 'N/A': 'remove_circle',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
};

@Component({
  selector: 'ax-session-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatProgressBarModule, MatProgressSpinnerModule,
    MatDividerModule, MatTabsModule, MatSnackBarModule,
  ],
  template: `
    @if (loading() && !session()) {
      <div class="ax-loading-center">
        <mat-progress-bar mode="indeterminate" style="max-width:320px" />
      </div>
    } @else if (session()) {

      <!-- 헤더 -->
      <div class="ax-insp-detail-header">
        <button mat-icon-button [routerLink]="['../..']" matTooltip="프로젝트로">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="ax-insp-detail-header__title-wrap">
          <h2 class="ax-insp-detail-header__title">점검 세션 상세</h2>
        </div>
        <span class="ax-insp-status ax-insp-status--{{ session()!.status.toLowerCase() }}">
          {{ statusLabel(session()!.status) }}
        </span>
        @if (session()!.status === 'ASSIGNED') {
          <button mat-raised-button color="primary" (click)="updateStatus('IN_PROGRESS')" [disabled]="submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:4px" /> }
            @else { <mat-icon>play_arrow</mat-icon> }
            점검 시작
          </button>
        }
        @if (session()!.status === 'IN_PROGRESS') {
          <button mat-raised-button color="accent" (click)="updateStatus('SUBMITTED')" [disabled]="submitting()">
            @if (submitting()) { <mat-spinner diameter="18" style="display:inline-block;margin-right:4px" /> }
            @else { <mat-icon>task_alt</mat-icon> }
            점검 완료 제출
          </button>
        }
        <input #fileInput type="file" accept="image/*" multiple style="display:none"
               (change)="onFilesSelected($event)">
      </div>

      <!-- 세션 정보 + 현황 -->
      <div class="ax-insp-detail-grid">

        <!-- 세션 정보 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">fact_check</mat-icon>
            세션 정보
          </div>
          <div class="ax-insp-panel__body">
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">점검자</span>
              <span>{{ userName(session()!.inspectorId) }}</span>
            </div>
            <div class="ax-insp-info-row">
              <span class="ax-insp-info-lbl">대상 건물</span>
              <span>{{ buildingName(session()!.buildingId) }}</span>
            </div>
            @if (session()!.floorId) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">층</span>
                <span>{{ session()!.floorId }}</span>
              </div>
            }
            @if (session()!.startedAt) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">시작일시</span>
                <span>{{ session()!.startedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            }
            @if (session()!.completedAt) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">완료일시</span>
                <span>{{ session()!.completedAt | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            }
            @if (session()!.weatherCondition) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">날씨</span>
                <span>{{ session()!.weatherCondition }}</span>
              </div>
            }
            @if (session()!.temperature) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">기온</span>
                <span>{{ session()!.temperature }}°C</span>
              </div>
            }
            @if (session()!.notes) {
              <div class="ax-insp-info-row">
                <span class="ax-insp-info-lbl">비고</span>
                <span>{{ session()!.notes }}</span>
              </div>
            }
          </div>
        </div>

        <!-- 점검 현황 -->
        <div class="ax-insp-panel">
          <div class="ax-insp-panel__hdr">
            <mat-icon class="ax-insp-panel__hdr-icon">bar_chart</mat-icon>
            점검 현황
          </div>
          <div class="ax-insp-panel__body ax-insp-stats-grid">
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val">{{ checklistItems().length }}</div>
              <div class="ax-insp-stat__lbl">체크리스트 항목</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--success">{{ passCount() }}</div>
              <div class="ax-insp-stat__lbl">양호</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--danger">{{ failCount() }}</div>
              <div class="ax-insp-stat__lbl">불량</div>
            </div>
            <div class="ax-insp-stat">
              <div class="ax-insp-stat__val ax-insp-stat__val--warn">{{ session()!.defectCount ?? 0 }}</div>
              <div class="ax-insp-stat__lbl">결함 수</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 탭: 체크리스트 / 결함 -->
      <div class="ax-insp-panel ax-insp-panel--mt">
        <mat-tab-group animationDuration="200ms">

          <!-- 체크리스트 탭 -->
          <mat-tab label="체크리스트 ({{ checklistItems().length }})">
            <div class="ax-insp-tab-body">
              @if (canEditChecklist()) {
                <div class="ax-cl-hint">
                  <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">info</mat-icon>
                  항목을 탭하여 결과를 입력하세요.
                  @if (savingChecklist()) { <span class="ax-cl-saving">저장 중...</span> }
                  @else if (lastSaved()) { <span class="ax-cl-saved">저장됨</span> }
                </div>
              }
              @if (checklistItems().length === 0) {
                <div class="ax-insp-empty">
                  <mat-icon>checklist</mat-icon>
                  <p>체크리스트 항목이 없습니다.</p>
                </div>
              } @else {
                @for (item of checklistItems(); track item.id) {
                  <div class="ax-insp-checklist-item"
                       [class.ax-insp-checklist-item--fail]="item.result === 'FAIL'"
                       [class.ax-insp-checklist-item--pass]="item.result === 'PASS'">
                    <div class="ax-insp-checklist-item__left">
                      <mat-icon class="ax-insp-checklist-icon ax-insp-checklist-icon--{{ (item.result ?? 'na').toLowerCase() }}">
                        {{ checklistResultIcon(item.result ?? '') }}
                      </mat-icon>
                      <div class="ax-insp-checklist-item__content">
                        <div class="ax-insp-checklist-item__desc">{{ item.description }}</div>
                        <div class="ax-insp-checklist-item__cat">{{ item.category }}</div>
                        @if (canEditChecklist() && item.result === 'FAIL') {
                          <textarea class="ax-cl-notes-input"
                                    [value]="item.notes ?? ''"
                                    (blur)="onNotesBlur(item.id, $event)"
                                    placeholder="불량 내용을 입력하세요..."></textarea>
                        } @else if (item.notes) {
                          <div class="ax-insp-checklist-item__notes">{{ item.notes }}</div>
                        }
                      </div>
                    </div>
                    <div class="ax-insp-checklist-item__right">
                      @if (canEditChecklist()) {
                        <div class="ax-cl-result-btns">
                          <button class="ax-cl-btn ax-cl-btn--pass"
                                  [class.ax-cl-btn--active]="item.result === 'PASS'"
                                  (click)="setChecklistResult(item.id, 'PASS')"
                                  title="양호">
                            <mat-icon>check</mat-icon>
                          </button>
                          <button class="ax-cl-btn ax-cl-btn--fail"
                                  [class.ax-cl-btn--active]="item.result === 'FAIL'"
                                  (click)="setChecklistResult(item.id, 'FAIL')"
                                  title="불량">
                            <mat-icon>close</mat-icon>
                          </button>
                          <button class="ax-cl-btn ax-cl-btn--na"
                                  [class.ax-cl-btn--active]="item.result === 'N/A'"
                                  (click)="setChecklistResult(item.id, 'N/A')"
                                  title="해당없음">
                            <mat-icon>remove</mat-icon>
                          </button>
                        </div>
                      } @else {
                        <span class="ax-insp-checklist-result ax-insp-checklist-result--{{ (item.result ?? 'na').toLowerCase() }}">
                          {{ checklistResultLabel(item.result ?? '') }}
                        </span>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </mat-tab>

          <!-- 결함 탭 -->
          <mat-tab label="발견 결함 ({{ defects().length }})">
            <div class="ax-insp-tab-body">
              @if (defectsLoading()) {
                <mat-progress-bar mode="indeterminate" />
              } @else if (defects().length === 0) {
                <div class="ax-insp-empty">
                  <mat-icon>report_problem</mat-icon>
                  <p>발견된 결함이 없습니다.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="defects()" class="ax-insp-table">

                  <ng-container matColumnDef="severity">
                    <th mat-header-cell *matHeaderCellDef>심각도</th>
                    <td mat-cell *matCellDef="let d">
                      <span class="ax-insp-severity ax-insp-severity--{{ d.severity.toLowerCase() }}">
                        {{ severityLabel(d.severity) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="defectType">
                    <th mat-header-cell *matHeaderCellDef>유형</th>
                    <td mat-cell *matCellDef="let d">{{ d.defectType }}</td>
                  </ng-container>

                  <ng-container matColumnDef="location">
                    <th mat-header-cell *matHeaderCellDef>위치</th>
                    <td mat-cell *matCellDef="let d">{{ d.locationDescription | slice:0:40 }}</td>
                  </ng-container>

                  <ng-container matColumnDef="repaired">
                    <th mat-header-cell *matHeaderCellDef>조치</th>
                    <td mat-cell *matCellDef="let d">
                      <span class="ax-insp-repair" [class.ax-insp-repair--done]="d.isRepaired"
                        [class.ax-insp-repair--pending]="!d.isRepaired">
                        {{ d.isRepaired ? '완료' : '미조치' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let d">
                      <button mat-icon-button [routerLink]="['/defects', d._id]" matTooltip="결함 상세">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="defectColumns"></tr>
                  <tr mat-row *matRowDef="let d; columns: defectColumns;"></tr>
                </table>
              }
            </div>
          </mat-tab>

          <!-- 미디어 탭 -->
          <mat-tab label="미디어 ({{ mediaItems().length + uploadQueue().length }})">
            <div class="ax-insp-tab-body">
              @if (mediaLoading()) {
                <mat-progress-bar mode="indeterminate" />
              } @else {

                <!-- 드래그&드롭 업로드 존 -->
                @if (!['APPROVED','CANCELLED'].includes(session()!.status)) {
                  <div class="ax-drop-zone"
                       [class.ax-drop-zone--active]="isDragOver()"
                       (click)="fileInput.click()"
                       (dragover)="onDragOver($event)"
                       (dragleave)="onDragLeave($event)"
                       (drop)="onDrop($event)">
                    <mat-icon class="ax-drop-zone__icon">cloud_upload</mat-icon>
                    <div class="ax-drop-zone__text">
                      클릭하거나 사진을 여기에 드래그하세요
                    </div>
                    <div class="ax-drop-zone__sub">JPG, PNG, HEIC — 여러 장 동시 선택 가능</div>
                  </div>
                }

                <!-- 업로드 대기 큐 -->
                @if (uploadQueue().length > 0) {
                  <div class="ax-upload-queue">
                    @for (q of uploadQueue(); track q.id) {
                      <div class="ax-upload-row" [class.ax-upload-row--error]="q.status === 'error'">
                        <mat-icon class="ax-upload-row__icon">
                          {{ q.status === 'done' ? 'check_circle' : q.status === 'error' ? 'error' : 'image' }}
                        </mat-icon>
                        <div class="ax-upload-row__info">
                          <div class="ax-upload-row__name">{{ q.fileName }}</div>
                          <div class="ax-upload-row__size">{{ formatFileSize(q.fileSize) }}</div>
                        </div>
                        @if (q.status === 'uploading') {
                          <mat-progress-bar mode="indeterminate" style="width:80px;flex-shrink:0" />
                        } @else if (q.status === 'error') {
                          <span class="ax-upload-row__err">실패</span>
                        }
                        @if (q.status !== 'uploading') {
                          <button mat-icon-button (click)="removeFromQueue(q.id)" style="width:28px;height:28px">
                            <mat-icon style="font-size:16px;width:16px;height:16px">close</mat-icon>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- 업로드 완료 이미지 갤러리 -->
                @if (mediaItems().length === 0 && uploadQueue().length === 0) {
                  <div class="ax-insp-empty" style="padding-top:var(--ax-spacing-4)">
                    <mat-icon>photo_library</mat-icon>
                    <p>업로드된 사진이 없습니다.</p>
                  </div>
                } @else if (mediaItems().length > 0) {
                  <div class="ax-media-grid">
                    @for (item of mediaItems(); track item._id) {
                      <div class="ax-media-card">
                        <div class="ax-media-card__img-wrap">
                          <img [src]="item.url" [alt]="item.fileName"
                               class="ax-media-card__img"
                               (error)="onImgError($event)"
                               loading="lazy">
                          @if (!['APPROVED','CANCELLED'].includes(session()!.status)) {
                            <button class="ax-media-card__del" (click)="deleteMedia(item._id)" title="삭제">
                              <mat-icon>delete</mat-icon>
                            </button>
                          }
                        </div>
                        <div class="ax-media-card__info">
                          <div class="ax-media-card__name" [title]="item.fileName">{{ item.fileName }}</div>
                          <div class="ax-media-card__date">{{ item.capturedAt | date:'MM/dd HH:mm' }}</div>
                        </div>
                      </div>
                    }
                  </div>
                }

              }
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>
    }
  `,
  styles: [`
    /* ── 헤더 ── */
    .ax-insp-detail-header {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-insp-detail-header__title-wrap { flex: 1; }
    .ax-insp-detail-header__title {
      margin: 0; font-size: var(--ax-font-size-xl);
      font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }

    /* ── 상태 배지 ── */
    .ax-insp-status {
      display: inline-block; padding: 3px 10px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      white-space: nowrap;
    }
    .ax-insp-status--draft          { background: #f5f5f5;                        color: #757575; }
    .ax-insp-status--assigned       { background: #e3f2fd;                        color: #1565c0; }
    .ax-insp-status--planned        { background: var(--ax-color-info-subtle);    color: var(--ax-color-info); }
    .ax-insp-status--in_progress    { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }
    .ax-insp-status--pending_review { background: #f3e5f5; color: #6a1b9a; }
    .ax-insp-status--reviewed       { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-status--submitted      { background: #e8eaf6;                        color: #3949ab; }
    .ax-insp-status--approved       { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-status--completed      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }
    .ax-insp-status--cancelled      { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-tertiary); }

    /* ── 레이아웃 ── */
    .ax-insp-detail-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--ax-spacing-4); margin-bottom: var(--ax-spacing-4);
    }

    /* ── 패널 ── */
    .ax-insp-panel {
      background: var(--ax-color-bg-surface);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-lg); overflow: hidden;
    }
    .ax-insp-panel--mt { margin-top: 0; }
    .ax-insp-panel__hdr {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-3) var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
      border-bottom: 1px solid var(--ax-color-border);
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-panel__hdr-icon {
      font-size: 16px; width: 16px; height: 16px; color: var(--ax-color-text-secondary);
    }
    .ax-insp-panel__body { padding: var(--ax-spacing-4); }
    .ax-insp-tab-body { padding: var(--ax-spacing-4); }

    /* ── 정보 행 ── */
    .ax-insp-info-row {
      display: flex; gap: var(--ax-spacing-4); padding: var(--ax-spacing-2) 0;
      border-bottom: 1px solid var(--ax-color-border-subtle);
      font-size: var(--ax-font-size-sm);
    }
    .ax-insp-info-row:last-child { border-bottom: none; }
    .ax-insp-info-lbl {
      min-width: 100px; font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-secondary); font-weight: var(--ax-font-weight-medium);
    }

    /* ── 통계 ── */
    .ax-insp-stats-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--ax-spacing-3);
    }
    .ax-insp-stat { text-align: center; }
    .ax-insp-stat__val {
      font-size: var(--ax-font-size-2xl); font-weight: var(--ax-font-weight-bold);
      color: var(--ax-color-text-primary);
    }
    .ax-insp-stat__val--success { color: var(--ax-color-success); }
    .ax-insp-stat__val--danger  { color: var(--ax-color-danger); }
    .ax-insp-stat__val--warn    { color: var(--ax-color-warning); }
    .ax-insp-stat__lbl { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 4px; }

    /* ── 체크리스트 ── */
    .ax-insp-checklist-item {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: var(--ax-spacing-3);
      border-bottom: 1px solid var(--ax-color-border-subtle);
    }
    .ax-insp-checklist-item:last-child { border-bottom: none; }
    .ax-insp-checklist-item--fail {
      background: color-mix(in srgb, var(--ax-color-danger-subtle) 40%, transparent);
    }
    .ax-insp-checklist-item__left {
      display: flex; align-items: flex-start; gap: var(--ax-spacing-3); flex: 1;
    }
    .ax-insp-checklist-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .ax-insp-checklist-icon--pass { color: var(--ax-color-success); }
    .ax-insp-checklist-icon--fail { color: var(--ax-color-danger); }
    .ax-insp-checklist-icon--na   { color: var(--ax-color-text-tertiary); }
    .ax-insp-checklist-item__desc { font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium); }
    .ax-insp-checklist-item__cat  { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); margin-top: 2px; }
    .ax-insp-checklist-item__right { text-align: right; }
    .ax-insp-checklist-result { font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold); }
    .ax-insp-checklist-result--pass { color: var(--ax-color-success); }
    .ax-insp-checklist-result--fail { color: var(--ax-color-danger); }
    .ax-insp-checklist-result--na   { color: var(--ax-color-text-tertiary); }
    .ax-insp-checklist-item__notes { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-secondary); margin-top: 4px; }

    /* ── 심각도 배지 ── */
    .ax-insp-severity {
      display: inline-block; padding: 2px 8px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-insp-severity--low      { background: var(--ax-color-bg-surface-alt);  color: var(--ax-color-text-secondary); }
    .ax-insp-severity--medium   { background: var(--ax-color-info-subtle);     color: var(--ax-color-info); }
    .ax-insp-severity--high     { background: var(--ax-color-warning-subtle);  color: var(--ax-color-warning); }
    .ax-insp-severity--critical { background: var(--ax-color-danger-subtle);   color: var(--ax-color-danger); }

    /* ── 조치 배지 ── */
    .ax-insp-repair {
      display: inline-block; padding: 2px 8px; border-radius: var(--ax-radius-full);
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
    }
    .ax-insp-repair--done    { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-insp-repair--pending { background: var(--ax-color-warning-subtle); color: var(--ax-color-warning); }

    /* ── 테이블 ── */
    .ax-insp-table { width: 100%; }
    th.mat-mdc-header-cell {
      font-size: var(--ax-font-size-xs); font-weight: var(--ax-font-weight-semibold);
      color: var(--ax-color-text-secondary);
    }
    td.mat-mdc-cell { font-size: var(--ax-font-size-sm); padding: var(--ax-spacing-1) var(--ax-spacing-2); }

    /* ── 빈 상태 ── */
    .ax-insp-empty {
      text-align: center; padding: var(--ax-spacing-6); color: var(--ax-color-text-tertiary);
    }
    .ax-insp-empty mat-icon {
      font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto var(--ax-spacing-2);
    }
    .ax-insp-empty p { margin: 0; font-size: var(--ax-font-size-sm); }

    /* ── 체크리스트 편집 UI ── */
    .ax-cl-hint {
      display: flex; align-items: center; gap: 6px;
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      background: var(--ax-color-info-subtle);
      border-radius: var(--ax-radius-md);
      margin-bottom: var(--ax-spacing-3);
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-info);
    }
    .ax-cl-saving { margin-left: auto; font-style: italic; opacity: .7; }
    .ax-cl-saved  { margin-left: auto; color: var(--ax-color-success); font-weight: 600; }

    .ax-insp-checklist-item--pass {
      background: color-mix(in srgb, var(--ax-color-success-subtle) 30%, transparent);
    }
    .ax-insp-checklist-item__content { flex: 1; }

    .ax-cl-result-btns {
      display: flex; gap: 4px; align-items: center;
    }
    .ax-cl-btn {
      width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; background: var(--ax-color-bg-surface-alt);
      color: var(--ax-color-text-tertiary); transition: all .15s ease;
    }
    .ax-cl-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .ax-cl-btn:hover { transform: scale(1.1); }

    .ax-cl-btn--pass:hover        { background: var(--ax-color-success-subtle); color: var(--ax-color-success); }
    .ax-cl-btn--pass.ax-cl-btn--active {
      background: var(--ax-color-success); color: #fff;
      border-color: var(--ax-color-success);
    }
    .ax-cl-btn--fail:hover        { background: var(--ax-color-danger-subtle); color: var(--ax-color-danger); }
    .ax-cl-btn--fail.ax-cl-btn--active {
      background: var(--ax-color-danger); color: #fff;
      border-color: var(--ax-color-danger);
    }
    .ax-cl-btn--na:hover          { background: var(--ax-color-bg-surface-alt); color: var(--ax-color-text-secondary); }
    .ax-cl-btn--na.ax-cl-btn--active {
      background: var(--ax-color-text-tertiary); color: #fff;
      border-color: var(--ax-color-text-tertiary);
    }

    .ax-cl-notes-input {
      display: block; width: 100%; margin-top: var(--ax-spacing-2);
      padding: var(--ax-spacing-2); border-radius: var(--ax-radius-sm);
      border: 1px solid var(--ax-color-border);
      font-size: var(--ax-font-size-xs); font-family: inherit;
      resize: vertical; min-height: 56px;
      background: var(--ax-color-bg-surface); color: var(--ax-color-text-primary);
      box-sizing: border-box;
    }
    .ax-cl-notes-input:focus {
      outline: none; border-color: var(--ax-color-primary);
    }

    /* ── 드래그&드롭 존 ── */
    .ax-drop-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-6) var(--ax-spacing-4);
      border: 2px dashed var(--ax-color-border);
      border-radius: var(--ax-radius-lg);
      cursor: pointer; transition: all .2s ease;
      margin-bottom: var(--ax-spacing-4);
      background: var(--ax-color-bg-surface-alt);
    }
    .ax-drop-zone:hover, .ax-drop-zone--active {
      border-color: var(--ax-color-primary);
      background: color-mix(in srgb, var(--ax-color-primary) 5%, var(--ax-color-bg-surface-alt));
    }
    .ax-drop-zone__icon {
      font-size: 36px; width: 36px; height: 36px;
      color: var(--ax-color-text-tertiary);
    }
    .ax-drop-zone--active .ax-drop-zone__icon { color: var(--ax-color-primary); }
    .ax-drop-zone__text {
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-secondary);
    }
    .ax-drop-zone__sub {
      font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary);
    }

    /* ── 업로드 큐 ── */
    .ax-upload-queue {
      display: flex; flex-direction: column; gap: var(--ax-spacing-2);
      margin-bottom: var(--ax-spacing-4);
    }
    .ax-upload-row {
      display: flex; align-items: center; gap: var(--ax-spacing-2);
      padding: var(--ax-spacing-2) var(--ax-spacing-3);
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-md);
    }
    .ax-upload-row--error { border-color: var(--ax-color-danger); }
    .ax-upload-row__icon { font-size: 18px; width: 18px; height: 18px; color: var(--ax-color-text-tertiary); flex-shrink: 0; }
    .ax-upload-row__info { flex: 1; min-width: 0; }
    .ax-upload-row__name {
      font-size: var(--ax-font-size-sm); font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ax-upload-row__size { font-size: var(--ax-font-size-xs); color: var(--ax-color-text-tertiary); }
    .ax-upload-row__err  { font-size: var(--ax-font-size-xs); color: var(--ax-color-danger); flex-shrink: 0; }

    /* ── 미디어 그리드 ── */
    .ax-media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--ax-spacing-3);
    }
    .ax-media-card {
      background: var(--ax-color-bg-surface-alt);
      border: 1px solid var(--ax-color-border);
      border-radius: var(--ax-radius-md);
      overflow: hidden;
    }
    .ax-media-card__img-wrap {
      width: 100%; aspect-ratio: 4/3; overflow: hidden;
      background: var(--ax-color-bg-surface);
    }
    .ax-media-card__img {
      width: 100%; height: 100%; object-fit: cover;
      display: block;
    }
    .ax-media-card__info {
      padding: var(--ax-spacing-2);
    }
    .ax-media-card__name {
      font-size: var(--ax-font-size-xs);
      font-weight: var(--ax-font-weight-medium);
      color: var(--ax-color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ax-media-card__date {
      font-size: var(--ax-font-size-xs);
      color: var(--ax-color-text-tertiary);
      margin-top: 2px;
    }
    .ax-media-card__del {
      position: absolute; top: 4px; right: 4px;
      width: 28px; height: 28px; border-radius: 50%; border: none;
      background: rgba(0,0,0,.55); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .15s ease;
    }
    .ax-media-card__img-wrap { position: relative; }
    .ax-media-card__img-wrap:hover .ax-media-card__del { opacity: 1; }
    .ax-media-card__del mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class SessionDetailComponent implements OnInit {
  private readonly http       = inject(HttpClient);
  private readonly route      = inject(ActivatedRoute);
  private readonly usersSvc   = inject(UsersApiService);
  private readonly buildSvc   = inject(BuildingsService);
  private readonly authStore  = inject(AuthStore);
  private readonly snackBar   = inject(MatSnackBar);

  readonly session        = signal<InspectionSession | null>(null);
  readonly defects        = signal<Defect[]>([]);
  readonly mediaItems       = signal<(DefectMedia & { url: string })[]>([]);
  readonly uploadQueue      = signal<{ id: string; fileName: string; fileSize: number; status: 'uploading' | 'done' | 'error' }[]>([]);
  readonly isDragOver       = signal(false);
  readonly loading          = signal(true);
  readonly defectsLoading   = signal(false);
  readonly mediaLoading     = signal(false);
  readonly submitting       = signal(false);
  readonly uploading        = signal(false);
  readonly savingChecklist  = signal(false);
  readonly lastSaved        = signal(false);

  private readonly userMap     = signal<Map<string, string>>(new Map());
  private readonly buildingMap = signal<Map<string, string>>(new Map());

  defectColumns = ['severity', 'defectType', 'location', 'repaired', 'actions'];

  readonly checklistItems     = computed(() => this.session()?.checklistItems ?? []);
  readonly passCount          = computed(() => this.checklistItems().filter((i) => i.result === 'PASS').length);
  readonly failCount          = computed(() => this.checklistItems().filter((i) => i.result === 'FAIL').length);
  readonly canEditChecklist   = computed(() =>
    ['DRAFT', 'ASSIGNED', 'IN_PROGRESS'].includes(this.session()?.status ?? ''),
  );

  ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    const orgId = this.authStore.user()?.organizationId ?? '';

    // 사용자 맵 로드
    this.usersSvc.list(orgId).subscribe({
      next: (list) => this.userMap.set(new Map(list.map((u) => [u._id, u.name]))),
      error: () => { /* 권한 없을 경우 조용히 무시 */ },
    });

    this.http.get<any>(`${environment.apiUrl}/projects/sessions/${encodeURIComponent(sessionId)}`).subscribe({
      next: (res) => {
        const sess: InspectionSession = res.data ?? res;
        this.session.set(sess);
        this.loading.set(false);
        this.loadDefects(sessionId);

        // 건물 맵 로드 (complexId 기반)
        if (sess.complexId) {
          this.buildSvc.listByComplex(sess.complexId).subscribe((list) => {
            this.buildingMap.set(new Map(list.map((b) => [b._id, b.name])));
          });
        }

        // 미디어 로드
        this.loadMedia(sessionId);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadMedia(sessionId: string) {
    this.mediaLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/media/by-session/${encodeURIComponent(sessionId)}`).subscribe({
      next: (res) => { this.mediaItems.set(res.data ?? res); this.mediaLoading.set(false); },
      error: () => this.mediaLoading.set(false),
    });
  }

  // ── 미디어 업로드 ────────────────────────────────────────────

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.uploadFiles(files);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length) this.uploadFiles(files);
  }

  private uploadFiles(files: File[]) {
    const sess = this.session();
    if (!sess) return;
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;

    files.forEach((file) => {
      const queueId = `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this.uploadQueue.update((q) => [
        ...q, { id: queueId, fileName: file.name, fileSize: file.size, status: 'uploading' },
      ]);

      const form = new FormData();
      form.append('file', file);
      form.append('entityType', 'inspectionSession');
      form.append('entityId', sessionId);
      form.append('complexId', sess.complexId);

      this.http.post<any>(`${environment.apiUrl}/media/upload/direct`, form).subscribe({
        next: (res) => {
          const media: DefectMedia & { url: string } = res.data ?? res;
          this.mediaItems.update((items) => [...items, media]);
          this.uploadQueue.update((q) =>
            q.map((item) => item.id === queueId ? { ...item, status: 'done' } : item),
          );
          // 2초 후 큐에서 제거
          setTimeout(() => this.removeFromQueue(queueId), 2000);
        },
        error: () => {
          this.uploadQueue.update((q) =>
            q.map((item) => item.id === queueId ? { ...item, status: 'error' } : item),
          );
        },
      });
    });
  }

  removeFromQueue(queueId: string) {
    this.uploadQueue.update((q) => q.filter((item) => item.id !== queueId));
  }

  deleteMedia(mediaId: string) {
    this.http.delete<any>(`${environment.apiUrl}/media/${encodeURIComponent(mediaId)}`).subscribe({
      next: () => {
        this.mediaItems.update((items) => items.filter((m) => m._id !== mediaId));
        this.snackBar.open('사진이 삭제되었습니다.', '닫기', { duration: 2000 });
      },
      error: () => this.snackBar.open('삭제에 실패했습니다.', '닫기', { duration: 3000 }),
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── 체크리스트 편집 ────────────────────────────────────────────

  setChecklistResult(itemId: string, result: 'PASS' | 'FAIL' | 'N/A') {
    const sess = this.session();
    if (!sess) return;
    const updated = sess.checklistItems.map((i) =>
      i.id === itemId ? { ...i, result } : i,
    );
    this.session.set({ ...sess, checklistItems: updated });
    this.saveChecklist(updated);
  }

  onNotesBlur(itemId: string, event: FocusEvent) {
    const notes = (event.target as HTMLTextAreaElement).value.trim();
    const sess = this.session();
    if (!sess) return;
    const updated = sess.checklistItems.map((i) =>
      i.id === itemId ? { ...i, notes: notes || undefined } : i,
    );
    this.session.set({ ...sess, checklistItems: updated });
    this.saveChecklist(updated);
  }

  private saveChecklist(items: ReturnType<typeof this.checklistItems>) {
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    this.savingChecklist.set(true);
    this.lastSaved.set(false);
    this.http.patch<any>(
      `${environment.apiUrl}/projects/sessions/${encodeURIComponent(sessionId)}/checklist`,
      { items: items.map((i) => ({ id: i.id, result: i.result, notes: i.notes })) },
    ).subscribe({
      next: (res) => {
        const sess: InspectionSession = res.data ?? res;
        this.session.set(sess);
        this.savingChecklist.set(false);
        this.lastSaved.set(true);
        setTimeout(() => this.lastSaved.set(false), 2000);
      },
      error: () => {
        this.savingChecklist.set(false);
        this.snackBar.open('체크리스트 저장에 실패했습니다.', '닫기', { duration: 3000 });
      },
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"%3E%3Crect fill="%23f5f5f5" width="160" height="120"/%3E%3Ctext x="80" y="65" text-anchor="middle" fill="%23bdbdbd" font-size="12"%3E이미지 없음%3C/text%3E%3C/svg%3E';
  }

  private loadDefects(sessionId: string) {
    this.defectsLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/defects?sessionId=${encodeURIComponent(sessionId)}&limit=100`).subscribe({
      next: (res) => { this.defects.set(res.data ?? []); this.defectsLoading.set(false); },
      error: () => this.defectsLoading.set(false),
    });
  }

  userName(id: string | undefined): string {
    if (!id) return '미배정';
    return this.userMap().get(id) ?? '미배정';
  }

  buildingName(id: string | undefined): string {
    if (!id) return '-';
    return this.buildingMap().get(id) ?? id;
  }

  statusLabel(s: string)           { return STATUS_LABELS[s] ?? s; }
  severityLabel(s: string)         { return SEVERITY_LABELS[s] ?? s; }
  checklistResultLabel(r: string)  { return (CHECKLIST_RESULT_LABELS[r] ?? r) || '미입력'; }
  checklistResultIcon(r: string)   { return CHECKLIST_RESULT_ICONS[r] ?? 'help'; }

  updateStatus(newStatus: string) {
    const sess = this.session();
    if (!sess) return;
    this.submitting.set(true);
    const sessionId = this.route.snapshot.paramMap.get('sessionId')!;
    this.http.patch<any>(
      `${environment.apiUrl}/projects/sessions/${encodeURIComponent(sessionId)}/status`,
      { status: newStatus },
    ).subscribe({
      next: (res) => {
        const updated: Partial<InspectionSession> = res.data ?? res;
        this.session.set({ ...sess, ...updated });
        this.submitting.set(false);
        this.snackBar.open('세션 상태가 변경되었습니다.', '닫기', { duration: 2000 });
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message ?? '상태 변경에 실패했습니다.';
        this.snackBar.open(msg, '닫기', { duration: 3000 });
      },
    });
  }
}
