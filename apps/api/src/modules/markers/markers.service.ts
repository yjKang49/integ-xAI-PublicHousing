import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { DefectMarker3D, SeverityLevel, DefectType, floorFromMeshName } from '@ax/shared';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/create-marker.dto';

@Injectable()
export class MarkersService {
  constructor(private readonly couch: CouchService) {}

  async create(orgId: string, dto: CreateMarkerDto, userId: string): Promise<DefectMarker3D> {
    const now = new Date().toISOString();
    const id = `defectMarker3D:${orgId}:mk_${Date.now()}_${uuid().slice(0, 8)}`;

    const marker: DefectMarker3D = {
      _id: id,
      docType: 'defectMarker3D',
      orgId,
      defectId: dto.defectId,
      complexId: dto.complexId,
      buildingId: dto.buildingId,
      modelUrl: dto.modelUrl,
      position: dto.position,
      normal: dto.normal,
      meshName: dto.meshName,
      floor: dto.meshName ? (floorFromMeshName(dto.meshName) ?? undefined) : undefined,
      color: dto.color ?? '#FF6B6B',
      label: dto.label,
      iconType: dto.iconType ?? DefectType.OTHER,
      isVisible: true,
      historicalMarkerIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(orgId, marker);

    // Back-link: update defect with marker3DId
    try {
      const defect = await this.couch.findById<any>(orgId, dto.defectId);
      if (defect && !defect._deleted) {
        await this.couch.update(orgId, {
          ...defect,
          marker3DId: id,
          updatedAt: now,
          updatedBy: userId,
        });
      }
    } catch {
      // Non-fatal: defect may not exist yet in edge cases
    }

    return saved;
  }

  async findById(orgId: string, id: string): Promise<DefectMarker3D> {
    const doc = await this.couch.findById<DefectMarker3D>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`Marker ${id} not found`);
    return doc;
  }

  async findByBuilding(orgId: string, buildingId: string, query: {
    sessionId?: string;
    severity?: SeverityLevel;
  }): Promise<DefectMarker3D[]> {
    const selector: Record<string, any> = {
      docType: 'defectMarker3D',
      orgId,
      buildingId,
      isVisible: true,
    };

    const { docs: markers } = await this.couch.find<DefectMarker3D>(orgId, selector, {
      sort: [{ createdAt: 'desc' }],
    });

    if (!query.severity && !query.sessionId) return markers;

    // Filter by defect severity/session if requested — join in-process
    const defectIds = [...new Set(markers.map((m) => m.defectId))];
    if (defectIds.length === 0) return markers;

    const { docs: defects } = await this.couch.find<any>(orgId, {
      docType: 'defect',
      orgId,
      _id: { $in: defectIds },
      ...(query.severity && { severity: query.severity }),
      ...(query.sessionId && { sessionId: query.sessionId }),
    });

    const matchingDefectIds = new Set(defects.map((d: any) => d._id));
    return markers.filter((m) => matchingDefectIds.has(m.defectId));
  }

  async findByDefect(orgId: string, defectId: string): Promise<DefectMarker3D[]> {
    const { docs } = await this.couch.find<DefectMarker3D>(orgId, {
      docType: 'defectMarker3D',
      orgId,
      defectId,
    });
    return docs;
  }

  async update(orgId: string, id: string, dto: UpdateMarkerDto, userId: string): Promise<DefectMarker3D> {
    const marker = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...marker,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }

  async hide(orgId: string, id: string, userId: string): Promise<DefectMarker3D> {
    const marker = await this.findById(orgId, id);
    return this.couch.update(orgId, {
      ...marker,
      isVisible: false,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
  }
}
