import {
  IsString, IsNumber, IsBoolean, IsOptional, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGaugePointDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsString() buildingId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsDateString() installDate: string;
  @ApiProperty() @IsNumber() @Min(0) baselineWidthMm: number;
  @ApiProperty() @IsNumber() @Min(0) thresholdMm: number;
  @ApiProperty() @IsString() location: string;
}

export class UpdateGaugePointDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) thresholdMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateMeasurementDto {
  @ApiProperty() @IsString() gaugePointId: string;
  @ApiProperty() @IsString() complexId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string;
  @ApiProperty() @IsDateString() measuredAt: string;
  @ApiProperty() @IsString() capturedImageKey: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roiImageKey?: string;
  @ApiProperty() @IsNumber() @Min(0) measuredWidthMm: number;
  @ApiProperty({ default: false }) @IsBoolean() isManualOverride: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) manualWidthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() autoConfidence?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() graduationCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() scaleMmPerGraduation?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class MeasurementQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() gaugePointId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
