// ============================================================
// packages/shared/src/types/couch-examples.ts
// CouchDB document examples, design docs (indexes), and sync strategy
// These are used for seeding and documentation — not runtime imports
// ============================================================

// ──────────────────────────────────────────────
// EXAMPLE DOCUMENTS
// ──────────────────────────────────────────────

export const exampleUser = {
  _id: 'user:org001:usr_inspector_001',
  docType: 'user',
  orgId: 'org001',
  email: 'inspector1@lh.or.kr',
  passwordHash: '$2b$12$...',         // bcrypt hash
  name: '김현장',
  phone: '010-1234-5678',
  role: 'INSPECTOR',
  organizationId: 'org001',
  assignedComplexIds: ['cplx001', 'cplx002'],
  isActive: true,
  lastLoginAt: '2024-03-15T09:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-03-15T09:00:00Z',
  createdBy: 'user:org001:usr_admin_001',
  updatedBy: 'user:org001:usr_admin_001',
};

export const exampleDefect = {
  _id: 'defect:org001:def_20240315_001',
  docType: 'defect',
  orgId: 'org001',
  sessionId: 'session:org001:ses_20240315_001',
  projectId: 'project:org001:prj_2024_q1',
  complexId: 'cplx001',
  buildingId: 'bldg:org001:bldg_101',
  floorId: 'floor:org001:floor_101_3f',
  zoneId: 'zone:org001:zone_stairA',
  defectType: 'CRACK',
  severity: 'HIGH',
  description: '계단실 A 북측 외벽 수직 균열, 폭 2.3mm, 길이 약 1.2m',
  widthMm: 2.3,
  lengthMm: 1200,
  depthMm: null,
  locationDescription: '3층 계단실 A 북측 벽 상단 1/3 지점',
  photo2DCoords: { x: 450, y: 230 },
  marker3DId: 'marker3d:org001:m3d_20240315_001',
  mediaIds: ['media:org001:img_001', 'media:org001:img_002'],
  isRepaired: false,
  createdAt: '2024-03-15T10:23:00Z',
  updatedAt: '2024-03-15T10:23:00Z',
  createdBy: 'user:org001:usr_inspector_001',
  updatedBy: 'user:org001:usr_inspector_001',
  syncStatus: 'PENDING',         // mobile-only field
};

export const exampleCrackMeasurement = {
  _id: 'crackMeasurement:org001:cm_20240315_001',
  docType: 'crackMeasurement',
  orgId: 'org001',
  gaugePointId: 'crackGauge:org001:cg_101_3f_001',
  complexId: 'cplx001',
  measuredBy: 'user:org001:usr_inspector_001',
  measuredAt: '2024-03-15T10:30:00Z',
  capturedImageKey: 'cplx001/crack/cg001/20240315_103045.jpg',
  roiImageKey: 'cplx001/crack/cg001/20240315_103045_roi.jpg',
  measuredWidthMm: 2.3,
  changeFromBaselineMm: 0.8,
  changeFromLastMm: 0.15,
  isManualOverride: false,
  autoConfidence: 0.92,
  graduationCount: 23,
  scaleMmPerGraduation: 0.1,
  exceedsThreshold: true,
  alertId: 'alert:org001:alrt_20240315_001',
  createdAt: '2024-03-15T10:30:00Z',
  updatedAt: '2024-03-15T10:30:00Z',
  createdBy: 'user:org001:usr_inspector_001',
  updatedBy: 'user:org001:usr_inspector_001',
};

