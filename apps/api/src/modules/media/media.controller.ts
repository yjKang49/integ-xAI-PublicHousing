import {
  Controller, Post, Patch, Get, Delete, Param, Body, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@ax/shared';
import { MediaService } from './media.service';
import { CurrentUserDto } from '../../common/interfaces/current-user.interface';

class InitUploadDto {
  @ApiProperty() @IsString() fileName: string;
  @ApiProperty() @IsString() mimeType: string;
  @ApiProperty() @IsNumber() @IsPositive() fileSize: number;

  @ApiProperty({ enum: ['defect', 'complaint', 'workOrder'] })
  @IsEnum(['defect', 'complaint', 'workOrder'])
  entityType: 'defect' | 'complaint' | 'workOrder';

  @ApiProperty() @IsString() entityId: string;
  @ApiProperty() @IsString() complexId: string;
}

class CompleteUploadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() capturedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLng?: number;
}

@ApiTags('Media')
@ApiBearerAuth()
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Step 1: Init upload — returns a pre-signed S3 PUT URL.
   * Client PUTs the file directly to S3, then calls completeUpload.
   */
  @Post('upload/init')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '미디어 업로드 초기화 (pre-signed URL 발급)' })
  initUpload(@Body() dto: InitUploadDto, @CurrentUser() user: CurrentUserDto) {
    return this.mediaService.initUpload(user.organizationId, dto, user._id);
  }

  /**
   * Step 2: Complete upload — verifies file in S3, updates CouchDB doc.
   */
  @Patch('upload/:mediaId/complete')
  @Roles(UserRole.ORG_ADMIN, UserRole.INSPECTOR)
  @ApiOperation({ summary: '미디어 업로드 완료 확인' })
  completeUpload(
    @Param('mediaId') mediaId: string,
    @Body() dto: CompleteUploadDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.mediaService.completeUpload(user.organizationId, mediaId, dto, user._id);
  }

  /**
   * Get a pre-signed download URL for a media item by mediaId.
   */
  @Get(':mediaId/url')
  @ApiOperation({ summary: '미디어 다운로드 URL 발급 (1시간 유효)' })
  getDownloadUrl(
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.mediaService.getDownloadUrlByMediaId(user.organizationId, mediaId);
  }

  @Get('download-url')
  @ApiOperation({ summary: '스토리지 키로 다운로드 URL 발급' })
  async getDownloadUrlByKey(@Query('storageKey') storageKey: string) {
    const url = await this.mediaService.getDownloadUrl(storageKey);
    return { url, expiresIn: 3600 };
  }

  /**
   * Delete media (soft-delete CouchDB + async S3 cleanup).
   */
  @Delete(':mediaId')
  @Roles(UserRole.ORG_ADMIN)
  @ApiOperation({ summary: '미디어 삭제' })
  delete(@Param('mediaId') mediaId: string, @CurrentUser() user: CurrentUserDto) {
    return this.mediaService.delete(user.organizationId, mediaId, user._id);
  }

  /**
   * Internal: process PouchDB attachment sync after mobile offline upload.
   */
  @Post(':mediaId/process-attachment')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '[내부] PouchDB attachment → S3 업로드 처리' })
  processAttachment(@Param('mediaId') mediaId: string, @CurrentUser() user: CurrentUserDto) {
    return this.mediaService.processPouchAttachment(user.organizationId, mediaId);
  }
}
