import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplexesService } from './complexes.service';
import { CreateComplexDto } from './dto/create-complex.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Complexes')
@ApiBearerAuth()
@Controller({ path: 'complexes', version: '1' })
export class ComplexesController {
  constructor(private readonly svc: ComplexesService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '단지 등록' })
  create(@Body() dto: CreateComplexDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '단지 목록' })
  findAll(@CurrentUser() user: CurrentUserDto) {
    const orgId = user.role === UserRole.SUPER_ADMIN
      ? user.organizationId   // SUPER_ADMIN can specify; default to their org
      : user.organizationId;
    return this.svc.findAll(orgId);
  }

  @Get(':id/tree')
  @ApiOperation({ summary: '단지 전체 트리 (건물 > 층 > 구역)' })
  getTree(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findTree(user.organizationId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: '단지 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '단지 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplexDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '단지 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.remove(user.organizationId, id);
  }
}
