// apps/api/src/modules/defects/defects.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DefectsService } from './defects.service';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { DefectListQueryDto } from './dto/defect-list-query.dto';
import { UserRole } from '@ax/shared';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Defects')
@ApiBearerAuth()
@Controller({ path: 'defects', version: '1' })
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '결함 등록' })
  create(@Body() dto: CreateDefectDto, @CurrentUser() user: CurrentUserDto) {
    return this.defectsService.create(user.organizationId, dto, user._id);
  }

  @Get()
  @Roles(
    UserRole.ORG_ADMIN, UserRole.INSPECTOR,
    UserRole.REVIEWER, UserRole.COMPLAINT_MGR, UserRole.VIEWER,
  )
  @ApiOperation({ summary: '결함 목록 조회' })
  findAll(@Query() query: DefectListQueryDto, @CurrentUser() user: CurrentUserDto) {
    // INSPECTOR scope: only defects they created
    const scopedQuery = user.role === UserRole.INSPECTOR
      ? { ...query, createdBy: user._id }
      : query;
    return this.defectsService.findAll(user.organizationId, scopedQuery);
  }

  @Get(':id')
  @ApiOperation({ summary: '결함 상세 조회' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.defectsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER)
  @ApiOperation({ summary: '결함 수정 / 조치 완료 처리' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDefectDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.defectsService.update(user.organizationId, id, dto, user._id);
  }
}
