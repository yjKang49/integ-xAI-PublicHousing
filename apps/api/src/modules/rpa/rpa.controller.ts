// apps/api/src/modules/rpa/rpa.controller.ts
import {
  Controller, Post, Get, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, CreateRpaTaskInput } from '@ax/shared';
import { RpaService } from './rpa.service';

@ApiTags('RPA — 지능형 행정자동화')
@ApiBearerAuth()
@Controller('rpa')
export class RpaController {
  constructor(private readonly rpaService: RpaService) {}

  /**
   * RPA 작업 즉시 실행 또는 스케줄 등록
   * AX-SPRINT: 관리비 80% · 계약만료 100% · 민원 70% · 점검일정 90% 자동화
   */
  @Post('tasks')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'RPA 작업 등록',
    description: `AX-SPRINT 행정자동화 작업을 Bull Queue에 등록합니다.
    - BILL_GENERATION: 관리비 고지서 자동 생성 (목표 80%)
    - CONTRACT_EXPIRY_NOTICE: 계약 만료 알림 자동 발송 (목표 100%)
    - COMPLAINT_INTAKE: 민원 AI 자동 분류 (목표 70%)
    - INSPECTION_SCHEDULE: 점검 일정 자동 생성 (목표 90%)`,
  })
  async enqueueTask(
    @CurrentUser() user: { orgId: string },
    @Body() body: CreateRpaTaskInput,
  ) {
    return this.rpaService.enqueue(user.orgId, body);
  }

  /**
   * RPA 자동화 현황 대시보드 조회
   */
  @Get('summary')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({
    summary: 'RPA 자동화 현황 조회',
    description: '오늘 실행 건수, 작업 유형별 자동화율, 절감 추정 시간을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: 'RPA 자동화 현황' })
  async getSummary(@CurrentUser() user: { orgId: string }) {
    return this.rpaService.getAutomationSummary(user.orgId);
  }

  /**
   * 계약 만료 알림 즉시 실행 (100% 자동화 목표)
   */
  @Post('contract-expiry/run')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '계약 만료 알림 즉시 실행' })
  async runContractExpiryNotice(@CurrentUser() user: { orgId: string }) {
    return this.rpaService.scheduleContractExpiryNotices(user.orgId);
  }
}
