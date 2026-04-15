// apps/api/src/modules/automation-rules/automation-rules.controller.ts
// Phase 2-7: RPA/업무 자동화 엔진 — 룰 CRUD + 수동 트리거 API

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiParam,
} from '@nestjs/swagger';
import {
  IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray,
  ValidateNested, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

import { AutomationRulesService } from './automation-rules.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserRole, AutomationRuleCategory, AutomationTriggerType,
  AutomationActionType, NotificationChannel, AlertType, SeverityLevel,
} from '@ax/shared';

// ── DTO ───────────────────────────────────────────────────────────────────

class AutomationTriggerDto {
  @IsEnum(AutomationTriggerType) type: AutomationTriggerType;
  @IsOptional() @IsString() cronExpression?: string;
  @IsOptional() @IsNumber() offsetDays?: number;
  @IsOptional() @IsString() targetField?: string;
  @IsOptional() @IsString() targetDocType?: string;
  @IsOptional() @IsString() watchDocType?: string;
  @IsOptional() @IsString() fromStatus?: string;
  @IsOptional() @IsString() toStatus?: string;
  @IsOptional() @IsString() metric?: string;
  @IsOptional() @IsString() operator?: string;
  @IsOptional() @IsNumber() threshold?: number;
}

class AutomationActionDto {
  @IsEnum(AutomationActionType) type: AutomationActionType;
  @IsOptional() @IsEnum(NotificationChannel) channel?: NotificationChannel;
  @IsOptional() @IsString() recipientField?: string;
  @IsOptional() @IsString() recipientStatic?: string;
  @IsOptional() @IsString() titleTemplate?: string;
  @IsOptional() @IsString() bodyTemplate?: string;
  @IsOptional() @IsEnum(AlertType) alertType?: AlertType;
  @IsOptional() @IsEnum(SeverityLevel) alertSeverity?: SeverityLevel;
  @IsOptional() @IsString() alertTitle?: string;
  @IsOptional() @IsString() alertBody?: string;
  @IsOptional() @IsString() scheduleTitle?: string;
  @IsOptional() @IsNumber() scheduleDaysOffset?: number;
  @IsOptional() @IsObject() params?: Record<string, unknown>;
}

class CreateAutomationRuleDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsString() ruleKey: string;
  @IsEnum(AutomationRuleCategory) category: AutomationRuleCategory;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @ValidateNested() @Type(() => AutomationTriggerDto) trigger: AutomationTriggerDto;
  @IsOptional() @IsArray() conditions?: unknown[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => AutomationActionDto)
  actions: AutomationActionDto[];
  @IsOptional() @IsString() targetComplexId?: string;
  @IsOptional() @IsNumber() priority?: number;
}

class UpdateAutomationRuleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @ValidateNested() @Type(() => AutomationTriggerDto) trigger?: AutomationTriggerDto;
  @IsOptional() @IsArray() conditions?: unknown[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AutomationActionDto)
  actions?: AutomationActionDto[];
  @IsOptional() @IsString() targetComplexId?: string;
  @IsOptional() @IsNumber() priority?: number;
}

class ToggleDto {
  @IsBoolean() isActive: boolean;
}

class QueryDto {
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @IsEnum(AutomationRuleCategory) category?: AutomationRuleCategory;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}

// ── Controller ────────────────────────────────────────────────────────────

@ApiTags('Automation Rules — 업무 자동화 룰')
@ApiBearerAuth()
@Controller({ path: 'automation-rules', version: '1' })
export class AutomationRulesController {
  constructor(private readonly svc: AutomationRulesService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '자동화 룰 생성' })
  create(@Body() dto: CreateAutomationRuleDto, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, dto as any, user._id);
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '자동화 룰 목록 조회' })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: AutomationRuleCategory })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: QueryDto, @CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, query as any);
  }

  @Get(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '자동화 룰 상세 조회' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '자동화 룰 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto, @CurrentUser() user: any) {
    return this.svc.update(user.organizationId, id, dto as any, user._id);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '자동화 룰 활성화/비활성화 토글' })
  toggle(@Param('id') id: string, @Body() dto: ToggleDto, @CurrentUser() user: any) {
    return this.svc.toggle(user.organizationId, id, dto.isActive, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '자동화 룰 삭제 (소프트)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(user.organizationId, id, user._id);
  }

  // ── 엔진 트리거 ─────────────────────────────────────────────────────────

  @Post(':id/execute')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '자동화 룰 수동 실행',
    description: '지정 룰을 즉시 수동으로 실행합니다. 실행 결과는 /automation-executions에서 조회하세요.',
  })
  triggerManual(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.triggerManual(user.organizationId, id, user._id);
  }

  @Post('scan')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '날짜 기반 룰 전체 스캔',
    description: 'DATE_BASED 트리거 룰 전체를 평가하여 발동 조건이 충족된 룰을 실행합니다. Job Worker에서 주기적으로 호출합니다.',
  })
  scan(@CurrentUser() user: any) {
    return this.svc.scanDateBasedRules(user.organizationId);
  }
}
