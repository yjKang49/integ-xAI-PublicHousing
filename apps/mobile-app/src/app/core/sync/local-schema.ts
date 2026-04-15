/**
 * local-schema.ts
 * PouchDB local document schema constants and factory helpers.
 *
 * All offline documents stored by the mobile app follow these types.
 * On sync, CouchDB receives them and the server worker processes
 * any _attachments (photos) → uploads to S3 → clears _attachments.
 */

import { v4 as uuid } from 'uuid';
import {
  InspectionSession, Defect, DefectMedia,
  DefectMarker3D, InspectionStatus, SessionStatus, DefectType, MediaType,
} from '@ax/shared';

// ─────────────────────────────────────────────────────────────────
// ID patterns (must match server-side conventions)
// ─────────────────────────────────────────────────────────────────

export const LocalId = {
  session: (orgId: string) =>
    `inspectionSession:${orgId}:ses_${Date.now()}_${uuid().slice(0, 8)}`,

  defect: (orgId: string) =>
    `defect:${orgId}:def_${Date.now()}_${uuid().slice(0, 8)}`,

  defectMedia: (orgId: string) =>
    `defectMedia:${orgId}:img_${Date.now()}_${uuid().slice(0, 8)}`,

  marker: (orgId: string) =>
    `defectMarker3D:${orgId}:mk_${Date.now()}_${uuid().slice(0, 8)}`,
} as const;

// ─────────────────────────────────────────────────────────────────
// PouchDB document mixins
// ─────────────────────────────────────────────────────────────────

/** Extra fields PouchDB adds at create/update time */
export interface LocalMeta {
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'ERROR';
  localModifiedAt: string;
}

export type LocalDoc<T> = T & LocalMeta;

// ─────────────────────────────────────────────────────────────────
// Mango index definitions (created on DB init)
// ─────────────────────────────────────────────────────────────────

export const LOCAL_INDEXES = [
  // Sessions by complex + date
  { index: { fields: ['docType', 'complexId', 'createdAt'] } },
  // Defects by session + severity
  { index: { fields: ['docType', 'sessionId', 'severity'] } },
  // All pending sync items
  { index: { fields: ['docType', 'syncStatus'] } },
  // Media by defect
  { index: { fields: ['docType', 'defectId', 'capturedAt'] } },
  // Sync queue by status
  { index: { fields: ['docType', 'queueType', 'status'] } },
  // Markers by building
  { index: { fields: ['docType', 'buildingId', 'isVisible'] } },
] as const;

export const LocalQueueId = {
  media: (orgId: string) =>
    `syncQueue:${orgId}:mq_${Date.now()}_${uuid().slice(0, 8)}`,
} as const;

// ─────────────────────────────────────────────────────────────────
// Document factory helpers
// ─────────────────────────────────────────────────────────────────

export function makeSession(params: {
  orgId: string;
  projectId: string;
  complexId: string;
  buildingId: string;
  floorId?: string;
  zoneId?: string;
  inspectorId: string;
  userId: string;
}): InspectionSession {
  const now = new Date().toISOString();
  return {
    _id: LocalId.session(params.orgId),
    docType: 'inspectionSession',
    orgId: params.orgId,
    projectId: params.projectId,
    complexId: params.complexId,
    buildingId: params.buildingId,
    floorId: params.floorId,
    zoneId: params.zoneId,
    inspectorId: params.inspectorId,
    status: SessionStatus.IN_PROGRESS,
    startedAt: now,
    checklistItems: [],
    defectCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: params.userId,
    updatedBy: params.userId,
  };
}

export function makeDefect(params: {
  orgId: string;
  sessionId: string;
  projectId: string;
  complexId: string;
  buildingId: string;
  floorId?: string;
  zoneId?: string;
  userId: string;
  defectType: string;
  severity: string;
  description: string;
  locationDescription: string;
  widthMm?: number;
  lengthMm?: number;
  depthMm?: number;
  areaSqm?: number;
  mediaIds?: string[];
}): Defect {
  const now = new Date().toISOString();
  return {
    _id: LocalId.defect(params.orgId),
    docType: 'defect',
    orgId: params.orgId,
    sessionId: params.sessionId,
    projectId: params.projectId,
    complexId: params.complexId,
    buildingId: params.buildingId,
    floorId: params.floorId,
    zoneId: params.zoneId,
    defectType: params.defectType as any,
    severity: params.severity as any,
    description: params.description,
    locationDescription: params.locationDescription,
    widthMm: params.widthMm,
    lengthMm: params.lengthMm,
    depthMm: params.depthMm,
    areaSqm: params.areaSqm,
    mediaIds: params.mediaIds ?? [],
    isRepaired: false,
    createdAt: now,
    updatedAt: now,
    createdBy: params.userId,
    updatedBy: params.userId,
  };
}

