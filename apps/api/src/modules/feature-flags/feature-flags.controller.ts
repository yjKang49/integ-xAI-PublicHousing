// apps/api/src/modules/feature-flags/feature-flags.controller.ts
import {
  Controller, Get, Put, Post,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, IsArray } from 'class-validator'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { FeatureFlagsService, UpsertFeatureFlagDto } from './feature-flags.service'
import { UserRole } from '@ax/shared'

class UpsertFlagBodyDto implements UpsertFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledForOrgIds?: string[]

  @IsOptional()
  metadata?: Record<string, any>
}

class CheckFlagDto {
  @IsString()
  key: string

  @IsOptional()
  @IsString()
  orgId?: string
}

@ApiTags('Feature Flags — 기능 플래그')
@ApiBearerAuth()
@Controller({ path: 'feature-flags', version: '1' })
export class FeatureFlagsController {
  constructor(private readonly svc: FeatureFlagsService) {}

  /**
   * 전체 플래그 목록 (SUPER_ADMIN, ORG_ADMIN)
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '전체 Feature Flag 목록 조회' })
  findAll() {
    return this.svc.findAll()
  }

  /**
   * 단일 플래그 조회 — 인증된 모든 사용자
   */
  @Get(':key')
  @ApiOperation({ summary: 'Feature Flag 단일 조회' })
  findByKey(@Param('key') key: string) {
    return this.svc.findByKey(key)
  }

  /**
   * 플래그 생성/수정 (SUPER_ADMIN 전용)
   */
  @Put(':key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Feature Flag 생성 또는 수정 (SUPER_ADMIN)' })
  @ApiBody({ type: UpsertFlagBodyDto })
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertFlagBodyDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.upsert(key, dto, user.sub ?? user._id)
  }

  /**
   * 플래그 활성화 여부 확인 — 프런트엔드 전용 경량 엔드포인트
   * 인증된 모든 사용자 호출 가능
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Feature Flag 활성화 여부 확인 (프런트엔드용)',
    description: '{ key, orgId? } → { enabled: boolean }',
  })
  @ApiBody({ type: CheckFlagDto })
  async check(
    @Body() dto: CheckFlagDto,
    @CurrentUser() user: any,
  ): Promise<{ enabled: boolean }> {
    const orgId = dto.orgId ?? user?.orgId
    const enabled = await this.svc.isEnabled(dto.key, orgId)
    return { enabled }
  }
}
