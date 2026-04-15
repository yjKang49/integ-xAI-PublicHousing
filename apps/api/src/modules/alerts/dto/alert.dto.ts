import {
  IsString, IsEnum, IsOptional, IsArray, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, AlertStatus, SeverityLevel } from '@ax/shared';

export class CreateAlertDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty({ enum: AlertType }) @IsEnum(AlertType) alertType: AlertType;
  @ApiProperty({ enum: SeverityLevel }) @IsEnum(SeverityLevel) severity: SeverityLevel;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() message: string;
  @ApiProperty() @IsString() sourceEntityType: string;
  @ApiProperty() @IsString() sourceEntityId: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) assignedTo?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

export class AcknowledgeAlertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ResolveAlertDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AlertQueryDto {
  @ApiPropertyOptional({ enum: AlertStatus }) @IsOptional() @IsEnum(AlertStatus) status?: AlertStatus;
  @ApiPropertyOptional({ enum: SeverityLevel }) @IsOptional() @IsEnum(SeverityLevel) severity?: SeverityLevel;
  @ApiPropertyOptional({ enum: AlertType }) @IsOptional() @IsEnum(AlertType) alertType?: AlertType;
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
