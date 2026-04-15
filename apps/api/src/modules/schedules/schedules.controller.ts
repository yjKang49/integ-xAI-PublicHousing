import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleQueryDto } from './dto/schedule.dto';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller({ path: 'schedules', version: '1' })
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '일정 생성' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '일정 목록' })
  findAll(@Query() query: ScheduleQueryDto, @CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Get('check-overdue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '기한 초과 일정 점검 및 알림 생성 (수동 트리거)' })
  checkOverdue(@CurrentUser() user: any) {
    return this.svc.checkOverdue(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: '일정 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '일정 수정' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  @Patch(':id/complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '일정 완료 처리 → 다음 발생일 자동 계산' })
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.complete(user.organizationId, id, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '일정 삭제 (soft)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(user.organizationId, id);
  }
}
