// apps/api/src/database/couch.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as nano from 'nano';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';

/**
 * CouchDB service — wraps nano library.
 * Provides per-org database access and utility query helpers.
 *
 * Database naming convention: ax_{orgId}_{env}
 */
@Injectable()
export class CouchService implements OnModuleInit {
  private readonly logger = new Logger(CouchService.name);
  private client: nano.ServerScope;
  private readonly dbCache = new Map<string, nano.DocumentScope<any>>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('COUCHDB_URL');
    const user = this.configService.get<string>('COUCHDB_USER');
    const password = this.configService.get<string>('COUCHDB_PASSWORD');

    const authUrl = url.replace('://', `://${user}:${password}@`);
    const isHttps = authUrl.startsWith('https');
    const agentOptions = { keepAlive: true, maxSockets: 100, maxFreeSockets: 20 };
    this.client = nano({
      url: authUrl,
      requestDefaults: {
        agent: isHttps ? new https.Agent(agentOptions) : new http.Agent(agentOptions),
      },
    });

    const maxRetries = 15;
    const retryDelayMs = 5000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.ensureSystemDatabases();
        await this.ensureIndexesOnExistingDbs();
        this.logger.log(`Connected to CouchDB at ${url}`);
        return;
      } catch (err: any) {
        if (attempt === maxRetries) {
          this.logger.error(`CouchDB connection failed after ${maxRetries} attempts: ${err.message}`);
          throw err;
        }
        this.logger.warn(`CouchDB not ready (attempt ${attempt}/${maxRetries}), retrying in ${retryDelayMs / 1000}s... [${err.message}]`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  /**
   * Apply Mango indexes to all existing org databases.
   * Safe to run on startup — createIndex is idempotent.
   */
  private async ensureIndexesOnExistingDbs(): Promise<void> {
    try {
      const dbList: string[] = await (this.client.db as any).list();
      // Include platform DB (ax__platform_*) and all org DBs (ax_org*_dev)
      const targetDbs = dbList.filter((db: string) => db.startsWith('ax_'));
      for (const dbName of targetDbs) {
        const db = this.client.use(dbName);
        await this.applyMangoIndexes(db);
      }
    } catch (err: any) {
      this.logger.warn(`ensureIndexesOnExistingDbs: ${err.message}`);
    }
  }

  private async applyMangoIndexes(db: nano.DocumentScope<any>): Promise<void> {
    const indexes = [
      // ── Facility hierarchy ─────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'createdAt'] },              name: 'idx-doctype-orgid-created' },
      { index: { fields: ['docType', 'orgId', 'name'] },                   name: 'idx-doctype-orgid-name' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'name'] },      name: 'idx-building-complex-name' },
      { index: { fields: ['docType', 'orgId', 'buildingId', 'floorNumber'] }, name: 'idx-floor-building-num' },
      { index: { fields: ['docType', 'orgId', 'complexId'] },              name: 'idx-doctype-orgid-complex' },
      { index: { fields: ['docType', 'orgId', 'floorId', 'name'] },        name: 'idx-zone-floor-name' },
      { index: { fields: ['docType', 'orgId', 'buildingId'] },             name: 'idx-doctype-orgid-building' },
      // ── Existing indexes ──────────────────────────────────────
      { index: { fields: ['docType', 'complexId', 'createdAt'] },          name: 'idx-doctype-complex-created' },
      { index: { fields: ['docType', 'sessionId'] },                        name: 'idx-doctype-session' },
      { index: { fields: ['docType', 'status', 'complexId'] },              name: 'idx-doctype-status-complex' },
      { index: { fields: ['docType', 'severity', 'isRepaired'] },           name: 'idx-defect-severity-repaired' },
      { index: { fields: ['docType', 'gaugePointId', 'measuredAt'] },       name: 'idx-crack-gauge-time' },
      { index: { fields: ['docType', 'exceedsThreshold'] },                 name: 'idx-crack-exceeds' },
      { index: { fields: ['docType', 'isActive'] },                         name: 'idx-doctype-active' },
      { index: { fields: ['docType', 'status', 'dueDate'] },                name: 'idx-doctype-status-due' },
      { index: { fields: ['docType', 'projectId'] },                        name: 'idx-doctype-project' },
      { index: { fields: ['email'] },                                        name: 'idx-user-email' },
      // ── Defects ───────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'sessionId', 'severity'] },   name: 'idx-defect-session-severity' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'isRepaired'] }, name: 'idx-defect-complex-repaired' },
      { index: { fields: ['docType', 'orgId', 'defectType', 'createdAt'] }, name: 'idx-defect-type-created' },
      { index: { fields: ['docType', 'orgId', 'severity', 'isRepaired'] },  name: 'idx-defect-severity-repaired2' },
      // ── DefectMedia ───────────────────────────────────────────
      { index: { fields: ['docType', 'defectId', 'capturedAt'] },           name: 'idx-media-defect-time' },
      { index: { fields: ['docType', 'sessionId', 'capturedAt'] },          name: 'idx-media-session-time' },
      { index: { fields: ['docType', 'orgId', 'storageKey'] },              name: 'idx-media-storage-key' },
      // ── DefectMarker3D ────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'buildingId', 'isVisible'] }, name: 'idx-marker-building' },
      { index: { fields: ['docType', 'orgId', 'defectId'] },                name: 'idx-marker-defect' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'isVisible'] },  name: 'idx-marker-complex' },
      // ── Complaints ────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'status', 'submittedAt'] },   name: 'idx-complaint-status-time' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'submittedAt'] }, name: 'idx-complaint-complex-time' },
      { index: { fields: ['docType', 'orgId', 'assignedTo', 'status'] },    name: 'idx-complaint-assignee-status' },
      { index: { fields: ['docType', 'orgId', 'priority', 'submittedAt'] }, name: 'idx-complaint-priority-time' },
      { index: { fields: ['docType', 'orgId', 'dueDate', 'status'] },       name: 'idx-complaint-due-status' },
      // ── WorkOrders ────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'status', 'scheduledDate'] }, name: 'idx-wo-status-scheduled' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'scheduledDate'] }, name: 'idx-wo-complex-scheduled' },
      { index: { fields: ['docType', 'orgId', 'complaintId'] },             name: 'idx-wo-complaint' },
      { index: { fields: ['docType', 'orgId', 'assignedTo', 'status'] },    name: 'idx-wo-assignee-status' },
      // ── Feature Flags ─────────────────────────────────────────
      { index: { fields: ['docType', 'key'] },                              name: 'idx-featureflag-key' },
      { index: { fields: ['docType', 'createdAt'] },                        name: 'idx-featureflag-created' },
      // ── Async Jobs ────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'status', 'createdAt'] },    name: 'idx-job-status-created' },
      { index: { fields: ['docType', 'orgId', 'jobType', 'createdAt'] },   name: 'idx-job-type-created' },
      { index: { fields: ['docType', 'orgId', 'createdBy', 'createdAt'] }, name: 'idx-job-creator-created' },
      // ── Drone Missions ────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'complexId', 'createdAt'] }, name: 'idx-drone-mission-complex-created' },
      { index: { fields: ['docType', 'orgId', 'status', 'createdAt'] },    name: 'idx-drone-mission-status-created' },
      { index: { fields: ['docType', 'orgId', 'sessionId', 'flightDate'] }, name: 'idx-drone-mission-session' },
      { index: { fields: ['docType', 'orgId', 'buildingId', 'flightDate'] }, name: 'idx-drone-mission-building' },
      // ── Media Frames ──────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'missionId', 'frameIndex'] }, name: 'idx-mediaframe-mission-idx' },
      { index: { fields: ['docType', 'orgId', 'mediaItemId', 'frameIndex'] }, name: 'idx-mediaframe-item-idx' },
      // ── Media Analysis Pipeline ───────────────────────────────
      { index: { fields: ['docType', 'orgId', 'missionId', 'createdAt'] }, name: 'idx-mediapipeline-mission-created' },
      { index: { fields: ['docType', 'orgId', 'mediaItemId'] },            name: 'idx-mediapipeline-mediaitem' },
      { index: { fields: ['docType', 'orgId', 'overallStatus', 'createdAt'] }, name: 'idx-mediapipeline-status' },
      // ── Defect Candidates ──────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'complexId', 'createdAt'] },          name: 'idx-defectcandidate-complex-created' },
      { index: { fields: ['docType', 'orgId', 'reviewStatus', 'createdAt'] },       name: 'idx-defectcandidate-review-created' },
      { index: { fields: ['docType', 'orgId', 'sourceMissionId', 'createdAt'] },    name: 'idx-defectcandidate-mission-created' },
      { index: { fields: ['docType', 'orgId', 'defectType', 'createdAt'] },         name: 'idx-defectcandidate-type-created' },
      { index: { fields: ['docType', 'orgId', 'confidenceLevel', 'reviewStatus'] }, name: 'idx-defectcandidate-confidence-review' },
      { index: { fields: ['docType', 'orgId', 'detectionJobId'] },                  name: 'idx-defectcandidate-job' },
      // ── Crack Analysis ────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'gaugePointId', 'createdAt'] },       name: 'idx-crackanalysis-gauge-created' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'createdAt'] },          name: 'idx-crackanalysis-complex-created' },
      { index: { fields: ['docType', 'orgId', 'reviewStatus', 'createdAt'] },       name: 'idx-crackanalysis-review-created' },
      { index: { fields: ['docType', 'orgId', 'analysisStatus', 'createdAt'] },     name: 'idx-crackanalysis-status-created' },
      { index: { fields: ['docType', 'orgId', 'measurementId'] },                   name: 'idx-crackanalysis-measurement' },
      // ── Diagnosis Opinions ────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'complexId', 'createdAt'] },          name: 'idx-diagnosis-complex-created' },
      { index: { fields: ['docType', 'orgId', 'status', 'createdAt'] },             name: 'idx-diagnosis-status-created' },
      { index: { fields: ['docType', 'orgId', 'urgency', 'createdAt'] },            name: 'idx-diagnosis-urgency-created' },
      { index: { fields: ['docType', 'orgId', 'targetType', 'targetId'] },          name: 'idx-diagnosis-target' },
      { index: { fields: ['docType', 'orgId', 'sessionId', 'createdAt'] },          name: 'idx-diagnosis-session' },
      // ── Repair Recommendations ────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'diagnosisOpinionId', 'priorityRank'] }, name: 'idx-repairrec-diagnosis-rank' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'isApproved'] },         name: 'idx-repairrec-complex-approved' },
      { index: { fields: ['docType', 'orgId', 'defectId'] },                        name: 'idx-repairrec-defect' },
      { index: { fields: ['docType', 'orgId', 'recommendedTimeline', 'isApproved'] }, name: 'idx-repairrec-timeline' },
      // ── Reports ───────────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'generatedAt'] },                    name: 'idx-report-generated-at' },
      { index: { fields: ['docType', 'orgId', 'reportType', 'generatedAt'] },      name: 'idx-report-type-generated' },
      // ── Alerts ────────────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'status', 'createdAt'] },            name: 'idx-alert-status-created' },
      { index: { fields: ['docType', 'orgId', 'alertType', 'createdAt'] },         name: 'idx-alert-type-created' },
      // ── Schedules ─────────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'isActive', 'createdAt'] },          name: 'idx-schedule-active-created' },
      { index: { fields: ['docType', 'orgId', 'scheduleType', 'createdAt'] },      name: 'idx-schedule-type-created' },
      // ── Automation Rules ──────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'priority', 'createdAt'] },          name: 'idx-automation-rule-priority-created' },
      { index: { fields: ['docType', 'orgId', 'isActive', 'priority'] },           name: 'idx-automation-rule-active-priority' },
      // ── Repair Recommendations ────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'priorityRank'] },                   name: 'idx-repairrec-rank' },
      // ── Risk Scoring ──────────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'isLatest', 'calculatedAt'] },       name: 'idx-riskscore-latest-calc' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'calculatedAt'] },      name: 'idx-riskscore-complex-calc' },
      // ── Automation Executions ─────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'startedAt'] },                      name: 'idx-automation-exec-started' },
      { index: { fields: ['docType', 'orgId', 'ruleId', 'startedAt'] },            name: 'idx-automation-exec-rule-started' },
      // ── Sensor Readings ───────────────────────────────────────────
      { index: { fields: ['docType', 'orgId', 'sensorId', 'recordedAt'] },         name: 'idx-sensor-reading-sensor-time' },
      { index: { fields: ['docType', 'orgId', 'complexId', 'recordedAt'] },        name: 'idx-sensor-reading-complex-time' },
    ];
    for (const idx of indexes) {
      try { await (db as any).createIndex(idx); } catch {}
    }
  }

  private async ensureSystemDatabases() {
    const systemDbs = ['_users', '_replicator', '_global_changes'];
    for (const db of systemDbs) {
      try {
        await this.client.db.get(db);
      } catch {
        await this.client.db.create(db);
      }
    }
  }

  /**
   * Get the database for a specific organization.
   * Creates it if it doesn't exist.
   */
  async getOrgDb(orgId: string): Promise<nano.DocumentScope<any>> {
    const dbName = this.buildDbName(orgId);
    if (this.dbCache.has(dbName)) {
      return this.dbCache.get(dbName)!;
    }
    try {
      await this.client.db.get(dbName);
    } catch (err: any) {
      if (err.statusCode === 404) {
        await this.client.db.create(dbName);
        this.logger.log(`Created database: ${dbName}`);
        await this.initializeDesignDocs(dbName);
      } else {
        throw err;
      }
    }
    const db = this.client.use(dbName);
    this.dbCache.set(dbName, db);
    return db;
  }

  /**
   * Create a document. _id must be pre-set.
   */
  async create<T extends { _id: string }>(orgId: string, doc: T): Promise<T & { _rev: string }> {
    const db = await this.getOrgDb(orgId);
    const result = await db.insert(doc);
    return { ...doc, _rev: result.rev };
  }

  /**
   * Get document by ID.
   */
  async findById<T>(orgId: string, id: string): Promise<T | null> {
    const db = await this.getOrgDb(orgId);
    try {
      return await db.get(id) as T;
    } catch (err: any) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  /**
   * Update document (requires current _rev).
   */
  async update<T extends { _id: string; _rev?: string }>(
    orgId: string,
    doc: T,
  ): Promise<T & { _rev: string }> {
    const db = await this.getOrgDb(orgId);
    const result = await db.insert(doc);
    return { ...doc, _rev: result.rev };
  }

  /**
   * Soft delete — sets _deleted: true
   */
  async softDelete(orgId: string, id: string): Promise<void> {
    const db = await this.getOrgDb(orgId);
    const doc = await db.get(id);
    await db.insert({ ...doc, _deleted: true, deletedAt: new Date().toISOString() });
  }

  /**
   * Mango query helper.
   */
  async find<T>(
    orgId: string,
    selector: nano.MangoSelector,
    options?: {
      limit?: number;
      skip?: number;
      sort?: nano.SortOrder[];
      fields?: string[];
    },
  ): Promise<{ docs: T[]; total?: number }> {
    const db = await this.getOrgDb(orgId);
    const query: nano.MangoQuery = {
      selector: { ...selector },
      limit: options?.limit === 0 ? 10000 : (options?.limit ?? 20),
      skip: options?.skip ?? 0,
      ...(options?.sort && { sort: options.sort }),
      ...(options?.fields && { fields: options.fields }),
    };

    try {
      const result = await db.find(query);
      return { docs: result.docs as T[] };
    } catch (err: any) {
      // CouchDB: no index for sort → retry without sort, then sort in memory
      // nano exposes the CouchDB error as err.error ("no_usable_index") or err.reason,
      // not always as err.message — check all three fields
      const msg = String(err?.message ?? err?.reason ?? err?.error ?? '');
      const isIndexError =
        err?.error === 'no_usable_index' ||
        msg.includes('index') ||
        msg.includes('single direction') ||
        msg.includes('not an integer') ||
        msg.includes('null');
      if (options?.sort && isIndexError) {
        const fallbackQuery: nano.MangoQuery = {
          selector: { ...selector },
          limit: (options?.limit ?? 20) * 5, // fetch more to ensure sorted page is correct
          skip: 0,
          ...(options?.fields && { fields: options.fields }),
        };
        const result = await db.find(fallbackQuery);
        let docs = result.docs as T[];

        // In-memory sort
        for (const sortEntry of [...options.sort].reverse()) {
          const [field, dir] = Object.entries(sortEntry)[0];
          docs = docs.sort((a: any, b: any) => {
            const av = a[field] ?? '';
            const bv = b[field] ?? '';
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return dir === 'desc' ? -cmp : cmp;
          });
        }

        // Re-apply skip/limit after in-memory sort
        const skip = options?.skip ?? 0;
        const limit = options?.limit ?? 20;
        return { docs: docs.slice(skip, skip + limit) };
      }
      throw err;
    }
  }

  /**
   * Query a view.
   */
  async queryView<T>(
    orgId: string,
    designDoc: string,
    viewName: string,
    params?: nano.DocumentViewParams,
  ): Promise<nano.DocumentViewResponse<T, T>> {
    const db = await this.getOrgDb(orgId);
    return db.view<T>(designDoc, viewName, params);
  }

  /**
   * Bulk insert documents.
   */
  async bulkInsert<T>(orgId: string, docs: T[]): Promise<nano.DocumentBulkResponse[]> {
    const db = await this.getOrgDb(orgId);
    const result = await db.bulk({ docs });
    return result;
  }

  private buildDbName(orgId: string): string {
    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    return `ax_${orgId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${env}`;
  }

  /**
   * Initialize design documents (indexes) for a new org database.
   */
  private async initializeDesignDocs(dbName: string): Promise<void> {
    const db = this.client.use(dbName);

    const mainDesignDoc = {
      _id: '_design/main',
      views: {
        by_org_type: {
          map: `function(doc) {
            if (doc.orgId && doc.docType && !doc._deleted) {
              emit([doc.orgId, doc.docType, doc.createdAt], null);
            }
          }`,
        },
        defects_by_complex_severity: {
          map: `function(doc) {
            if (doc.docType === 'defect' && !doc._deleted) {
              emit([doc.complexId, doc.severity, doc.createdAt], {
                defectType: doc.defectType,
                isRepaired: doc.isRepaired,
              });
            }
          }`,
          reduce: '_count',
        },
        defects_by_session: {
          map: `function(doc) {
            if (doc.docType === 'defect' && !doc._deleted) {
              emit([doc.sessionId, doc.severity], null);
            }
          }`,
        },
        complaints_by_status: {
          map: `function(doc) {
            if (doc.docType === 'complaint' && !doc._deleted) {
              emit([doc.complexId, doc.status, doc.submittedAt], {
                priority: doc.priority,
                assignedTo: doc.assignedTo,
              });
            }
          }`,
          reduce: '_count',
        },
        crack_measurements_by_gauge: {
          map: `function(doc) {
            if (doc.docType === 'crackMeasurement' && !doc._deleted) {
              emit([doc.gaugePointId, doc.measuredAt], {
                measuredWidthMm: doc.measuredWidthMm,
                changeFromBaselineMm: doc.changeFromBaselineMm,
                exceedsThreshold: doc.exceedsThreshold,
              });
            }
          }`,
        },
        active_alerts_by_complex: {
          map: `function(doc) {
            if (doc.docType === 'alert' && doc.status === 'ACTIVE' && !doc._deleted) {
              emit([doc.complexId, doc.severity, doc.createdAt], {
                alertType: doc.alertType,
                title: doc.title,
              });
            }
          }`,
        },
      },
    };

    try {
      await db.insert(mainDesignDoc as any);
    } catch (err: any) {
      this.logger.warn(`Design doc init error for ${dbName}: ${err.message}`);
    }

    // Mango indexes
    await this.applyMangoIndexes(db);
  }
}