export function makeDefectMedia(params: {
  orgId: string;
  defectId: string;
  sessionId: string;
  complexId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): DefectMedia {
  const now = new Date().toISOString();
  return {
    _id: LocalId.defectMedia(params.orgId),
    docType: 'defectMedia',
    orgId: params.orgId,
    defectId: params.defectId,
    sessionId: params.sessionId,
    complexId: params.complexId,
    mediaType: MediaType.PHOTO,
    fileName: params.fileName,
    fileSize: params.fileSize,
    mimeType: params.mimeType,
    storageKey: '',       // filled by server after S3 upload
    capturedAt: now,
    capturedBy: params.userId,
    createdAt: now,
    updatedAt: now,
    createdBy: params.userId,
    updatedBy: params.userId,
  };
}

export function makeMarker3D(params: {
  orgId: string;
  defectId: string;
  complexId: string;
  buildingId: string;
  modelUrl: string;
  userId: string;
  position: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  meshName?: string;
  color?: string;
  label?: string;
}): DefectMarker3D {
  const now = new Date().toISOString();
  return {
    _id: LocalId.marker(params.orgId),
    docType: 'defectMarker3D',
    orgId: params.orgId,
    defectId: params.defectId,
    complexId: params.complexId,
    buildingId: params.buildingId,
    modelUrl: params.modelUrl,
    position: params.position,
    normal: params.normal,
    meshName: params.meshName,
    color: params.color ?? '#FF6B6B',
    label: params.label,
    iconType: DefectType.OTHER,
    isVisible: true,
    historicalMarkerIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: params.userId,
    updatedBy: params.userId,
  };
}

// ─────────────────────────────────────────────────────────────────
// Test seed data (for local dev/demo — call via browser console)
// ─────────────────────────────────────────────────────────────────

export const TEST_SEED = {
  /** Example session with 3 defects */
  createDemoInspection: async (
    pouch: import('./pouch.service').PouchService,
    orgId: string,
    userId: string,
    complexId: string,
    buildingId: string,
  ) => {
    const session = makeSession({
      orgId, projectId: 'inspectionProject:demo:prj_demo',
      complexId, buildingId,
      inspectorId: userId, userId,
    });
    const savedSession = await pouch.create(session);

    const defect1 = makeDefect({
      orgId, sessionId: session._id, projectId: session.projectId,
      complexId, buildingId, userId,
      defectType: 'CRACK', severity: 'HIGH',
      description: '외벽 북면 창호 하부 사선 균열',
      locationDescription: '101동 3층 북쪽 외벽 창호 하단부',
      widthMm: 2.5, lengthMm: 340,
    });

    const defect2 = makeDefect({
      orgId, sessionId: session._id, projectId: session.projectId,
      complexId, buildingId, userId,
      defectType: 'LEAK', severity: 'CRITICAL',
      description: '지하주차장 천장 누수 — 활성 누수 확인',
      locationDescription: '지하 1층 주차장 P-3 구역 천장',
    });

    const defect3 = makeDefect({
      orgId, sessionId: session._id, projectId: session.projectId,
      complexId, buildingId, userId,
      defectType: 'SPALLING', severity: 'MEDIUM',
      description: '외벽 타일 박리 — 약 0.5m² 탈락',
      locationDescription: '101동 5층 서쪽 외벽',
      areaSqm: 0.52,
    });

    const marker = makeMarker3D({
      orgId, defectId: defect1._id, complexId, buildingId,
      modelUrl: '/models/building-101.glb',
      userId,
      position: { x: 12.34, y: 8.5, z: -3.2 },
      normal: { x: 0, y: 0, z: 1 },
      meshName: 'North_Wall_Floor3',
      color: '#FF9800',
      label: '균열 (2.5mm)',
    });

    await Promise.all([
      pouch.create(defect1),
      pouch.create(defect2),
      pouch.create(defect3),
      pouch.create(marker),
    ]);

    console.info('[TEST_SEED] Created demo inspection:', {
      session: session._id,
      defects: [defect1._id, defect2._id, defect3._id],
      marker: marker._id,
    });

    return { session, defects: [defect1, defect2, defect3], marker };
  },
};
