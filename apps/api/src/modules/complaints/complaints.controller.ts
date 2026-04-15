// apps/api/src/modules/complaints/complaints.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsNumberString, IsBooleanString,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';
import { ComplaintsService } from './complaints.service';
import { UserRole, ComplaintStatus, ComplaintCategory } from '@ax/shared';

class CreateComplaintDto {
  @IsString() complexId: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsString() unitNumber?: string;
  @IsEnum(ComplaintCategory) category: ComplaintCategory;
  @IsString() title: string;
  @IsString() description: string;
  @IsOptional() @IsString() priority?: string;
  @IsString() submittedBy: string;
  @IsOptional() @IsString() submittedPhone?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() classificationHint?: string;
}

class UpdateComplaintDto {
  @IsOptional() @IsEnum(ComplaintStatus) status?: ComplaintStatus;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() resolutionNotes?: string;
  @IsOptional() @IsString() satisfactionFeedback?: string;
  @IsOptional() satisfactionScore?: number;
  @IsOptional() @IsString() aiSuggestion?: string;
  @IsOptional() @IsString() classificationHint?: string;
}

class ComplaintQueryDto {
  @IsOptional() @IsEnum(ComplaintStatus) status?: ComplaintStatus;
  @IsOptional() @IsEnum(ComplaintCategory) category?: ComplaintCategory;
  @IsOptional() @IsString() complexId?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsBooleanString() overdueOnly?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsString() order?: string;
}

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller({ path: 'complaints', version: '1' })
export class ComplaintsController {
  constructor(private readonly svc: ComplaintsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @ApiOperation({ summary: '민원 등록' })
  create(@Body() dto: CreateComplaintDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.create(user.organizationId, dto as any, user._id);
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.REVIEWER, UserRole.VIEWER)
  @ApiOperation({ summary: '민원 목록 (필터/페이지네이션)' })
  @ApiQuery({ name: 'status', required: false, enum: ComplaintStatus })
  @ApiQuery({ name: 'category', required: false, enum: ComplaintCategory })
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'overdueOnly', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: ComplaintQueryDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findAll(user.organizationId, query as any);
  }

  @Get(':id')
  @ApiOperation({ summary: '민원 상세' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findById(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.INSPECTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '민원 상태 변경 / 담당자 배정 / 조치 결과 등록' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateStatus(user.organizationId, id, dto as any, user._id);
  }

  /** 우선순위 분류 (OPEN → TRIAGED) */
  @Patch(':id/triage')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '민원 내용 검토 및 우선순위 분류 (OPEN → TRIAGED)' })
  triage(
    @Param('id') id: string,
    @Body() dto: Pick<UpdateComplaintDto, 'priority' | 'notes' | 'classificationHint' | 'aiSuggestion'> & { classificationHint?: string },
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateStatus(
      user.organizationId,
      id,
      { status: ComplaintStatus.TRIAGED, ...dto } as any,
      user._id,
    );
  }

  /** 담당자 배정 (TRIAGED/OPEN → ASSIGNED) */
  @Patch(':id/assign')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '담당자 배정' })
  assign(
    @Param('id') id: string,
    @Body() dto: { assignedTo: string; dueDate?: string; notes?: string },
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateStatus(
      user.organizationId,
      id,
      { assignedTo: dto.assignedTo, dueDate: dto.dueDate, notes: dto.notes } as any,
      user._id,
    );
  }

  /** 현장 처리 결과 등록 (mobile inspector) */
  @Patch(':id/resolve')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR, UserRole.INSPECTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '처리 완료 등록 (IN_PROGRESS → RESOLVED)' })
  resolve(
    @Param('id') id: string,
    @Body() dto: { resolutionNotes: string; notes?: string },
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateStatus(
      user.organizationId,
      id,
      { status: ComplaintStatus.RESOLVED, resolutionNotes: dto.resolutionNotes, notes: dto.notes } as any,
      user._id,
    );
  }

  /** 민원 종결 (RESOLVED → CLOSED) */
  @Patch(':id/close')
  @Roles(UserRole.ORG_ADMIN, UserRole.COMPLAINT_MGR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '민원 종결 (RESOLVED → CLOSED)' })
  close(
    @Param('id') id: string,
    @Body() dto: { satisfactionScore?: number; satisfactionFeedback?: string; notes?: string },
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateStatus(
      user.organizationId,
      id,
      { status: ComplaintStatus.CLOSED, ...dto } as any,
      user._id,
    );
  }
}
