// apps/api/src/modules/automation-executions/automation-executions.controller.ts
import {
  Controller, Get, Patch, Param, Body, Query, HttpCode, HttpStatus, Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiParam } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AutomationExecutionsService } from './automation-executions.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, AutomationExecutionStatus, AutomationTriggerType } from '@ax/shared';

class WorkerResultDto {
  @IsEnum(AutomationExecutionStatus) status: AutomationExecutionStatus;
  @IsOptional() @IsArray() actionsExecuted?: unknown[];
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsString() summary?: string;
}

class QueryDto {
  @IsOptional() @IsString() ruleId?: string;
  @IsOptional() @IsEnum(AutomationExecutionStatus) status?: AutomationExecutionStatus;
  @IsOptional() @IsEnum(AutomationTriggerType) triggerType?: AutomationTriggerType;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}

@ApiTags('Automation Executions — 자동화 실행 이력')
@ApiBearerAuth()
@Controller({ path: 'automation-executions', version: '1' })
export class AutomationExecutionsController {
  constructor(private readonly svc: AutomationExecutionsService) {}

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '자동화 실행 이력 목록' })
  @ApiQuery({ name: 'ruleId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AutomationExecutionStatus })
  @ApiQuery({ name: 'triggerType', required: false, enum: AutomationTriggerType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: QueryDto, @CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, query as any);
  }

  @Get('summary')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '실행 통계 요약' })
  getSummary(@CurrentUser() user: any) {
    return this.svc.getSummary(user.organizationId);
  }

  @Get(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '실행 이력 단건 조회' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findById(user.organizationId, id);
  }

  /** Job Worker 전용 — 실행 결과 콜백 수신 */
  @Patch(':id/result')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Worker 전용] 실행 결과 수신',
    description: 'X-Worker-Secret 헤더 인증. Job Worker가 실행 완료 후 결과를 전달합니다.',
  })
  receiveResult(
    @Param('id') id: string,
    @Query('orgId') orgId: string,
    @Body() dto: WorkerResultDto,
    @Headers('x-worker-secret') secret: string,
  ) {
    const expected = process.env.WORKER_SECRET ?? 'dev-worker-secret';
    if (secret !== expected) throw new ForbiddenException('Invalid worker secret');
    return this.svc.receiveWorkerResult(orgId, id, dto as any);
  }
}
