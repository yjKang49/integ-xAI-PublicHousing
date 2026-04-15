// apps/mobile-app/src/app/core/sync/pouch.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import PouchDB from 'pouchdb-browser';
import PouchDBFind from 'pouchdb-find';
import { BehaviorSubject, Observable } from 'rxjs';

PouchDB.plugin(PouchDBFind);

export type SyncPhase = 'idle' | 'active' | 'paused' | 'error' | 'denied' | 'complete';

export interface SyncState {
  phase: SyncPhase;
  pendingCount: number;
  lastSyncAt: string | null;
  errorMessage?: string;
  pullProgress?: { completed: number; total: number };
  pushProgress?: { completed: number; total: number };
}

@Injectable({ providedIn: 'root' })
export class PouchService implements OnDestroy {
  private db!: PouchDB.Database;
  private syncHandler: PouchDB.Replication.Sync<any> | null = null;

  private readonly syncState$ = new BehaviorSubject<SyncState>({
    phase: 'idle',
    pendingCount: 0,
    lastSyncAt: null,
  });

  get syncState(): Observable<SyncState> {
    return this.syncState$.asObservable();
  }

  get database(): PouchDB.Database {
    return this.db;
  }

  /**
   * Initialize local PouchDB and start live replication.
   * Called after login with inspector credentials.
   */
  initialize(
    remoteUrl: string,
    authToken: string,
    inspectorId: string,
    complexIds: string[],
  ) {
    // Close existing DB if re-initializing
    if (this.db) {
      this.stopSync();
      this.db.close();
    }

    this.db = new PouchDB('ax_local', {
      auto_compaction: true,
      revs_limit: 5,
    });

    // Create local indexes
    this.createIndexes().then(() => {
      this.startSync(remoteUrl, authToken, inspectorId, complexIds);
    });
  }

  private async createIndexes() {
    const { LOCAL_INDEXES } = await import('./local-schema');
    for (const idx of LOCAL_INDEXES) {
      try { await this.db.createIndex(idx as any); } catch {}
    }
  }

  /**
   * Start live bidirectional sync with CouchDB.
   */
  private startSync(
    remoteUrl: string,
    authToken: string,
    inspectorId: string,
    complexIds: string[],
  ) {
    const remoteDb = new PouchDB(remoteUrl, {
      fetch: (url: any, opts: any) => {
        opts.headers = opts.headers || {};
        opts.headers['Authorization'] = `Bearer ${authToken}`;
        return PouchDB.fetch(url, opts);
      },
    });

    this.syncState$.next({ ...this.syncState$.value, phase: 'active' });

    this.syncHandler = this.db.sync(remoteDb, {
      live: true,
      retry: true,
      filter: 'sync/inspectorFilter',
      query_params: {
        inspectorId,
        complexIds: complexIds.join(','),
      },
      batch_size: 50,
      batches_limit: 3,
      back_off_function: (delay: number) => (delay === 0 ? 1000 : Math.min(delay * 1.5, 30000)),
    } as any);

    this.syncHandler
      .on('change', (info: any) => {
        this.updatePending();
        this.syncState$.next({
          ...this.syncState$.value,
          phase: 'active',
          pullProgress: info.direction === 'pull' ? {
            completed: info.change.docs_read,
            total: info.change.pending ?? info.change.docs_read,
          } : this.syncState$.value.pullProgress,
          pushProgress: info.direction === 'push' ? {
            completed: info.change.docs_written,
            total: info.change.docs_written,
          } : this.syncState$.value.pushProgress,
        });
      })
      .on('paused', () => {
        this.syncState$.next({
          ...this.syncState$.value,
          phase: 'paused',
          lastSyncAt: new Date().toISOString(),
        });
        this.updatePending();
      })
      .on('active', () => {
        this.syncState$.next({ ...this.syncState$.value, phase: 'active' });
      })
      .on('denied', (err: any) => {
        this.syncState$.next({
          ...this.syncState$.value,
          phase: 'denied',
          errorMessage: err.message,
        });
      })
      .on('error', (err: any) => {
        this.syncState$.next({
          ...this.syncState$.value,
          phase: 'error',
          errorMessage: err?.message ?? 'Sync error',
        });
      });
  }

  stopSync() {
    this.syncHandler?.cancel();
    this.syncHandler = null;
    this.syncState$.next({ ...this.syncState$.value, phase: 'idle' });
  }

  private async updatePending() {
    try {
      const result = await this.db.find({
        selector: { syncStatus: 'PENDING' },
        fields: ['_id'],
        limit: 1000,
      });
      this.syncState$.next({
        ...this.syncState$.value,
        pendingCount: result.docs.length,
      });
    } catch {}
  }

  // ────────────────────────────────────────────────
  // CRUD helpers
  // ────────────────────────────────────────────────

  async create<T extends { _id: string }>(doc: T): Promise<T & { _rev: string }> {
    const result = await this.db.put({ ...doc, syncStatus: 'PENDING', localModifiedAt: new Date().toISOString() });
    return { ...doc, _rev: result.rev };
  }

  async get<T>(id: string): Promise<T | null> {
    try {
      return await this.db.get(id) as T;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  async update<T extends { _id: string; _rev?: string }>(doc: T): Promise<T & { _rev: string }> {
    const result = await this.db.put({
      ...doc,
      syncStatus: 'PENDING',
      localModifiedAt: new Date().toISOString(),
    });
    return { ...doc, _rev: result.rev };
  }

  async find<T>(selector: PouchDB.Find.Selector, options?: {
    limit?: number;
    skip?: number;
    sort?: Array<string | Record<string, 'asc' | 'desc'>>;
    fields?: string[];
  }): Promise<T[]> {
    const result = await this.db.find({
      selector: { ...selector, _deleted: { $ne: true } },
      limit: options?.limit ?? 50,
      skip: options?.skip ?? 0,
      ...(options?.sort && { sort: options.sort }),
      ...(options?.fields && { fields: options.fields }),
    });
    return result.docs as T[];
  }

  /**
   * Save a photo as PouchDB attachment (offline mode).
   * Syncs as CouchDB attachment on next replication,
   * then the server worker uploads it to S3.
   */
  async saveAttachment(
    docId: string,
    docRev: string,
    attachmentId: string,
    blob: Blob,
  ): Promise<string> {
    const result = await this.db.putAttachment(docId, attachmentId, docRev, blob, blob.type);
    return result.rev;
  }

  /**
   * Retrieve a PouchDB attachment blob by docId + attachmentId.
   * Returns null if the attachment doesn't exist.
   */
  async getAttachment(docId: string, attachmentId: string): Promise<Blob | null> {
    try {
      const blob = await this.db.getAttachment(docId, attachmentId);
      return blob as Blob;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Count documents matching a selector (for queue stats).
   */
  async count(selector: PouchDB.Find.Selector): Promise<number> {
    const result = await this.db.find({
      selector: { ...selector, _deleted: { $ne: true } },
      fields: ['_id'],
      limit: 10_000,
    });
    return result.docs.length;
  }

  ngOnDestroy() {
    this.stopSync();
    this.db?.close();
  }
}