export const exampleComplaint = {
  _id: 'complaint:org001:cmp_20240315_001',
  docType: 'complaint',
  orgId: 'org001',
  complexId: 'cplx001',
  buildingId: 'bldg:org001:bldg_101',
  unitNumber: '305',
  category: 'FACILITY',
  status: 'ASSIGNED',
  title: '화장실 천장 누수 발생',
  description: '3층 305호 화장실 천장에서 물이 떨어지고 있습니다.',
  priority: 'HIGH',
  submittedBy: '박입주민',
  submittedPhone: '010-9876-5432',
  submittedAt: '2024-03-15T08:00:00Z',
  assignedTo: 'user:org001:usr_inspector_001',
  assignedAt: '2024-03-15T08:30:00Z',
  dueDate: '2024-03-17T18:00:00Z',
  mediaIds: [],
  timeline: [
    {
      timestamp: '2024-03-15T08:00:00Z',
      fromStatus: null,
      toStatus: 'RECEIVED',
      actorId: 'system',
      notes: 'Complaint submitted via resident portal',
    },
    {
      timestamp: '2024-03-15T08:30:00Z',
      fromStatus: 'RECEIVED',
      toStatus: 'ASSIGNED',
      actorId: 'user:org001:usr_complaint_mgr',
      notes: '김현장 담당자 배정',
    },
  ],
  createdAt: '2024-03-15T08:00:00Z',
  updatedAt: '2024-03-15T08:30:00Z',
  createdBy: 'system',
  updatedBy: 'user:org001:usr_complaint_mgr',
};

// ──────────────────────────────────────────────
// COUCHDB DESIGN DOCUMENTS (INDEXES)
// ──────────────────────────────────────────────

/**
 * Primary design doc for all entity views.
 * Emitted key patterns enable range queries and compound lookups.
 */
export const designDocMain = {
  _id: '_design/main',
  views: {
    // All documents by orgId + docType
    'by_org_type': {
      map: `function(doc) {
        if (doc.orgId && doc.docType) {
          emit([doc.orgId, doc.docType, doc.createdAt], null);
        }
      }`,
    },
    // Defects by complex + severity
    'defects_by_complex_severity': {
      map: `function(doc) {
        if (doc.docType === 'defect') {
          emit([doc.complexId, doc.severity, doc.createdAt], {
            defectType: doc.defectType,
            isRepaired: doc.isRepaired,
            sessionId: doc.sessionId,
          });
        }
      }`,
      reduce: '_count',
    },
    // Defects by session
    'defects_by_session': {
      map: `function(doc) {
        if (doc.docType === 'defect') {
          emit([doc.sessionId, doc.severity], null);
        }
      }`,
    },
    // Complaints by complex + status
    'complaints_by_status': {
      map: `function(doc) {
        if (doc.docType === 'complaint') {
          emit([doc.complexId, doc.status, doc.submittedAt], {
            priority: doc.priority,
            assignedTo: doc.assignedTo,
          });
        }
      }`,
      reduce: '_count',
    },
    // Crack measurements by gauge point (time series)
    'crack_measurements_by_gauge': {
      map: `function(doc) {
        if (doc.docType === 'crackMeasurement') {
          emit([doc.gaugePointId, doc.measuredAt], {
            measuredWidthMm: doc.measuredWidthMm,
            changeFromBaselineMm: doc.changeFromBaselineMm,
            exceedsThreshold: doc.exceedsThreshold,
          });
        }
      }`,
    },
    // Sessions by project + status
    'sessions_by_project': {
      map: `function(doc) {
        if (doc.docType === 'inspectionSession') {
          emit([doc.projectId, doc.status], null);
        }
      }`,
    },
    // Active alerts by complex
    'active_alerts_by_complex': {
      map: `function(doc) {
        if (doc.docType === 'alert' && doc.status === 'ACTIVE') {
          emit([doc.complexId, doc.severity, doc.createdAt], {
            alertType: doc.alertType,
            title: doc.title,
          });
        }
      }`,
    },
    // Pending sync documents (mobile)
    'pending_sync': {
      map: `function(doc) {
        if (doc.syncStatus === 'PENDING') {
          emit([doc.docType, doc.localModifiedAt], null);
        }
      }`,
    },
  },
};

/**
 * Mango index definitions (CouchDB 2.x+)
 * POST /{db}/_index to create
 */
