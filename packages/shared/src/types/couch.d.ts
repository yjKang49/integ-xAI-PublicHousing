/**
 * Every CouchDB document extends this base.
 * _id convention: {docType}:{orgId}:{uuid}
 *   e.g. defect:org_001:def_20240101_abc123
 *
 * Database naming: ax_{orgId}_{env}
 *   e.g. ax_org001_prod, ax_org001_dev
 *
 * Replication: per-org filtered replication to mobile client
 */
export interface CouchDocument {
    _id: string;
    _rev?: string;
    docType: string;
    orgId: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    _deleted?: boolean;
}
/**
 * Mobile PouchDB documents additionally carry sync metadata
 */
export interface PouchSyncMeta {
    syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
    localModifiedAt?: string;
    conflictBase?: string;
}
/**
 * CouchDB design document structure for views
 */
export interface CouchDesignDoc {
    _id: string;
    views: Record<string, {
        map: string;
        reduce?: string;
    }>;
    indexes?: Record<string, {
        index: {
            fields: string[];
        };
        ddoc?: string;
        type?: string;
    }>;
}
