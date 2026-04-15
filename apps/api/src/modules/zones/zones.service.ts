import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Zone } from '@ax/shared';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateZoneDto, userId: string): Promise<Zone> {
    const id = `zone:${orgId}:zone_${uuid().slice(0, 12)}`;
    const now = new Date().toISOString();

    const zone: Zone = {
      _id: id,
      docType: 'zone',
      orgId,
      floorId: dto.floorId,
      buildingId: dto.buildingId,
      complexId: dto.complexId,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      qrCode: `AX:zone:${orgId}:${id}`,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, zone);
  }

  async findByFloor(orgId: string, floorId: string): Promise<Zone[]> {
    const { docs } = await this.couch.find<Zone>(
      orgId,
      { docType: 'zone', orgId, floorId },
      { limit: 100, sort: [{ name: 'asc' }] },
    );
    return docs;
  }

  async findByBuilding(orgId: string, buildingId: string): Promise<Zone[]> {
    const { docs } = await this.couch.find<Zone>(
      orgId,
      { docType: 'zone', orgId, buildingId },
      { limit: 200 },
    );
    return docs;
  }

  async findById(orgId: string, id: string): Promise<Zone> {
    const doc = await this.couch.findById<Zone>(orgId, id);
    if (!doc || doc._deleted || doc.orgId !== orgId) {
      throw new NotFoundException(`구역 ${id}를 찾을 수 없습니다.`);
    }
    return doc;
  }

  async update(orgId: string, id: string, dto: UpdateZoneDto, userId: string): Promise<Zone> {
    const zone = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...zone, ...dto,
      updatedAt: new Date().toISOString(), updatedBy: userId,
    });
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }
}
