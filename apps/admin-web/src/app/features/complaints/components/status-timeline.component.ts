// apps/admin-web/src/app/features/complaints/components/status-timeline.component.ts
/**
 * StatusTimelineComponent
 *
 * Reusable horizontal stepper + vertical event log for complaint/work-order status flow.
 * Pure dumb component — all data via inputs.
 */
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComplaintEvent, ComplaintStatus } from '@ax/shared';
import {
  COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_STEPS,
} from '@ax/shared';

@Component({
  selector: 'ax-status-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <!-- Horizontal progress stepper -->
    <div class="stepper">
      @for (step of steps; track step; let i = $index; let last = $last) {
        <div class="step"
          [class.completed]="isCompleted(step)"
          [class.current]="currentStatus() === step">
          <div class="step-circle" [matTooltip]="stepDate(step) | date:'yyyy-MM-dd HH:mm'">
            @if (isCompleted(step)) {
              <mat-icon>check</mat-icon>
            } @else {
              <span>{{ i + 1 }}</span>
            }
          </div>
          <div class="step-label">{{ label(step) }}</div>
          @if (stepDate(step)) {
            <div class="step-date">{{ stepDate(step) | date:'MM/dd' }}</div>
          }
        </div>
        @if (!last) {
          <div class="connector" [class.filled]="isCompleted(step)"></div>
        }
      }
    </div>

    <!-- Vertical event log -->
    @if (events().length > 0) {
      <div class="event-log">
        @for (e of events(); track e.timestamp; let last = $last) {
          <div class="event-item">
            <div class="event-left">
              <div class="dot" [style.background]="dotColor(e.toStatus)"></div>
              @if (!last) { <div class="line"></div> }
            </div>
            <div class="event-body">
              <div class="event-header">
                <span class="event-action">
                  @if (e.fromStatus) {
                    <span class="from">{{ label(e.fromStatus) }}</span>
                    <mat-icon class="arrow">arrow_forward</mat-icon>
                  }
                  <span class="to">{{ label(e.toStatus) }}</span>
                </span>
                <span class="event-time">{{ e.timestamp | date:'MM/dd HH:mm' }}</span>
              </div>
              <div class="event-actor">by {{ e.actorId }}</div>
              @if (e.notes) {
                <div class="event-notes">{{ e.notes }}</div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* Stepper */
    .stepper {
      display: flex; align-items: flex-start; padding: 12px 0;
      overflow-x: auto; gap: 0;
    }
    .step { display: flex; flex-direction: column; align-items: center; min-width: 72px; }
    .step-circle {
      width: 32px; height: 32px; border-radius: 50%; border: 2px solid #ddd;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600; background: white; cursor: default;
      transition: all 0.2s;
    }
    .step.completed .step-circle { background: #4caf50; border-color: #4caf50; color: white; }
    .step.current   .step-circle { background: #1976d2; border-color: #1976d2; color: white; }
    .step-label { font-size: 10px; text-align: center; margin-top: 6px; color: #666; max-width: 68px; }
    .step-date  { font-size: 9px; color: #999; margin-top: 2px; }
    .connector  { flex: 1; height: 2px; background: #e0e0e0; margin: 16px 2px 0; min-width: 16px; }
    .connector.filled { background: #4caf50; }

    /* Event log */
    .event-log { margin-top: 16px; }
    .event-item { display: flex; gap: 10px; min-height: 52px; }
    .event-left { display: flex; flex-direction: column; align-items: center; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
    .line { flex: 1; width: 2px; background: #eee; margin: 3px 0; }
    .event-body { flex: 1; padding-bottom: 12px; }
    .event-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; }
    .event-action { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
    .from  { color: #aaa; }
    .to    { color: #333; }
    .arrow { font-size: 12px; height: 12px; width: 12px; color: #bbb; }
    .event-time  { font-size: 11px; color: #999; white-space: nowrap; }
    .event-actor { font-size: 10px; color: #aaa; margin: 1px 0 3px; }
    .event-notes {
      font-size: 11px; color: #555;
      background: #f8f8f8; border-left: 3px solid #e0e0e0;
      padding: 4px 8px; border-radius: 0 4px 4px 0;
    }
  `],
})
export class StatusTimelineComponent {
  readonly currentStatus = input.required<string>();
  readonly events        = input<ComplaintEvent[]>([]);

  readonly steps = COMPLAINT_STATUS_STEPS.filter((s) => s !== ComplaintStatus.RECEIVED);

  label(status: string): string {
    return COMPLAINT_STATUS_LABELS[status] ?? status;
  }

  isCompleted(step: string): boolean {
    const order = this.steps.map((s) => s as string);
    const curIdx  = order.indexOf(this.currentStatus());
    const stepIdx = order.indexOf(step);
    return stepIdx >= 0 && stepIdx < curIdx;
  }

  stepDate(step: string): string | null {
    const ev = [...this.events()].reverse().find((e) => e.toStatus === step);
    return ev?.timestamp ?? null;
  }

  dotColor(status: string): string {
    const map: Record<string, string> = {
      OPEN: '#90caf9', RECEIVED: '#90caf9', TRIAGED: '#ce93d8',
      ASSIGNED: '#a5d6a7', IN_PROGRESS: '#ffcc80',
      RESOLVED: '#9c27b0', CLOSED: '#9e9e9e',
    };
    return map[status] ?? '#ccc';
  }
}
