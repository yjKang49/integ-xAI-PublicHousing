// apps/api/src/modules/complaint-triage/complaint-triage.controller.ts
import {
  Controller, Get, Post, Body, Param, Query,
  Request, Headers, UnauthorizedException, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { Roles } from '../../common/decorators/roles.decorator'
import { SkipAuth } from '../../common/decorators/skip-auth.decorator'
import { UserRole } from '@ax/shared'
import { ComplaintTriageService } from './complaint-triage.service'
import {
  TriggerComplaintTriageDto,
  ReviewTriageDto,
  ComplaintTriageQueryDto,
  SaveComplaintTriageResultDto,
} from './dto/complaint-triage.dto'

@ApiTags('complaint-triage')
@ApiBearerAuth()
@Controller('complaint-triage')
export class ComplaintTriageController {
  constructor(
    private readonly service: ComplaintTriageService,
    private readonly configService: ConfigService,
  ) {}

  // ── 분석 트리거 ─────────────────────────────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: '민원 AI 분류 트리거 (COMPLAINT_TRIAGE Job)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.SUPER_ADMIN)
  async trigger(@Request() req: any, @Body() dto: TriggerComplaintTriageDto) {
    return this.service.trigger(req.user.orgId, dto, req.user.sub)
  }

  // ── 조회 ────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '트리아지 목록 조회' })
  async findAll(@Request() req: any, @Query() query: ComplaintTriageQueryDto) {
    return this.service.findAll(req.user.orgId, query)
  }

  @Get('stats')
  @ApiOperation({ summary: '트리아지 통계' })
  async getStats(@Request() req: any, @Query('complexId') complexId?: string) {
    return this.service.getStats(req.user.orgId, complexId)
  }

  @Get('by-complaint/:complaintId')
  @ApiOperation({ summary: '민원 ID로 최신 트리아지 조회' })
  async findByComplaint(@Request() req: any, @Param('complaintId') complaintId: string) {
    const result = await this.service.findByComplaintId(req.user.orgId, complaintId)
    if (!result) return null
    return result
  }

  @Get(':id')
  @ApiOperation({ summary: '트리아지 단건 조회' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.orgId, id)
  }

  // ── Human-in-the-loop 검토 ─────────────────────────────────────────────────

  @Post(':id/review')
  @ApiOperation({
    summary: '트리아지 검토 — ACCEPT(수락) / MODIFY(수정확정) / REJECT(기각)',
  })
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.SUPER_ADMIN)
  async review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewTriageDto,
  ) {
    return this.service.review(req.user.orgId, id, dto, req.user.sub)
  }

  // ── 워커 내부 엔드포인트 ──────────────────────────────────────────────────────

  @Post('internal/result')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Internal] AI 워커 → 트리아지 결과 저장' })
  async saveResult(
    @Headers('x-worker-secret') secret: string,
    @Body() dto: SaveComplaintTriageResultDto,
  ) {
    const expected = this.configService.get<string>('WORKER_SECRET')
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid worker secret')
    }
    await this.service.saveWorkerResult(dto)
  }
}
