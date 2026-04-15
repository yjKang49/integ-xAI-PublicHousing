// apps/api/src/modules/work-orders/work-orders.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto, UpdateWorkOrderDto, WorkOrderQueryDto } from './dto/work-order.dto';
import { UserRole, WorkOrderStatus } from '@ax/shared';

@ApiTags('WorkOrders')
@ApiBearerAuth()
@Controller({ path: 'work-orders', version: '1' })
export class WorkOrdersController {
  constructor(private readonly svc: WorkOrdersService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.REVIEWER)
  @ApiOperation({ summary: '작업지시 생성 (민원/결함 연계)' })
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiOperation({ summary: '작업지시 목록' })
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'complaintId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'status', required: false, enum: WorkOrderStatus })
  findAll(@Query() query: WorkOrderQueryDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '작업지시 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.INSPECTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '작업지시 수정 / 상태 변경' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, id, dto, user._id);
  }

  /** Mobile inspector: 현장 조치 시작 */
  @Patch(':id/start')
  @Roles(UserRole.INSPECTOR, UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현장 조치 시작 (OPEN → IN_PROGRESS)' })
  start(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.start(user.organizationId, id, user._id);
  }

  /** Mobile inspector: 현장 조치 완료 + 결과 등록 */
  @Patch(':id/complete')
  @Roles(UserRole.INSPECTOR, UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현장 조치 완료 등록 (IN_PROGRESS → COMPLETED)' })
  complete(
    @Param('id') id: string,
    @Body() dto: { actionNotes: string; actualCost?: number; mediaIds?: string[] },
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.complete(user.organizationId, id, dto, user._id);
  }
}
