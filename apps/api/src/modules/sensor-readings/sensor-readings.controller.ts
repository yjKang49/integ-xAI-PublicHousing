// apps/api/src/modules/sensor-readings/sensor-readings.controller.ts
// Phase 2-8: 센서 측정값 REST API

import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@ax/shared';
import { SensorReadingsService } from './sensor-readings.service';
import { IngestReadingDto, BatchIngestDto, SensorReadingQueryDto } from './dto/sensor-reading.dto';

@ApiTags('IoT Sensor Readings')
@ApiBearerAuth()
@Controller({ path: 'sensor-readings', version: '1' })
export class SensorReadingsController {
  constructor(private readonly service: SensorReadingsService) {}

  /** 단일 센서값 수집 (REST mock ingestion) */
  @Post('ingest')
  @SkipThrottle()
  @ApiOperation({ summary: '센서값 단건 수집 (REST ingest)' })
  ingest(@CurrentUser() user: AuthUser, @Body() dto: IngestReadingDto) {
    return this.service.ingest(user.organizationId, dto);
  }

  /** 다수 센서값 일괄 수집 (batch import) */
  @Post('batch')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '센서값 일괄 수집 (batch ingest, 최대 500건)' })
  batchIngest(@CurrentUser() user: AuthUser, @Body() dto: BatchIngestDto) {
    return this.service.batchIngest(user.organizationId, dto);
  }

  /** 시계열 조회 */
  @Get()
  @ApiOperation({ summary: '센서 측정값 시계열 조회' })
  findReadings(@CurrentUser() user: AuthUser, @Query() query: SensorReadingQueryDto) {
    return this.service.findReadings(user.organizationId, query);
  }
}
