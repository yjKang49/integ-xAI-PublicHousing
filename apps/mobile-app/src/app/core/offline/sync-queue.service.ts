/**
 * sync-queue.service.ts — Phase 1 MVP skeleton
 *
 * Responsibilities:
 *   - Watch network status
 *   - On reconnect: drain the media upload queue stored in PouchDB
 *   - For each PENDING SyncQueueItem:
 *       1. Read attachment blob from PouchDB
 *       2. Call MediaUploadService.uploadPhoto()
 *       3. Mark SyncQueueItem as DONE / ERROR
 *       4. Update defectMedia.storageKey in PouchDB
 *
 * Phase 2 (not implemented here):
 *   - Bidirectional conflict resolution
 *   - Background periodic retry with exponential back-off
 *   - Push notification on sync complete
 */

import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { PouchService } from '../sync/pouch.service';
import { MediaUploadService } from '../media/media-upload.service';
import { AuthStore } from '../store/auth.store';
import { SyncQueueItem } from './local-doc-types';

export interface QueueStats {
  pending: number;
  done: number;
  error: number;
  isProcessing: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class SyncQueueService implements OnDestroy {
  private readonly pouch = inject(PouchService);
  private readonly mediaUpload = inject(MediaUploadService);
  private readonly authStore = inject(AuthStore);

  private readonly stats$ = new BehaviorSubject<QueueStats>({
    pending: 0, done: 0, error: 0, isProcessing: false,
  });

  get stats() { return this.stats$.asObservable(); }

  private isProcessing = false;
  private networkSub: any;

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────

  start() {
    // Listen for network reconnection
    const online$ = fromEvent(window, 'online');
    this.networkSub = online$.subscribe(() => this.drainQueue());

    // Run immediately if already online
    if (navigator.onLine) this.drainQueue();
  }

  ngOnDestroy() {
    this.networkSub?.unsubscribe?.();
  }

  // ─────────────────────────────────────────────────────────────────
  // Enqueue a media upload (called by DefectFormComponent offline path)
  // ─────────────────────────────────────────────────────────────────

  async enqueue(item: Omit<SyncQueueItem, '_id' | 'docType' | 'queueType' | 'status' |
    'retryCount' | 'maxRetries' | 'lastAttemptAt' | 'errorMessage' |
    'syncStatus' | 'localModifiedAt'>): Promise<SyncQueueItem> {
    const now = new Date().toISOString();
    const queueItem: SyncQueueItem = {
      _id: `syncQueue:${item.orgId}:mq_${Date.now()}_${uuid().slice(0, 8)}`,
      docType: 'syncQueue',
      queueType: 'mediaUpload',
      ...item,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      lastAttemptAt: null,
      errorMessage: null,
      createdAt: now,
      syncStatus: 'PENDING',
      localModifiedAt: now,
    };

    await this.pouch.create(queueItem);
    await this.refreshStats();
    return queueItem;
  }

  // ─────────────────────────────────────────────────────────────────
  // Drain — process all PENDING items
  // ─────────────────────────────────────────────────────────────────

  async drainQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;
    this.isProcessing = true;
    this.stats$.next({ ...this.stats$.value, isProcessing: true });

    try {
      const items = await this.getPendingItems();
      for (const item of items) {
        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
      await this.refreshStats();
      this.stats$.next({ ...this.stats$.value, isProcessing: false });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Process a single queue item
  // ─────────────────────────────────────────────────────────────────

  private async processItem(item: SyncQueueItem): Promise<void> {
    if (item.retryCount >= item.maxRetries) {
      await this.markError(item, 'Max retries exceeded');
      return;
    }

    // Mark as UPLOADING
    await this.updateItem(item, { status: 'UPLOADING', lastAttemptAt: new Date().toISOString() });

    try {
      // Read blob from PouchDB attachment
      const blob = await this.pouch.getAttachment(item.mediaId, item.attachmentKey);
      if (!blob) throw new Error('Attachment blob not found in PouchDB');

      // Upload to S3 via API
      const result = await this.mediaUpload.uploadPhoto(blob, {
        fileName: item.fileName,
        defectId: item.defectId,
        complexId: item.complexId,
      });

      if (!result.success) throw new Error(result.error ?? 'Upload failed');

      // Update defectMedia doc's uploadStatus in PouchDB
      const mediaDoc = await this.pouch.get<any>(item.mediaId);
      if (mediaDoc) {
        await this.pouch.update({ ...mediaDoc, uploadStatus: 'UPLOADED', localModifiedAt: new Date().toISOString() });
      }

      // Mark queue item as DONE
      await this.updateItem(item, { status: 'DONE' });
    } catch (err: any) {
      const retryCount = item.retryCount + 1;
      if (retryCount >= item.maxRetries) {
        await this.markError(item, err?.message ?? 'Unknown error');
      } else {
        await this.updateItem(item, {
          status: 'PENDING',
          retryCount,
          errorMessage: err?.message ?? null,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────

  private async getPendingItems(): Promise<SyncQueueItem[]> {
    return this.pouch.find<SyncQueueItem>(
      { docType: 'syncQueue', queueType: 'mediaUpload', status: 'PENDING' },
      { sort: [{ createdAt: 'asc' }], limit: 50 },
    );
  }

  private async updateItem(item: SyncQueueItem, patch: Partial<SyncQueueItem>) {
    const current = await this.pouch.get<SyncQueueItem>(item._id);
    if (!current) return;
    await this.pouch.update({ ...current, ...patch, localModifiedAt: new Date().toISOString() });
  }

  private async markError(item: SyncQueueItem, errorMessage: string) {
    await this.updateItem(item, { status: 'ERROR', errorMessage });
  }

  private async refreshStats() {
    const [pending, done, error] = await Promise.all([
      this.pouch.find<SyncQueueItem>({ docType: 'syncQueue', queueType: 'mediaUpload', status: 'PENDING' }, { fields: ['_id'], limit: 1000 }),
      this.pouch.find<SyncQueueItem>({ docType: 'syncQueue', queueType: 'mediaUpload', status: 'DONE' }, { fields: ['_id'], limit: 1000 }),
      this.pouch.find<SyncQueueItem>({ docType: 'syncQueue', queueType: 'mediaUpload', status: 'ERROR' }, { fields: ['_id'], limit: 1000 }),
    ]);
    this.stats$.next({
      pending: pending.length,
      done: done.length,
      error: error.length,
      isProcessing: this.isProcessing,
    });
  }
}
