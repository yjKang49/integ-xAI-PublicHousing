// apps/admin-web/src/app/features/complaints/components/routing-suggestion-card.component.ts
// 단일 라우팅 추천 카드 컴포넌트 — triage-result-panel 또는 독립 사용
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

export interface RoutingSuggestionItem {
  type: 'USER' | 'TEAM';
  targetId: string;
  targetName: string;
  reason: string;
  confidence: number;
}

@Component({
  selector: 'ax-routing-suggestion-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatChipsModule,
  ],
  template: `
    <div class="suggestion-card" [class.top-pick]="rank === 0" [class.selected]="selected">
      <!-- 순위 배지 -->
      <div class="rank-badge" [class.rank-first]="rank === 0">
        {{ rank === 0 ? '최우선' : '#' + (rank + 1) }}
      </div>

      <!-- 대상 정보 -->
      <div class="card-body">
        <div class="target-row">
          <mat-icon class="target-icon">{{ suggestion.type === 'USER' ? 'person' : 'groups' }}</mat-icon>
          <span class="target-name">{{ suggestion.targetName }}</span>
          <mat-chip size="small" [style.background]="getConfidenceColor(suggestion.confidence)">
            {{ (suggestion.confidence * 100).toFixed(0) }}%
          </mat-chip>
        </div>

        <p class="reason-text">{{ suggestion.reason }}</p>

        <!-- 신뢰도 바 -->
        <div class="confidence-bar-container" matTooltip="AI 추천 신뢰도">
          <div
            class="confidence-bar"
            [style.width.%]="suggestion.confidence * 100"
            [style.background]="getConfidenceColor(suggestion.confidence)"
          ></div>
        </div>
      </div>

      <!-- 배정 버튼 -->
      @if (showAssignButton) {
        <button
          mat-stroked-button
          [color]="selected ? 'primary' : ''"
          class="assign-btn"
          (click)="onAssign()"
          [matTooltip]="selected ? '배정 선택됨' : '이 담당자로 배정'"
        >
          <mat-icon>{{ selected ? 'check' : 'person_add' }}</mat-icon>
          {{ selected ? '선택됨' : '배정' }}
        </button>
      }
    </div>
  `,
  styles: [`
    .suggestion-card {
      display: flex; align-items: center; gap: 12px;
      border: 1px solid #e0e0e0; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 8px;
      background: #fff; transition: all 0.2s;
    }
    .suggestion-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .suggestion-card.top-pick { border-color: #7c4dff; background: #f9f5ff; }
    .suggestion-card.selected { border-color: #1976d2; background: #e3f2fd; }
    .rank-badge {
      min-width: 52px; text-align: center;
      font-size: 11px; font-weight: 700;
      padding: 4px 6px; border-radius: 6px;
      background: #f5f5f5; color: #616161;
    }
    .rank-badge.rank-first { background: #ede7f6; color: #4527a0; }
    .card-body { flex: 1; min-width: 0; }
    .target-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .target-icon { font-size: 18px; color: #666; }
    .target-name { font-weight: 600; font-size: 14px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .reason-text { margin: 0 0 6px; font-size: 12px; color: #777; line-height: 1.4; }
    .confidence-bar-container {
      height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;
    }
    .confidence-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
    .assign-btn { min-width: 80px; flex-shrink: 0; }
  `],
})
export class RoutingSuggestionCardComponent {
  @Input() suggestion!: RoutingSuggestionItem;
  @Input() rank = 0;
  @Input() selected = false;
  @Input() showAssignButton = true;
  @Output() assign = new EventEmitter<RoutingSuggestionItem>();

  onAssign() {
    this.assign.emit(this.suggestion);
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#9e9e9e';
  }
}
