import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateProjectStatusDto, UpdateProjectAssignmentDto } from './dto/update-project.dto';
import { UpdateSessionStatusDto } from './dto/update-session.dto';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  // ── Projects ──────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.REVIEWER)
  @ApiOperation({ summary: '점검 프로젝트 생성' })
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: CurrentUserDto) {
    return this.svc.createProject(user.organizationId, dto, user._id);
  }

  @Get()
  @ApiQuery({ name: 'complexId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: '점검 프로젝트 목록' })
  listProjects(
    @Query('complexId') complexId: string,
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.findProjects(user.organizationId, {
      complexId,
      status,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '점검 프로젝트 상세' })
  getProject(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findProjectById(user.organizationId, id);
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '프로젝트 담당자 변경 (책임 점검자/검토자)' })
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateProjectAssignmentDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateProjectAssignment(user.organizationId, id, dto, user._id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ORG_ADMIN, UserRole.REVIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '프로젝트 상태 변경' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateProjectStatus(user.organizationId, id, dto, user._id);
  }

  // ── Sessions ──────────────────────────────────────────────────

  @Post(':projectId/sessions')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '점검 세션 생성 (DRAFT 상태로 시작)' })
  createSession(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.createSession(user.organizationId, projectId, dto, user._id);
  }

  @Get(':projectId/sessions')
  @ApiOperation({ summary: '프로젝트 세션 목록' })
  listSessions(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.findSessionsByProject(user.organizationId, projectId);
  }

  @Get('sessions/mine')
  @ApiOperation({ summary: '내 점검 세션 목록 (현재 로그인 사용자 기준)' })
  getMySessions(@CurrentUser() user: CurrentUserDto) {
    return this.svc.findSessionsByInspector(user.organizationId, user._id);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: '세션 상세' })
  getSession(@Param('sessionId') sessionId: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.findSessionById(user.organizationId, sessionId);
  }

  @Get('sessions/:sessionId/checklist')
  @ApiOperation({ summary: '세션 체크리스트 항목 조회' })
  getChecklist(@Param('sessionId') sessionId: string, @CurrentUser() user: CurrentUserDto) {
    return this.svc.getChecklist(user.organizationId, sessionId);
  }

  @Patch('sessions/:sessionId/status')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR, UserRole.REVIEWER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '세션 상태 변경 (DRAFT→ASSIGNED→IN_PROGRESS→SUBMITTED→APPROVED)' })
  updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStatusDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.svc.updateSessionStatus(user.organizationId, sessionId, dto, user._id);
  }

  // ── Checklist Templates ───────────────────────────────────────

  @Get('checklists/templates')
  @ApiOperation({ summary: '체크리스트 템플릿 목록' })
  listTemplates() {
    return this.svc.listTemplates();
  }

  @Get('checklists/templates/:id')
  @ApiOperation({ summary: '체크리스트 템플릿 상세' })
  getTemplate(@Param('id') id: string) {
    return this.svc.findTemplateById(id);
  }
}
