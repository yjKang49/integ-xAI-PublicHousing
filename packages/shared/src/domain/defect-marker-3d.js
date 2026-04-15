"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEVERITY_MARKER_COLOR = exports.SeverityLevel = exports.DefectType = void 0;
exports.floorFromMeshName = floorFromMeshName;
var enums_1 = require("../types/enums");
Object.defineProperty(exports, "DefectType", { enumerable: true, get: function () { return enums_1.DefectType; } });
Object.defineProperty(exports, "SeverityLevel", { enumerable: true, get: function () { return enums_1.SeverityLevel; } });
/**
 * Severity → marker hex color mapping.
 * Use this on both frontend and backend for consistent coloring.
 */
exports.SEVERITY_MARKER_COLOR = {
    LOW: '#4caf50',
    MEDIUM: '#ffeb3b',
    HIGH: '#ff9800',
    CRITICAL: '#f44336',
};
/**
 * Extract floor number from a Three.js mesh name.
 * Convention: mesh names like "Wall_3F", "Slab_B1", "Pillar_Floor5"
 * Returns null if no floor info found.
 */
function floorFromMeshName(meshName) {
    const m = meshName.match(/[Bb](\d+)|(\d+)[Ff]|Floor(\d+)/i);
    if (!m)
        return null;
    return parseInt(m[1] ?? m[2] ?? m[3]);
}
//# sourceMappingURL=defect-marker-3d.js.map