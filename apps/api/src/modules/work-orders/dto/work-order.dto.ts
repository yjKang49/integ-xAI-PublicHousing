// apps/api/src/modules/work-orders/dto/work-order.dto.ts
import {
  IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@ax/shared';

export class CreateWorkOrderDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complaintId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() defectId?: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() assignedTo: string;
  @ApiProperty() @IsDateString() scheduledDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) mediaIds?: string[];
}

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional() @IsEnum(WorkOrderStatus) status?: WorkOrderStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() actualCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() vendor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actionNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) mediaIds?: string[];
}

export class WorkOrderQueryDto {
  @IsOptional() @IsString() complexId?: string;
  @IsOptional() @IsString() complaintId?: string;
  @IsOptional() @IsEnum(WorkOrderStatus) status?: WorkOrderStatus;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
