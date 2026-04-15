// apps/api/src/modules/sensor-readings/dto/sensor-reading.dto.ts
// Phase 2-8: 센서 측정값 DTO

import {
  IsString, IsNumber, IsOptional, IsEnum, IsDateString,
  IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SensorReadingQuality } from '@ax/shared';

export class IngestReadingDto {
  @ApiProperty({ example: 'bldg101-temp-b1-01' })
  @IsString()
  deviceKey: string;

  @ApiProperty({ example: 22.5 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: '2026-04-14T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ enum: SensorReadingQuality })
  @IsOptional()
  @IsEnum(SensorReadingQuality)
  quality?: SensorReadingQuality;
}

export class BatchIngestDto {
  @ApiProperty({ type: [IngestReadingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IngestReadingDto)
  readings: IngestReadingDto[];
}

export class SensorReadingQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
