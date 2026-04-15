import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FloorsService } from './floors.service';
import { CreateFloorDto, UpdateFloorDto } from './dto/create-floor.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Floors')
@ApiBearerAuth()
@Controller({ path: 'floors', version: '1' })
export class FloorsController {
  constructor(private readonly svc: FloorsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '층 등록' })
  create(@Body() dto: CreateFloorDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiOperation({ summary: '층 목록 (동별)' })
  findAll(@Query('buildingId') buildingId: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findByBuilding(user.organizationId, buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: '층 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '층 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFloorDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '층 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.remove(user.organizationId, id);
  }
}
