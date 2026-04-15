import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Floor } from '@ax/shared';
import { CreateFloorDto, UpdateFloorDto } from './dto/create-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateFloorDto, userId: string): Promise<Floor> {
    const id = `floor:${orgId}:flr_${uuid().slice(0, 12)}`;
    const now = new Date().toISOString();

    const floor: Floor = {
      _id: id,
      docType: 'floor',
      orgId,
      buildingId: dto.buildingId,
      complexId: dto.complexId,
      floorNumber: dto.floorNumber,
      floorName: dto.floorName,
      area: dto.area,
      planImageUrl: dto.planImageUrl,
      zones: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, floor);
  }

  async findByBuilding(orgId: string, buildingId: string): Promise<Floor[]> {
    const { docs } = await this.couch.find<Floor>(
      orgId,
      { docType: 'floor', orgId, buildingId },
      { limit: 50, sort: [{ floorNumber: 'asc' }] },
    );
    return docs;
  }

  async findById(orgId: string, id: string): Promise<Floor> {
    const doc = await this.couch.findById<Floor>(orgId, id);
    if (!doc || doc._deleted || doc.orgId !== orgId) {
      throw new NotFoundException(`층 ${id}를 찾을 수 없습니다.`);
    }
    return doc;
  }

  async update(orgId: string, id: string, dto: UpdateFloorDto, userId: string): Promise<Floor> {
    const floor = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...floor, ...dto,
      updatedAt: new Date().toISOString(), updatedBy: userId,
    });
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }
}
