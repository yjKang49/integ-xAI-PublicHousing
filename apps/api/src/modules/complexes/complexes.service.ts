import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { HousingComplex, Building, Floor, Zone } from '@ax/shared';
import { CreateComplexDto } from './dto/create-complex.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';

export interface ComplexTree extends HousingComplex {
  buildings: (Building & {
    floors: (Omit<Floor, 'zones'> & { zones: Zone[] })[];
  })[];
}

@Injectable()
export class ComplexesService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateComplexDto, userId: string): Promise<HousingComplex> {
    const id = `housingComplex:${orgId}:cplx_${uuid().slice(0, 12)}`;
    const now = new Date().toISOString();

    const complex: HousingComplex = {
      _id: id,
      docType: 'housingComplex',
      orgId,
      ...dto,
      tags: dto.tags ?? [],
      qrCode: `AX:housingComplex:${orgId}:${id}`,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.couch.create(orgId, complex);
  }

  async findAll(orgId: string): Promise<HousingComplex[]> {
    const { docs } = await this.couch.find<HousingComplex>(
      orgId,
      { docType: 'housingComplex', orgId },
      { limit: 100, sort: [{ createdAt: 'asc' }] },
    );
    return docs;
  }

  async findById(orgId: string, id: string): Promise<HousingComplex> {
    const doc = await this.couch.findById<HousingComplex>(orgId, id);
    if (!doc || doc._deleted || doc.orgId !== orgId) {
      throw new NotFoundException(`단지 ${id}를 찾을 수 없습니다.`);
    }
    return doc;
  }

  /**
   * Returns the entire hierarchy for a complex in a single call.
   * complex → buildings → floors → zones
   */
  async findTree(orgId: string, complexId: string): Promise<ComplexTree> {
    const complex = await this.findById(orgId, complexId);

    // Load all buildings for this complex
    const { docs: buildings } = await this.couch.find<Building>(
      orgId,
      { docType: 'building', orgId, complexId },
      { limit: 100 },
    );

    // Load all floors for this complex (one query instead of N)
    const { docs: allFloors } = await this.couch.find<Floor>(
      orgId,
      { docType: 'floor', orgId, complexId },
      { limit: 500 },
    );

    // Load all zones for this complex
    const { docs: allZones } = await this.couch.find<Zone>(
      orgId,
      { docType: 'zone', orgId, complexId },
      { limit: 1000 },
    );

    // Group floors by buildingId
    const floorsByBuilding = allFloors.reduce<Record<string, Floor[]>>((acc, f) => {
      (acc[f.buildingId] ??= []).push(f);
      return acc;
    }, {});

    // Group zones by floorId
    const zonesByFloor = allZones.reduce<Record<string, Zone[]>>((acc, z) => {
      (acc[z.floorId] ??= []).push(z);
      return acc;
    }, {});

    // Sort and assemble
    const sortedBuildings = buildings
      .filter((b) => !b._deleted)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((building) => ({
        ...building,
        floors: (floorsByBuilding[building._id] ?? [])
          .filter((f) => !f._deleted)
          .sort((a, b) => a.floorNumber - b.floorNumber)
          .map((floor) => ({
            ...floor,
            zones: (zonesByFloor[floor._id] ?? [])
              .filter((z) => !z._deleted)
              .sort((a, b) => a.name.localeCompare(b.name)),
          })),
      }));

    return { ...complex, buildings: sortedBuildings };
  }

  async update(
    orgId: string, id: string, dto: UpdateComplexDto, userId: string,
  ): Promise<HousingComplex> {
    const complex = await this.findById(orgId, id);
    const updated: HousingComplex = {
      ...complex,
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
