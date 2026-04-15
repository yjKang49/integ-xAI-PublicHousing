import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { FacilityAsset } from '@ax/shared';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateAssetDto, userId: string): Promise<FacilityAsset> {
    const now = new Date().toISOString();
    const id = `facilityAsset:${orgId}:ast_${uuid().slice(0, 12)}`;

    const asset: FacilityAsset = {
      _id: id,
      docType: 'facilityAsset',
      orgId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      floorId: dto.floorId,
      zoneId: dto.zoneId,
      name: dto.name,
      code: dto.code,
      assetType: dto.assetType,
      material: dto.material,
      installDate: dto.installDate,
      serviceLifeYears: dto.serviceLifeYears,
      expectedReplacementDate: dto.expectedReplacementDate,
      qrCode: `AX-ASSET-${id}`,
      specifications: dto.specifications ?? {},
      riskLevel: dto.riskLevel,
      notes: dto.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, asset);
  }

  async findAll(orgId: string, query: {
    complexId?: string;
    buildingId?: string;
    floorId?: string;
    zoneId?: string;
    assetType?: string;
    page?: number;
    limit?: number;
  }) {
    const selector: Record<string, any> = { docType: 'facilityAsset', orgId };
    if (query.complexId)  selector.complexId  = query.complexId;
    if (query.buildingId) selector.buildingId = query.buildingId;
    if (query.floorId)    selector.floorId    = query.floorId;
    if (query.zoneId)     selector.zoneId     = query.zoneId;
    if (query.assetType)  selector.assetType  = query.assetType;

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);

    const { docs } = await this.couch.find<FacilityAsset>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findById(orgId: string, id: string): Promise<FacilityAsset> {
    const doc = await this.couch.findById<FacilityAsset>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Asset ${id} not found`);
    return doc;
  }

  async update(orgId: string, id: string, dto: UpdateAssetDto, userId: string): Promise<FacilityAsset> {
    const asset = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...asset,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  async remove(orgId: string, id: string, userId: string): Promise<{ deleted: boolean }> {
    const asset = await this.findById(orgId, id);
    await this.couch.update(orgId, {
      ...asset,
      _deleted: true,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
    return { deleted: true };
  }
}
