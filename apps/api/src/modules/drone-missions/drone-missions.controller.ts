// apps/api/src/modules/drone-missions/drone-missions.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiParam,
} from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CurrentUserDto } from '../../common/interfaces/current-user.interface'
import { UserRole } from '@ax/shared'
import { DroneMissionsService } from './drone-missions.service'
import {
  CreateDroneMissionDto, UpdateDroneMissionDto,
  InitDroneMediaUploadDto, CompleteDroneMediaUploadDto,
  DroneMissionQueryDto,
} from './dto/drone-mission.dto'

@ApiTags('Drone Missions — 드론 점검 미션')
@ApiBearerAuth()
@Controller({ path: 'drone-missions', version: '1' })
export class DroneMissionsController {
  constructor(private readonly svc: DroneMissionsService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '드론 미션 생성' })
  create(@Body() dto: CreateDroneMissionDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto, user._id)
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.VIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '드론 미션 목록 조회' })
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'status',    required: false })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(@Query() query: DroneMissionQueryDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findAll(user.organizationId, query)
  }

  @Get(':missionId')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.VIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '드론 미션 상세 조회' })
  findById(
    @Param('missionId') missionId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.findById(user.organizationId, missionId)
  }

  @Patch(':missionId')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR)
  @ApiOperation({ summary: '드론 미션 메타데이터 수정' })
  update(
    @Param('missionId') missionId: string,
    @Body() dto: UpdateDroneMissionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.update(user.organizationId, missionId, dto, user._id)
  }

  // ── 미디어 업로드 ────────────────────────────────────────────────────────────

  @Post(':missionId/media/upload/init')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '드론 미디어 업로드 초기화 (pre-signed URL 발급)',
    description: '반환된 uploadUrl에 파일을 PUT 한 후 /complete 호출',
  })
  initMediaUpload(
    @Param('missionId') missionId: string,
    @Body() dto: InitDroneMediaUploadDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.initMediaUpload(user.organizationId, missionId, dto, user._id)
  }

  @Patch(':missionId/media/:mediaItemId/complete')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR)
  @ApiOperation({
    summary: '드론 미디어 업로드 완료 (S3 검증 + 추출 Job 자동 생성)',
  })
  completeMediaUpload(
    @Param('missionId')   missionId: string,
    @Param('mediaItemId') mediaItemId: string,
    @Body() dto: CompleteDroneMediaUploadDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.completeMediaUpload(user.organizationId, missionId, mediaItemId, dto, user._id)
  }

  @Delete(':missionId/media/:mediaItemId')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '드론 미디어 항목 삭제' })
  removeMedia(
    @Param('missionId')   missionId: string,
    @Param('mediaItemId') mediaItemId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.removeMedia(user.organizationId, missionId, mediaItemId, user._id)
  }

  // ── AI 분석 ──────────────────────────────────────────────────────────────────

  @Post(':missionId/analyze')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '드론 미션 AI 분석 시작 (프레임 → DRONE_VIDEO_ANALYSIS / AI_IMAGE_ANALYSIS Job 생성)',
  })
  startAnalysis(
    @Param('missionId') missionId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.startAnalysis(user.organizationId, missionId, user._id)
  }

  // ── 프레임 조회 ──────────────────────────────────────────────────────────────

  @Get(':missionId/frames')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.VIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '추출된 프레임 목록 조회' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listFrames(
    @Param('missionId') missionId: string,
    @Query('page')  page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    return this.svc.listFrames(user!.organizationId, missionId, { page, limit })
  }
}
