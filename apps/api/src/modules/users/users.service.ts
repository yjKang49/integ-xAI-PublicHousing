import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';
import { CouchService } from '../../database/couch.service';
import { User } from '@ax/shared';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

const PLATFORM_DB = '_platform';

@Injectable()
export class UsersService {
  constructor(private readonly couch: CouchService) {}

  async create(dto: CreateUserDto, createdBy: string): Promise<Omit<User, 'passwordHash' | 'refreshTokenHash'>> {
    // 이메일 중복 체크
    const { docs: existing } = await this.couch.find<User>(PLATFORM_DB, {
      docType: 'user',
      email: dto.email.toLowerCase().trim(),
    });
    if (existing.length > 0) {
      throw new ConflictException(`이메일 ${dto.email} 이미 등록된 사용자입니다.`);
    }

    const userId = `user:_platform:usr_${uuid().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const user: User = {
      _id: userId,
      docType: 'user',
      orgId: PLATFORM_DB,
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, 12),
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
      organizationId: dto.organizationId,
      assignedComplexIds: dto.assignedComplexIds ?? [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy,
    };

    const saved = await this.couch.create(PLATFORM_DB, user);
    return this.sanitize(saved);
  }

  async findAll(organizationId?: string) {
    const selector: any = { docType: 'user' };
    if (organizationId) selector.organizationId = organizationId;

    const { docs } = await this.couch.find<User>(PLATFORM_DB, selector, {
      limit: 200,
      sort: [{ createdAt: 'desc' }],
    });
    return docs.map(this.sanitize);
  }

  async findById(id: string) {
    const user = await this.couch.findById<User>(PLATFORM_DB, id);
    if (!user || user._deleted) throw new NotFoundException(`사용자 ${id}를 찾을 수 없습니다.`);
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, updatedBy: string) {
    const user = await this.couch.findById<User>(PLATFORM_DB, id);
    if (!user || user._deleted) throw new NotFoundException(`사용자 ${id}를 찾을 수 없습니다.`);

    const changes: Partial<User> = {
      ...(dto.name && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.role && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.assignedComplexIds && { assignedComplexIds: dto.assignedComplexIds }),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    if (dto.password) {
      (changes as any).passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.couch.update(PLATFORM_DB, { ...user, ...changes });
    return this.sanitize(updated);
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('자기 자신은 삭제할 수 없습니다.');
    }
    await this.findById(id);
    await this.couch.softDelete(PLATFORM_DB, id);
  }

  private sanitize(user: User): Omit<User, 'passwordHash' | 'refreshTokenHash'> {
    const { passwordHash, refreshTokenHash, ...rest } = user as any;
    return rest;
  }
}
