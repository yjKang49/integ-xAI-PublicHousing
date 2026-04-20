import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Zone } from '@ax/shared';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

const CACHE_TTL = 10;

@Injectable()
export class ZonesService {
  private readonly computingKeys = new Set<string>();

  constructor(
    private readonly couch: CouchService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

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
    const cacheKey = `zones:floor:${orgId}:${floorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150));
      const retry = await this.redis.get(cacheKey);
      if (retry) return JSON.parse(retry);
    }
    this.computingKeys.add(cacheKey);
    const fresh = await this.redis.get(cacheKey);
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh); }
    try {
      const { docs } = await this.couch.find<Zone>(orgId, { docType: 'zone', orgId, floorId }, { limit: 100, sort: [{ name: 'asc' }] });
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(docs));
      return docs;
    } finally { this.computingKeys.delete(cacheKey); }
  }

  async findByBuilding(orgId: string, buildingId: string): Promise<Zone[]> {
    const cacheKey = `zones:building:${orgId}:${buildingId ?? 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150));
      const retry = await this.redis.get(cacheKey);
      if (retry) return JSON.parse(retry);
    }
    this.computingKeys.add(cacheKey);
    const fresh = await this.redis.get(cacheKey);
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh); }
    try {
      const selector: Record<string, any> = { docType: 'zone', orgId };
      if (buildingId) selector.buildingId = buildingId;
      const { docs } = await this.couch.find<Zone>(orgId, selector, { limit: 200 });
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(docs));
      return docs;
    } finally { this.computingKeys.delete(cacheKey); }
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
