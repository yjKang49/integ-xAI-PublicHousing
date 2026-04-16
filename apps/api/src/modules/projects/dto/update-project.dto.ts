import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionStatus } from '@ax/shared';

export class UpdateProjectStatusDto {
  @ApiPropertyOptional({ enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateProjectAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() leadInspectorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerId?: string;
}
