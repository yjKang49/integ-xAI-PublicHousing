import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { CracksService } from './cracks.service';
import {
  CreateGaugePointDto, UpdateGaugePointDto,
  CreateMeasurementDto, MeasurementQueryDto,
} from './dto/crack.dto';

@ApiTags('Cracks')
@ApiBearerAuth()
@Controller({ path: 'cracks', version: '1' })
export class CracksController {
  constructor(private readonly svc: CracksService) {}

  // ── GaugePoints ───────────────────────────────────────────────

  @Post('gauge-points')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '균열 게이지 포인트 등록' })
  createGaugePoint(@Body() dto: CreateGaugePointDto, @CurrentUser() user: any) {
    return this.svc.createGaugePoint(user.orgId, dto, user.sub ?? user._id);
  }

  @Get('gauge-points')
  @ApiOperation({ summary: '균열 게이지 포인트 목록' })
  @ApiQuery({ name: 'complexId',  required: false })
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'isActive',   required: false })
  @ApiQuery({ name: 'page',       required: false })
  @ApiQuery({ name: 'limit',      required: false })
  listGaugePoints(
    @Query('complexId')  complexId:  string,
    @Query('buildingId') buildingId: string,
    @Query('isActive')   isActive:   string,
    @Query('page')       page:       string,
    @Query('limit')      limit:      string,
    @CurrentUser() user: any,
  ) {
    return this.svc.findGaugePoints(user.orgId, {
      complexId,
      buildingId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page:     page  ? +page  : undefined,
      limit:    limit ? +limit : undefined,
    });
  }

  @Get('gauge-points/:id')
  @ApiOperation({ summary: '균열 게이지 포인트 상세' })
  getGaugePoint(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findGaugePointById(user.orgId, id);
  }

  @Patch('gauge-points/:id')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '균열 게이지 포인트 수정' })
  updateGaugePoint(
    @Param('id') id: string,
    @Body() dto: UpdateGaugePointDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.updateGaugePoint(user.orgId, id, dto, user.sub ?? user._id);
  }

  @Delete('gauge-points/:id')
  @Roles(UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '균열 게이지 포인트 삭제 (soft)' })
  removeGaugePoint(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.removeGaugePoint(user.orgId, id);
  }

  @Get('gauge-points/:id/trend')
  @ApiOperation({ summary: '균열 추세 분석 (시계열 데이터)' })
  @ApiQuery({ name: 'days', required: false, description: '조회 기간 (일), 기본 90' })
  getTrend(
    @Param('id') id: string,
    @Query('days') days: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getTrend(user.orgId, id, days ? +days : 90);
  }

  // ── Measurements ──────────────────────────────────────────────

  @Post('measurements')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '균열 측정값 등록 (OpenCV.js 결과)' })
  createMeasurement(@Body() dto: CreateMeasurementDto, @CurrentUser() user: any) {
    return this.svc.createMeasurement(user.orgId, dto, user.sub ?? user._id);
  }

  @Get('measurements')
  @ApiOperation({ summary: '균열 측정값 목록' })
  listMeasurements(@Query() query: MeasurementQueryDto, @CurrentUser() user: any) {
    return this.svc.findMeasurements(user.orgId, query);
  }

  @Get('measurements/:id')
  @ApiOperation({ summary: '균열 측정값 상세' })
  getMeasurement(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findMeasurementById(user.orgId, id);
  }
}
