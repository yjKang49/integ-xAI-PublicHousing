// apps/api/src/modules/external-integrations/external-integrations.controller.ts

import {
  Controller, Post, Get, Body, Query,
  UseGuards, Logger, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { KalisFmsService } from './kalis-fms.service';
import { SejumteoService } from './sejumteo.service';
import { KalisFmsSyncDto, SejumteoQueryDto } from './dto/external-integration.dto';

@ApiTags('external-integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('external-integrations')
export class ExternalIntegrationsController {
  private readonly logger = new Logger(ExternalIntegrationsController.name);

  constructor(
    private readonly kalisFms: KalisFmsService,
    private readonly sejumteo: SejumteoService,
  ) {}

  // ── KALIS-FMS ──────────────────────────────────────────────────────

  @Post('kalis-fms/sync')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(202)
  @ApiOperation({ summary: 'KALIS-FMS 시설물 결함 이력 동기화 (TRL-8)' })
  async syncKalisFms(
    @Body() dto: KalisFmsSyncDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`KALIS-FMS sync triggered by ${user.id}`);
    const result = await this.kalisFms.syncFacilityHistory(
      user.organizationId,
      dto.buildingId,
      dto.facilityCode,
    );
    return { success: true, data: result };
  }

  @Get('kalis-fms/aging-curve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '노후화 곡선 조회 (KALIS-FMS 30년 이력 기반)' })
  async getAgingCurve(
    @Query('buildingId') buildingId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.kalisFms.getAgingCurve(user.organizationId, buildingId);
    return { success: true, data: result };
  }

  // ── 세움터(건축물대장) ───────────────────────────────────────────────

  @Get('sejumteo/building')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '세움터 건축물대장 정보 조회 (TRL-8)' })
  async getSejumteoBuilding(@Query() query: SejumteoQueryDto) {
    const building = await this.sejumteo.getBuildingInfo(
      query.sigunguCd,
      query.bjdongCd,
      query.platGbCd ?? '0',
      query.bun,
      query.ji ?? '0000',
    );

    if (!building) {
      return { success: false, data: null, message: '건축물대장 정보를 찾을 수 없습니다.' };
    }

    const femInput = this.sejumteo.extractFemInput(building);
    return { success: true, data: { building, femInput } };
  }
}
