import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller({ path: 'buildings', version: '1' })
export class BuildingsController {
  constructor(private readonly svc: BuildingsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '동 등록' })
  create(@Body() dto: CreateBuildingDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiQuery({ name: 'complexId', required: true })
  @ApiOperation({ summary: '동 목록 (단지별)' })
  findAll(@Query('complexId') complexId: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findByComplex(user.organizationId, complexId);
  }

  @Get(':id')
  @ApiOperation({ summary: '동 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '동 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBuildingDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '동 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.remove(user.organizationId, id);
  }
}
