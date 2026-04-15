// apps/api/src/modules/complaints/complaints.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CouchService } from '../../database/couch.service';
import { ComplaintStatus } from '@ax/shared';

const mockCouch = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

const makeComplaint = (overrides: Partial<any> = {}) => ({
  _id: 'complaint:org001:cmp_001',
  docType: 'complaint',
  orgId: 'org001',
  complexId: 'cplx001',
  category: 'FACILITY',
  status: ComplaintStatus.RECEIVED,
  title: '화장실 누수',
  description: '천장에서 물이 떨어집니다',
  priority: 'HIGH',
  submittedBy: '박입주민',
  submittedAt: '2024-03-15T08:00:00Z',
  mediaIds: [],
  timeline: [
    { timestamp: '2024-03-15T08:00:00Z', fromStatus: null, toStatus: ComplaintStatus.RECEIVED, actorId: 'system' },
  ],
  createdAt: '2024-03-15T08:00:00Z',
  updatedAt: '2024-03-15T08:00:00Z',
  createdBy: 'system',
  updatedBy: 'system',
  ...overrides,
});

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let couch: ReturnType<typeof mockCouch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: CouchService, useFactory: mockCouch },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    couch = module.get(CouchService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create()', () => {
    it('should create complaint with RECEIVED status', async () => {
      couch.create.mockResolvedValue({ ...makeComplaint(), _rev: 'rev1' });

      await service.create('org001', {
        complexId: 'cplx001', category: 'FACILITY',
        title: '누수', description: '설명', submittedBy: '홍길동',
      } as any, 'system');

      expect(couch.create).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({ status: ComplaintStatus.RECEIVED }),
      );
    });

    it('should create URGENT alert for priority=URGENT complaints', async () => {
      const saved = makeComplaint({ priority: 'URGENT' });
      couch.create
        .mockResolvedValueOnce({ ...saved, _rev: 'rev1' }) // complaint
        .mockResolvedValueOnce({ _id: 'alert_001', _rev: 'rev1' }); // alert

      await service.create('org001', {
        complexId: 'cplx001', category: 'FACILITY',
        title: '긴급', description: '즉시 조치', submittedBy: '홍길동',
        priority: 'URGENT',
      } as any, 'system');

      expect(couch.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateStatus() — status transitions', () => {
    it('should allow RECEIVED → ASSIGNED', async () => {
      const complaint = makeComplaint({ status: ComplaintStatus.RECEIVED });
      couch.findById.mockResolvedValue(complaint);
      couch.update.mockResolvedValue({ ...complaint, status: ComplaintStatus.ASSIGNED, _rev: 'rev2' });

      await service.updateStatus('org001', complaint._id, {
        status: ComplaintStatus.ASSIGNED, assignedTo: 'user:org001:usr_001',
      }, 'usr_mgr');

      expect(couch.update).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({ status: ComplaintStatus.ASSIGNED }),
      );
    });

    it('should append event to timeline on status change', async () => {
      const complaint = makeComplaint({ status: ComplaintStatus.RECEIVED });
      couch.findById.mockResolvedValue(complaint);
      couch.update.mockImplementation((_orgId: string, doc: any) => Promise.resolve(doc));

      await service.updateStatus('org001', complaint._id, {
        status: ComplaintStatus.ASSIGNED,
      }, 'usr_mgr');

      expect(couch.update).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({
          timeline: expect.arrayContaining([
            expect.objectContaining({
              fromStatus: ComplaintStatus.RECEIVED,
              toStatus: ComplaintStatus.ASSIGNED,
              actorId: 'usr_mgr',
            }),
          ]),
        }),
      );
    });

    it('should reject invalid transition CLOSED → any', async () => {
      const complaint = makeComplaint({ status: ComplaintStatus.CLOSED });
      couch.findById.mockResolvedValue(complaint);

      await expect(
        service.updateStatus('org001', complaint._id, { status: ComplaintStatus.RECEIVED }, 'usr'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject invalid transition RECEIVED → RESOLVED', async () => {
      const complaint = makeComplaint({ status: ComplaintStatus.RECEIVED });
      couch.findById.mockResolvedValue(complaint);

      await expect(
        service.updateStatus('org001', complaint._id, { status: ComplaintStatus.RESOLVED }, 'usr'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should set resolvedAt when transitioning to RESOLVED', async () => {
      const complaint = makeComplaint({ status: ComplaintStatus.IN_PROGRESS });
      couch.findById.mockResolvedValue(complaint);
      couch.update.mockImplementation((_orgId: string, doc: any) => Promise.resolve(doc));

      await service.updateStatus('org001', complaint._id, {
        status: ComplaintStatus.RESOLVED,
        resolutionNotes: '수리 완료',
      }, 'usr_mgr');

      expect(couch.update).toHaveBeenCalledWith(
        'org001',
        expect.objectContaining({
          resolvedAt: expect.any(String),
          resolutionNotes: '수리 완료',
        }),
      );
    });
  });

  describe('findById()', () => {
    it('should throw NotFoundException for unknown id', async () => {
      couch.findById.mockResolvedValue(null);
      await expect(service.findById('org001', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
