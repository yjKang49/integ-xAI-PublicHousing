// apps/api/src/modules/defects/defects.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DefectsService } from './defects.service';
import { CouchService } from '../../database/couch.service';
import { DefectType, SeverityLevel } from '@ax/shared';

// ── Mock factory ────────────────────────────────────────────────
const mockCouchService = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

const makeDefect = (overrides: Partial<any> = {}) => ({
  _id: 'defect:org001:def_001',
  docType: 'defect',
  orgId: 'org001',
  sessionId: 'session:org001:ses_001',
  projectId: 'project:org001:prj_001',
  complexId: 'cplx001',
  buildingId: 'bldg001',
  defectType: DefectType.CRACK,
  severity: SeverityLevel.MEDIUM,
  description: 'Test crack',
  locationDescription: '3F stairwell',
  mediaIds: [],
  isRepaired: false,
  createdAt: '2024-03-15T10:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
  createdBy: 'user:org001:usr_001',
  updatedBy: 'user:org001:usr_001',
  ...overrides,
});

// ── Test suite ───────────────────────────────────────────────────
describe('DefectsService', () => {
  let service: DefectsService;
  let couch: ReturnType<typeof mockCouchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefectsService,
        { provide: CouchService, useFactory: mockCouchService },
      ],
    }).compile();

    service = module.get<DefectsService>(DefectsService);
    couch = module.get(CouchService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ────────────────────────────────

  describe('create()', () => {
    const dto = {
      sessionId: 'session:org001:ses_001',
      projectId: 'project:org001:prj_001',
      complexId: 'cplx001',
      buildingId: 'bldg001',
      defectType: DefectType.CRACK,
      severity: SeverityLevel.MEDIUM,
      description: 'Crack in wall',
      locationDescription: '3F north wall',
    };

    it('should create defect and return with _rev', async () => {
      const saved = { ...makeDefect(), _rev: 'rev1' };
      couch.create.mockResolvedValue(saved);

      const result = await service.create('org001', dto as any, 'user:org001:usr_001');

      expect(couch.create).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({
          docType: 'defect',
          orgId: 'org001',
          defectType: DefectType.CRACK,
          isRepaired: false,
        }),
      );
      expect(result._rev).toBe('rev1');
    });

    it('should auto-create CRITICAL alert when severity is CRITICAL', async () => {
      const criticalDefect = { ...makeDefect({ severity: SeverityLevel.CRITICAL }), _rev: 'rev1' };
      couch.create
        .mockResolvedValueOnce(criticalDefect) // defect save
        .mockResolvedValueOnce({ _id: 'alert:org001:alrt_001', _rev: 'rev1' }); // alert save

      await service.create('org001', { ...dto, severity: SeverityLevel.CRITICAL } as any, 'user:org001:usr_001');

      // create called twice: defect + alert
      expect(couch.create).toHaveBeenCalledTimes(2);
      expect(couch.create).toHaveBeenLastCalledWith(
        'org001',
        expect.objectContaining({ docType: 'alert', alertType: 'DEFECT_CRITICAL' }),
      );
    });

    it('should NOT create alert for non-CRITICAL severity', async () => {
      couch.create.mockResolvedValue({ ...makeDefect(), _rev: 'rev1' });

      await service.create('org001', dto as any, 'user:org001:usr_001');

      expect(couch.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── findById() ──────────────────────────────

  describe('findById()', () => {
    it('should return defect when found', async () => {
      const defect = makeDefect();
      couch.findById.mockResolvedValue(defect);

      const result = await service.findById('org001', defect._id);

      expect(result).toEqual(defect);
      expect(couch.findById).toHaveBeenCalledWith('org001', defect._id);
    });

    it('should throw NotFoundException when not found', async () => {
      couch.findById.mockResolvedValue(null);

      await expect(service.findById('org001', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted documents', async () => {
      couch.findById.mockResolvedValue({ ...makeDefect(), _deleted: true });

      await expect(service.findById('org001', 'defect:org001:def_001')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for cross-org access', async () => {
      couch.findById.mockResolvedValue(makeDefect({ orgId: 'org002' }));

      await expect(service.findById('org001', 'defect:org002:def_001')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll() ───────────────────────────────

  describe('findAll()', () => {
    it('should return paginated defects', async () => {
      const defects = [makeDefect(), makeDefect({ _id: 'defect:org001:def_002' })];
      couch.find.mockResolvedValue({ docs: defects });

      const result = await service.findAll('org001', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by complexId when provided', async () => {
      couch.find.mockResolvedValue({ docs: [] });

      await service.findAll('org001', { complexId: 'cplx001', page: 1, limit: 20 });

      expect(couch.find).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({ complexId: 'cplx001' }),
        expect.any(Object),
      );
    });

    it('should filter by date range when provided', async () => {
      couch.find.mockResolvedValue({ docs: [] });

      await service.findAll('org001', {
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z',
      } as any);

      expect(couch.find).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({
          createdAt: { $gte: '2024-01-01T00:00:00Z', $lte: '2024-12-31T23:59:59Z' },
        }),
        expect.any(Object),
      );
    });

    it('should cap limit at 100', async () => {
      couch.find.mockResolvedValue({ docs: [] });

      await service.findAll('org001', { limit: 9999 } as any);

      expect(couch.find).toHaveBeenCalledWith(
        'org001',
        expect.any(Object),
        expect.objectContaining({ limit: 101 }), // +1 for hasNext check
      );
    });
  });

  // ── update() ────────────────────────────────

  describe('update()', () => {
    it('should update allowed fields', async () => {
      const existing = makeDefect();
      const updated = { ...existing, isRepaired: true, repairNotes: 'Fixed', _rev: 'rev2' };
      couch.findById.mockResolvedValue(existing);
      couch.update.mockResolvedValue(updated);

      const result = await service.update(
        'org001',
        existing._id,
        { isRepaired: true, repairNotes: 'Fixed' },
        'user:org001:usr_001',
      );

      expect(result.isRepaired).toBe(true);
      expect(couch.update).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({ isRepaired: true, repairNotes: 'Fixed' }),
      );
    });
  });
});
