import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DefectType, SeverityLevel } from '@ax/shared';

export class DefectListQueryDto {
  @IsOptional() @IsString() complexId?: string;
  @IsOptional() @IsString() buildingId?: string;
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsEnum(DefectType) defectType?: DefectType;
  @IsOptional() @IsEnum(SeverityLevel) severity?: SeverityLevel;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isRepaired?: boolean;

  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsString() createdBy?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
  @IsOptional() @IsEnum(['asc', 'desc']) order?: 'asc' | 'desc';
}
