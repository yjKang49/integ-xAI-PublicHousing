// apps/api/src/modules/repair-recommendations/repair-recommendations.controller.ts
import {
  Controller, Get, Patch, Post, Delete, Body, Param, Query, Request,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '@ax/shared'
import { RepairRecommendationsService } from './repair-recommendations.service'
import {
  UpdateRepairRecommendationDto,
  ApproveRepairRecommendationDto,
  RepairRecommendationQueryDto,
} from './dto/repair-recommendation.dto'

@ApiTags('repair-recommendations')
@ApiBearerAuth()
@Controller('repair-recommendations')
export class RepairRecommendationsController {
  constructor(private readonly service: RepairRecommendationsService) {}

  @Get()
  @ApiOperation({ summary: '보수 추천 목록 조회' })
  async findAll(@Request() req: any, @Query() query: RepairRecommendationQueryDto) {
    return this.service.findAll(req.user.orgId, query)
  }

  @Get(':id')
  @ApiOperation({ summary: '보수 추천 단건 조회' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.orgId, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '보수 추천 내용 수정' })
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.SUPER_ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRepairRecommendationDto,
  ) {
    return this.service.update(req.user.orgId, id, dto)
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '보수 추천 승인 (보고서 반영 가능 상태로 전환)' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveRepairRecommendationDto,
  ) {
    return this.service.approve(req.user.orgId, id, dto, req.user.sub)
  }

  @Delete(':id/approve')
  @ApiOperation({ summary: '보수 추천 승인 취소' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async cancelApproval(@Request() req: any, @Param('id') id: string) {
    return this.service.cancelApproval(req.user.orgId, id)
  }
}
