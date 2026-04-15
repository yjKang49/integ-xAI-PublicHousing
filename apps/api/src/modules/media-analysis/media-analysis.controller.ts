// apps/api/src/modules/media-analysis/media-analysis.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CurrentUserDto } from '../../common/interfaces/current-user.interface'
import { UserRole } from '@ax/shared'
import { MediaAnalysisService } from './media-analysis.service'

@ApiTags('Media Analysis — 미디어 분석 파이프라인')
@ApiBearerAuth()
@Controller({ path: 'media-analysis', version: '1' })
export class MediaAnalysisController {
  constructor(private readonly svc: MediaAnalysisService) {}

  @Get('mission/:missionId')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.VIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '미션 내 전체 미디어 파이프라인 상태 조회' })
  findByMission(
    @Param('missionId') missionId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.findByMissionId(user.organizationId, missionId)
  }

  @Get('media/:mediaItemId')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.INSPECTOR, UserRole.VIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '미디어 항목의 파이프라인 상태 조회' })
  findByMediaItem(
    @Param('mediaItemId') mediaItemId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.findByMediaItemId(user.organizationId, mediaItemId)
  }
}
