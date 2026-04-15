// apps/api/src/modules/jobs/jobs.controller.ts
import {
  Controller, Get, Post, Patch,
  Param, Body, Query, HttpCode, HttpStatus,
  UnauthorizedException,
  Headers,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { SkipAuth } from '../../common/decorators/skip-auth.decorator'
import { JobsService } from './jobs.service'
import { CreateJobDto, UpdateJobStatusDto } from './dto/create-job.dto'
import { UserRole, JobType, JobStatus } from '@ax/shared'

@ApiTags('Jobs — 비동기 작업 관리')
@ApiBearerAuth()
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly svc: JobsService) {}

  /**
   * 작업 목록 조회 (페이지네이션 + 필터)
   */
  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '작업 목록 조회' })
  @ApiQuery({ name: 'type',      required: false, enum: JobType })
  @ApiQuery({ name: 'status',    required: false, enum: JobStatus })
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query('type')      type?: JobType,
    @Query('status')    status?: JobStatus,
    @Query('complexId') complexId?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.svc.findAll(user.orgId, { type, status, complexId, page, limit })
  }

  /**
   * 작업 생성 — Bull 큐에 등록 후 즉시 반환
   */
  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '작업 생성 및 큐 등록' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateJobDto,
  ) {
    return this.svc.create(user.orgId, dto, user.sub ?? user._id)
  }

  /**
   * 단일 작업 조회
   */
  @Get(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '작업 상세 조회' })
  findById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.svc.findById(user.orgId, id)
  }

  /**
   * 작업 취소 (PENDING/QUEUED 상태만 가능)
   */
  @Post(':id/cancel')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '작업 취소 (PENDING/QUEUED 상태만)' })
  cancel(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.svc.cancel(user.orgId, id, user.sub ?? user._id)
  }

  /**
   * 작업 상태 업데이트 — 워커 전용 (JWT 없음, X-Worker-Secret 헤더 필요)
   */
  @Patch(':id/status')
  @SkipAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[내부] 워커 상태 콜백 — X-Worker-Secret 헤더 필수',
    description: 'JWT 인증 없음. 환경변수 WORKER_SECRET과 일치하는 헤더가 있어야 합니다.',
  })
  @ApiHeader({ name: 'X-Worker-Secret', required: true, description: '워커 시크릿 키' })
  @ApiQuery({ name: 'orgId', required: true, description: '조직 ID' })
  updateStatus(
    @Param('id') id: string,
    @Query('orgId') orgId: string,
    @Headers('x-worker-secret') workerSecret: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    const expected = process.env.WORKER_SECRET
    if (!expected || workerSecret !== expected) {
      throw new UnauthorizedException('Invalid worker secret')
    }
    return this.svc.updateStatus(orgId, id, dto)
  }
}
