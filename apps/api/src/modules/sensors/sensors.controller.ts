// apps/api/src/modules/sensors/sensors.controller.ts
// Phase 2-8: IoT 센서 기기 REST API

import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ax/shared';
import { SensorsService } from './sensors.service';
import { CreateSensorDeviceDto, UpdateSensorDeviceDto, SensorDeviceQueryDto } from './dto/sensor.dto';

@ApiTags('IoT Sensors')
@ApiBearerAuth()
@Controller({ path: 'sensors', version: '1' })
export class SensorsController {
  constructor(private readonly service: SensorsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '센서 기기 등록' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSensorDeviceDto) {
    return this.service.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '센서 기기 목록 조회' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SensorDeviceQueryDto) {
    return this.service.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '센서 기기 단건 조회' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '센서 기기 정보 수정' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSensorDeviceDto) {
    return this.service.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '센서 기기 삭제' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.organizationId, id);
  }
}
