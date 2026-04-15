import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '기관 등록 (SUPER_ADMIN)' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(dto, user._id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '전체 기관 목록' })
  findAll() {
    return this.svc.findAll();
  }

  /**
   * 현재 사용자의 조직 정보 조회.
   * `:id` 라우트보다 먼저 등록해야 'current'가 ID로 오인되지 않음.
   */
  @Get('current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '내 조직 상세 조회' })
  findCurrent(@CurrentUser() user: CurrentUserDto) {
    return this.svc.findByOrgId(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '기관 상세 조회 (문서 ID)' })
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '기관 정보 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '기관 삭제 (soft)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
