// apps/api/src/modules/markers/markers.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { MarkersService } from './markers.service';
import { DefectType, SeverityLevel } from '@ax/shared';

// ── Mock CouchService ──────────────────────────────────────────────────────────
const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockFind = jest.fn();
const mockUpdate = jest.fn();

const mockCouch = {
  create: mockCreate,
  findById: mockFindById,
  find: mockFind,
  update: mockUpdate,
};

describe('MarkersService', () => {
  let service: MarkersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarkersService(mockCouch as any);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    const dto = {
      defectId: 'defect-1',
      complexId: 'complex-1',
      buildingId: 'B001',
      modelUrl: '/assets/models/building-B001.glb',
      position: { x: 1.5, y: 3.0, z: -2.0 },
      meshName: 'Wall_3F',
      color: '#ff9800',
      label: '3층 외벽 균열',
      iconType: DefectType.CRACK,
    };

    it('saves a marker doc with floor derived from meshName', async () => {
      const saved = { _id: 'mk_001', ...dto, orgId, floor: 3, isVisible: true };
      mockCreate.mockResolvedValue(saved);
      mockFindById.mockResolvedValue({ _id: 'defect-1', marker3DId: null });
      mockUpdate.mockResolvedValue({});

      const result = await service.create(orgId, dto as any, userId);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createArg = mockCreate.mock.calls[0][1];
      expect(createArg.floor).toBe(3);           // "Wall_3F" → floor 3
      expect(createArg.isVisible).toBe(true);
      expect(createArg.docType).toBe('defectMarker3D');
      expect(result._id).toBe('mk_001');
    });

    it('derives null floor when meshName has no floor suffix', async () => {
      const dtoNoFloor = { ...dto, meshName: 'GenericMesh' };
      mockCreate.mockResolvedValue({ _id: 'mk_002', ...dtoNoFloor, orgId, isVisible: true });
      mockFindById.mockResolvedValue({ _id: 'defect-1' });
      mockUpdate.mockResolvedValue({});

      await service.create(orgId, dtoNoFloor as any, userId);

      const createArg = mockCreate.mock.calls[0][1];
      expect(createArg.floor).toBeUndefined();
    });

    it('back-links defect with marker3DId', async () => {
      const markerId = 'defectMarker3D:org-1:mk_xyz';
      mockCreate.mockResolvedValue({ _id: markerId });
      const defectDoc = { _id: 'defect-1', docType: 'defect', _deleted: false };
      mockFindById.mockResolvedValue(defectDoc);
      mockUpdate.mockResolvedValue({});

      await service.create(orgId, dto as any, userId);

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg.marker3DId).toBe(markerId);
    });

    it('does not throw when back-link defect lookup fails', async () => {
      mockCreate.mockResolvedValue({ _id: 'mk_003' });
      mockFindById.mockRejectedValue(new Error('not found'));

      await expect(service.create(orgId, dto as any, userId)).resolves.not.toThrow();
    });
  });

  // ── findByBuilding ──────────────────────────────────────────────────────────

  describe('findByBuilding()', () => {
    const orgId = 'org-1';
    const buildingId = 'B001';

    const markers = [
      { _id: 'mk_1', defectId: 'd1', isVisible: true },
      { _id: 'mk_2', defectId: 'd2', isVisible: true },
    ];

    it('returns all markers when no filter', async () => {
      mockFind.mockResolvedValueOnce({ docs: markers });

      const result = await service.findByBuilding(orgId, buildingId, {});

      expect(mockFind).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('filters markers by severity (in-process join)', async () => {
      mockFind
        .mockResolvedValueOnce({ docs: markers })           // markers query
        .mockResolvedValueOnce({ docs: [{ _id: 'd1' }] }); // defects query

      const result = await service.findByBuilding(orgId, buildingId, {
        severity: SeverityLevel.HIGH,
      });

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('mk_1');
    });

    it('filters markers by sessionId', async () => {
      mockFind
        .mockResolvedValueOnce({ docs: markers })
        .mockResolvedValueOnce({ docs: [{ _id: 'd2' }] });

      const result = await service.findByBuilding(orgId, buildingId, { sessionId: 'session-42' });

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('mk_2');
    });

    it('returns empty array when no markers exist', async () => {
      mockFind.mockResolvedValueOnce({ docs: [] });

      const result = await service.findByBuilding(orgId, buildingId, {});
      expect(result).toEqual([]);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns marker doc', async () => {
      const doc = { _id: 'mk_1', docType: 'defectMarker3D', _deleted: false };
      mockFindById.mockResolvedValue(doc);
      await expect(service.findById('org-1', 'mk_1')).resolves.toEqual(doc);
    });

    it('throws NotFoundException for missing marker', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.findById('org-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for soft-deleted marker', async () => {
      mockFindById.mockResolvedValue({ _id: 'mk_1', _deleted: true });
      await expect(service.findById('org-1', 'mk_1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── hide ───────────────────────────────────────────────────────────────────

  describe('hide()', () => {
    it('sets isVisible=false (soft delete)', async () => {
      const marker = { _id: 'mk_1', isVisible: true };
      mockFindById.mockResolvedValue(marker);
      mockUpdate.mockResolvedValue({ ...marker, isVisible: false });

      const result = await service.hide('org-1', 'mk_1', 'user-1');

      const updateArg = mockUpdate.mock.calls[0][1];
      expect(updateArg.isVisible).toBe(false);
      expect(result.isVisible).toBe(false);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('merges dto fields and preserves existing fields', async () => {
      const marker = { _id: 'mk_1', label: 'old label', color: '#ff0000', isVisible: true };
      mockFindById.mockResolvedValue(marker);
      mockUpdate.mockImplementation((_orgId: string, doc: any) => Promise.resolve(doc));

      const result = await service.update('org-1', 'mk_1', { label: 'new label' }, 'user-1');

      expect(result.label).toBe('new label');
      expect(result.color).toBe('#ff0000');  // unchanged
    });
  });
});
