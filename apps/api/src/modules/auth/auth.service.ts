// apps/api/src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { User } from '@ax/shared';

const USERS_ORG = '_platform'; // users DB is platform-level

@Injectable()
export class AuthService {
  constructor(
    private readonly couch: CouchService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async login(email: string, password: string) {
    // Find user by email across platform DB
    const { docs } = await this.couch.find<User>(USERS_ORG, {
      docType: 'user',
      email: email.toLowerCase().trim(),
    });
    const user = docs[0];

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    // Store refresh token hash
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.couch.update(USERS_ORG, {
      ...user,
      refreshTokenHash: refreshHash,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user._id,
    });

    return {
      ...tokens,
      user: this.toProfile(user),
    };
  }

  async refresh(refreshToken: string) {
    // Check deny-list
    const isDenied = await this.redis.get(`deny:${refreshToken}`);
    if (isDenied) throw new UnauthorizedException('Token has been revoked');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.couch.findById<User>(USERS_ORG, payload.sub);
    if (!user || !user.isActive) throw new ForbiddenException('Account inactive');

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash ?? '');
    if (!valid) throw new UnauthorizedException('Refresh token mismatch');

    const tokens = await this.generateTokens(user);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.couch.update(USERS_ORG, {
      ...user,
      refreshTokenHash: refreshHash,
      updatedAt: new Date().toISOString(),
      updatedBy: user._id,
    });

    // Revoke old refresh token
    const oldExp = payload.exp - Math.floor(Date.now() / 1000);
    if (oldExp > 0) {
      await this.redis.setex(`deny:${refreshToken}`, oldExp, '1');
    }

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    let exp = 86400; // default 1 day TTL
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      if (payload?.exp) {
        exp = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
      }
    } catch {}

    if (exp > 0) {
      await this.redis.setex(`deny:${refreshToken}`, exp, '1');
    }

    // Clear stored refresh token
    const user = await this.couch.findById<User>(USERS_ORG, userId);
    if (user) {
      await this.couch.update(USERS_ORG, {
        ...user,
        refreshTokenHash: null,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });
    }
  }

  async getProfile(userId: string) {
    const user = await this.couch.findById<User>(USERS_ORG, userId);
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');
    return this.toProfile(user);
  }

  async validateJwtPayload(payload: any): Promise<(User & { orgId: string }) | null> {
    const user = await this.couch.findById<User>(USERS_ORG, payload.sub);
    if (!user?.isActive) return null;
    return { ...user, orgId: user.organizationId } as any;
  }

  private async generateTokens(user: User) {
    const jti = uuid();
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toProfile(user: User) {
    const { passwordHash, refreshTokenHash, ...profile } = user as any;
    return profile;
  }
}