export const mangoIndexes = [
  {
    index: { fields: ['docType', 'complexId', 'createdAt'] },
    name: 'idx-doctype-complex-created',
    type: 'json',
  },
  {
    index: { fields: ['docType', 'sessionId'] },
    name: 'idx-doctype-session',
    type: 'json',
  },
  {
    index: { fields: ['docType', 'status', 'complexId'] },
    name: 'idx-doctype-status-complex',
    type: 'json',
  },
  {
    index: { fields: ['docType', 'severity', 'isRepaired'] },
    name: 'idx-defect-severity-repaired',
    type: 'json',
  },
  {
    index: { fields: ['docType', 'gaugePointId', 'measuredAt'] },
    name: 'idx-crack-gauge-time',
    type: 'json',
  },
  {
    index: { fields: ['email'] },
    name: 'idx-user-email',
    type: 'json',
  },
];

// ──────────────────────────────────────────────
// SYNC STRATEGY
// ──────────────────────────────────────────────

/**
 * SYNC STRATEGY OVERVIEW
 * ======================
 *
 * Architecture:
 *   Mobile PouchDB  ←────────────────────────→  CouchDB (server)
 *                        HTTP replication
 *                        (CouchDB protocol)
 *
 * 1. DATABASE PER ORGANIZATION
 *    - Server DB: ax_{orgId}_{env}  (e.g. ax_org001_prod)
 *    - Mobile DB: ax_local (one DB per device, filtered by inspector)
 *
 * 2. FILTERED REPLICATION
 *    - Mobile only replicates documents relevant to the logged-in inspector:
 *      - InspectionSessions assigned to inspector
 *      - Related defects, media refs, checklists
 *      - HousingComplex / Building / Zone for assigned complexes
 *      - CrackGaugePoints for assigned complexes
 *    - Filter function stored as CouchDB design doc:
 */
export const replicationFilterDoc = {
  _id: '_design/sync',
  filters: {
    inspectorFilter: `function(doc, req) {
      var inspectorId = req.query.inspectorId;
      var complexIds = (req.query.complexIds || '').split(',');

      // Always sync reference data for assigned complexes
      var refTypes = ['housingComplex','building','floor','zone','facilityAsset',
                      'crackGaugePoint','checklistTemplate'];
      if (refTypes.indexOf(doc.docType) >= 0) {
        return complexIds.indexOf(doc.complexId) >= 0;
      }

      // Sync inspection sessions assigned to this inspector
      if (doc.docType === 'inspectionSession') {
        return doc.inspectorId === inspectorId;
      }

      // Sync defects and media from inspector's sessions
      if (doc.docType === 'defect' || doc.docType === 'defectMedia') {
        return doc.createdBy === inspectorId;
      }

      // Sync crack measurements by this inspector
      if (doc.docType === 'crackMeasurement') {
        return doc.measuredBy === inspectorId;
      }

      return false;
    }`,
  },
};

/**
 * 3. CONFLICT RESOLUTION STRATEGY
 *    - CouchDB automatic conflict detection via _rev
 *    - Client reads winning revision on sync
 *    - For InspectionSession/Defect: Last-Write-Wins by updatedAt timestamp
 *    - For ChecklistItem: merge by item ID (union strategy)
 *    - Conflict metadata stored in doc.conflictBase for UI display
 *
 * 4. OFFLINE WORKFLOW
 *    a) Inspector goes offline → PouchDB stores all changes locally
 *    b) syncStatus = 'PENDING' on each modified doc
 *    c) App shows sync status badge (pending count)
 *    d) On network restore → automatic live replication resumes
 *    e) Conflict detected → UI prompts manual resolution
 *
 * 5. MEDIA SYNC
 *    - Photos/videos stored as PouchDB attachments while offline
 *    - On sync: NestJS worker detects new media docs with _attachments
 *    - Worker uploads attachment to S3, updates storageKey
 *    - Removes _attachment from doc to save CouchDB space
 *
 * 6. SYNC CONFIG (PouchDB client)
 */
export const pouchSyncConfig = {
  live: true,
  retry: true,
  filter: 'sync/inspectorFilter',
  query_params: {
    inspectorId: '{{current_user_id}}',
    complexIds: '{{assigned_complex_ids_csv}}',
  },
  batch_size: 50,
  batches_limit: 3,
  heartbeat: 10000,
  timeout: 30000,
  back_off_function: (delay: number) => (delay === 0 ? 1000 : Math.min(delay * 1.5, 30000)),
};
