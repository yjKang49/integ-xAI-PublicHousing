// apps/api/src/modules/assets/assets.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly svc: AssetsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '시설자산 등록' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '시설자산 목록' })
  @ApiQuery({ name: 'complexId',  required: false })
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'floorId',    required: false })
  @ApiQuery({ name: 'zoneId',     required: false })
  @ApiQuery({ name: 'assetType',  required: false })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: CurrentUserDto,
    @Query('complexId')  complexId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('floorId')    floorId?: string,
    @Query('zoneId')     zoneId?: string,
    @Query('assetType')  assetType?: string,
    @Query('page')       page?: string,
    @Query('limit')      limit?: string,
  ) {
    return this.svc.findAll(user.organizationId, {
      complexId, buildingId, floorId, zoneId, assetType,
      page:  page  ? parseInt(page,  10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '시설자산 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '시설자산 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '시설자산 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.remove(user.organizationId, id, user._id);
  }
}
