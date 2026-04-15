import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Organization } from '@ax/shared';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

// Organizations are platform-level — stored in the _platform DB
const PLATFORM_ORG = '_platform';

@Injectable()
export class OrganizationsService {
  constructor(private readonly couch: CouchService) {}

  async create(dto: CreateOrganizationDto, userId: string): Promise<Organization> {
    // 사업자등록번호 중복 체크
    const { docs: existing } = await this.couch.find<Organization>(PLATFORM_ORG, {
      docType: 'organization',
      businessNumber: dto.businessNumber,
    });
    if (existing.length > 0) {
      throw new ConflictException(`사업자등록번호 ${dto.businessNumber} 이미 등록된 기관입니다.`);
    }

    const orgId = `org_${uuid().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const org: Organization = {
      _id: `organization:_platform:${orgId}`,
      docType: 'organization',
      orgId: PLATFORM_ORG,
      ...dto,
      dbName: `ax_${orgId}_dev`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    const saved = await this.couch.create(PLATFORM_ORG, org);

    // org DB를 미리 생성 (getOrgDb 호출로 자동 생성)
    await this.couch.getOrgDb(orgId);

    return { ...saved, _orgId: orgId } as any;
  }

  async findAll(): Promise<Organization[]> {
    const { docs } = await this.couch.find<Organization>(
      PLATFORM_ORG,
      { docType: 'organization' },
      { limit: 100, sort: [{ createdAt: 'desc' }] },
    );
    return docs;
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.couch.findById<Organization>(PLATFORM_ORG, id);
    if (!org || org._deleted) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  /** orgId (e.g. 'org_seed001') 로 조직 문서 조회 */
  async findByOrgId(orgId: string): Promise<Organization> {
    const { docs } = await this.couch.find<Organization>(
      PLATFORM_ORG,
      { docType: 'organization', _id: `organization:_platform:${orgId}` },
      { limit: 1 },
    );
    if (docs.length === 0) {
      // fallback: scan by dbName pattern
      const { docs: all } = await this.couch.find<Organization>(
        PLATFORM_ORG,
        { docType: 'organization' },
        { limit: 200 },
      );
      const org = all.find((o) => o.dbName?.includes(orgId) || o._id?.includes(orgId));
      if (!org) throw new NotFoundException(`조직 '${orgId}'을 찾을 수 없습니다.`);
      return org;
    }
    return docs[0];
  }

  async update(id: string, dto: UpdateOrganizationDto, userId: string): Promise<Organization> {
    const org = await this.findById(id);
    const updated: Organization = {
      ...org,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    return this.couch.update(PLATFORM_ORG, updated);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // 존재 확인
    await this.couch.softDelete(PLATFORM_ORG, id);
  }
}
