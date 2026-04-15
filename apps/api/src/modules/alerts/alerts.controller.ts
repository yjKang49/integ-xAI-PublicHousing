import {
  Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, AlertQueryDto } from './dto/alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(private readonly svc: AlertsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '알림 수동 생성' })
  create(@Body() dto: CreateAlertDto, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '알림 목록 조회' })
  findAll(@Query() query: AlertQueryDto, @CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Get('count/active')
  @ApiOperation({ summary: '활성 알림 수 (severity별)' })
  countActive(@Query('complexId') complexId: string, @CurrentUser() user: any) {
    return this.svc.countActive(user.organizationId, complexId);
  }

  @Get(':id')
  @ApiOperation({ summary: '알림 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: '알림 확인(인지) 처리' })
  acknowledge(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.acknowledge(user.organizationId, id, user._id);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: '알림 해결 처리' })
  resolve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.resolve(user.organizationId, id, user._id);
  }
}
