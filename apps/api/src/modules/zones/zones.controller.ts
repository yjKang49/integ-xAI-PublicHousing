import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Zones')
@ApiBearerAuth()
@Controller({ path: 'zones', version: '1' })
export class ZonesController {
  constructor(private readonly svc: ZonesService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구역 등록' })
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiQuery({ name: 'floorId', required: false })
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiOperation({ summary: '구역 목록 (층별 또는 동별)' })
  findAll(
    @Query('floorId') floorId: string,
    @Query('buildingId') buildingId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    if (floorId) return this.svc.findByFloor(user.organizationId, floorId);
    return this.svc.findByBuilding(user.organizationId, buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: '구역 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구역 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '구역 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.remove(user.organizationId, id);
  }
}
