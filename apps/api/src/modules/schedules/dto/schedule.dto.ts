import {
  IsString, IsEnum, IsBoolean, IsNumber, IsOptional, IsArray, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ScheduleType = 'REGULAR_INSPECTION' | 'EMERGENCY_INSPECTION' | 'MAINTENANCE' | 'CONTRACT_RENEWAL';
export type Recurrence = 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';

const SCHEDULE_TYPES: ScheduleType[] = ['REGULAR_INSPECTION', 'EMERGENCY_INSPECTION', 'MAINTENANCE', 'CONTRACT_RENEWAL'];
const RECURRENCES: Recurrence[] = ['ONCE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'];

export class CreateScheduleDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: SCHEDULE_TYPES }) @IsEnum(SCHEDULE_TYPES) scheduleType: ScheduleType;
  @ApiProperty({ enum: RECURRENCES }) @IsEnum(RECURRENCES) recurrence: Recurrence;
  @ApiProperty() @IsDateString() nextOccurrence: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) assignedTo: string[];
  @ApiProperty({ default: 3 }) @IsNumber() @Min(0) overdueAlertDays: number;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedProjectId?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: RECURRENCES }) @IsOptional() @IsEnum(RECURRENCES) recurrence?: Recurrence;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextOccurrence?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) assignedTo?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) overdueAlertDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ScheduleQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string;
  @ApiPropertyOptional({ enum: SCHEDULE_TYPES }) @IsOptional() @IsEnum(SCHEDULE_TYPES) scheduleType?: ScheduleType;
  @ApiPropertyOptional() @IsOptional() @IsString() isActive?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() page?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() limit?: string;
}
