export { DefectMarker3D } from '../types/entities';
export { DefectType, SeverityLevel } from '../types/enums';
/** Request body for POST /api/v1/markers */
export interface CreateMarkerInput {
    defectId: string;
    complexId: string;
    buildingId: string;
    /** Path to glTF model file, e.g. /assets/models/building-101.glb */
    modelUrl: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    normal?: {
        x: number;
        y: number;
        z: number;
    };
    /** Mesh name from Three.js raycaster intersection */
    meshName?: string;
    /** Hex color string — caller maps severity → color */
    color?: string;
    label?: string;
    iconType?: string;
}
export interface UpdateMarkerInput {
    position?: {
        x: number;
        y: number;
        z: number;
    };
    color?: string;
    label?: string;
    isVisible?: boolean;
}
/** Query params for GET /api/v1/markers/building/:buildingId */
export interface MarkerQueryInput {
    sessionId?: string;
    severity?: string;
}
/**
 * Severity → marker hex color mapping.
 * Use this on both frontend and backend for consistent coloring.
 */
export declare const SEVERITY_MARKER_COLOR: Record<string, string>;
/**
 * Extract floor number from a Three.js mesh name.
 * Convention: mesh names like "Wall_3F", "Slab_B1", "Pillar_Floor5"
 * Returns null if no floor info found.
 */
export declare function floorFromMeshName(meshName: string): number | null;
