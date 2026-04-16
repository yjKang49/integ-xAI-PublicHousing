import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UserRole } from '@ax/shared';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '사용자 생성' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.svc.create(dto, user.sub ?? user._id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER)
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiOperation({ summary: '사용자 목록' })
  findAll(@Query('organizationId') organizationId: string, @CurrentUser() user: any) {
    // SUPER_ADMIN만 다른 org 조회 가능, 나머지는 자신의 org로 강제
    const orgFilter = user.role === UserRole.SUPER_ADMIN
      ? organizationId
      : user.organizationId ?? user.orgId;
    return this.svc.findAll(orgFilter);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '사용자 상세' })
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '사용자 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.update(id, dto, user.sub ?? user._id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '사용자 삭제 (soft)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.sub ?? user._id);
  }
}
