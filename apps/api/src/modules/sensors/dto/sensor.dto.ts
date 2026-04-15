// apps/api/src/modules/sensors/dto/sensor.dto.ts
// Phase 2-8: IoT 센서 기기 DTO

import {
  IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max,
  ValidateNested, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SensorType, SensorStatus } from '@ax/shared';

export class SensorThresholdDto {
  @ApiProperty({ example: '°C' })
  @IsString()
  unit: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() warningMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() warningMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() criticalMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() criticalMax?: number;
}

export class CreateSensorDeviceDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;

  @ApiProperty({ example: '101동 지하 온도계 #1' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bldg101-temp-b1-01' })
  @IsString()
  deviceKey: string;

  @ApiProperty({ enum: SensorType })
  @IsEnum(SensorType)
  sensorType: SensorType;

  @ApiProperty({ example: '101동 지하 1층 기계실' })
  @IsString()
  locationDescription: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;

  @ApiProperty({ type: SensorThresholdDto })
  @ValidateNested()
  @Type(() => SensorThresholdDto)
  thresholds: SensorThresholdDto;

  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) batteryLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateSensorDeviceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: SensorStatus }) @IsOptional() @IsEnum(SensorStatus) status?: SensorStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() locationDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) batteryLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() firmwareVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;
  @ApiPropertyOptional({ type: SensorThresholdDto }) @IsOptional() @IsObject() thresholds?: Partial<SensorThresholdDto>;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SensorDeviceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional({ enum: SensorType }) @IsOptional() @IsEnum(SensorType) sensorType?: SensorType;
  @ApiPropertyOptional({ enum: SensorStatus }) @IsOptional() @IsEnum(SensorStatus) status?: SensorStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
