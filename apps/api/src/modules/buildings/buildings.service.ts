import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Building } from '@ax/shared';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateBuildingDto, userId: string): Promise<Building> {
    const id = `building:${orgId}:bldg_${uuid().slice(0, 12)}`;
    const now = new Date().toISOString();

    const building: Building = {
      _id: id,
      docType: 'building',
      orgId,
      complexId: dto.complexId,
      name: dto.name,
      code: dto.code,
      totalFloors: dto.totalFloors,
      undergroundFloors: dto.undergroundFloors,
      totalUnits: dto.totalUnits,
      builtDate: dto.builtDate,
      structureType: dto.structureType,
      qrCode: `AX:building:${orgId}:${id}`,
      modelUrl: dto.modelUrl,
      floorPlanUrls: {},
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, building);
  }

  async findByComplex(orgId: string, complexId: string): Promise<Building[]> {
    const { docs } = await this.couch.find<Building>(
      orgId,
      { docType: 'building', orgId, complexId },
      { limit: 100, sort: [{ name: 'asc' }] },
    );
    return docs;
  }

  async findById(orgId: string, id: string): Promise<Building> {
    const doc = await this.couch.findById<Building>(orgId, id);
    if (!doc || doc._deleted || doc.orgId !== orgId) {
      throw new NotFoundException(`동 ${id}를 찾을 수 없습니다.`);
    }
    return doc;
  }

  async update(
    orgId: string, id: string, dto: UpdateBuildingDto, userId: string,
  ): Promise<Building> {
    const building = await this.findById(orgId, id);
    const updated: Building = {
      ...building,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    return this.couch.update(orgId, updated);
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }
}
