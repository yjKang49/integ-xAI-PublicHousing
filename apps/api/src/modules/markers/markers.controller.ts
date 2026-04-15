// apps/api/src/modules/markers/markers.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, SeverityLevel } from '@ax/shared';
import { MarkersService } from './markers.service';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/create-marker.dto';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Markers')
@ApiBearerAuth()
@Controller({ path: 'markers', version: '1' })
export class MarkersController {
  constructor(private readonly markersService: MarkersService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '3D 마커 등록' })
  create(@Body() dto: CreateMarkerDto, @CurrentUser() user: CurrentUserDto) {
    return this.markersService.create(user.organizationId, dto, user._id);
  }

  /**
   * Primary endpoint for the 3D viewer — returns all visible markers for a building.
   * Optionally filter by sessionId or severity (requires defect join in-process).
   */
  @Get('building/:buildingId')
  @ApiOperation({ summary: '건물별 3D 마커 목록 (뷰어용)' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: SeverityLevel })
  findByBuilding(
    @Param('buildingId') buildingId: string,
    @Query('sessionId') sessionId?: string,
    @Query('severity') severity?: SeverityLevel,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    return this.markersService.findByBuilding(user!.organizationId, buildingId, { sessionId, severity });
  }

  @Get('defect/:defectId')
  @ApiOperation({ summary: '결함별 3D 마커 조회' })
  findByDefect(
    @Param('defectId') defectId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.markersService.findByDefect(user.organizationId, defectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '마커 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.markersService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '마커 위치/레이블 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMarkerDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.markersService.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '마커 숨기기 (소프트 삭제)' })
  hide(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.markersService.hide(user.organizationId, id, user._id);
  }
}
