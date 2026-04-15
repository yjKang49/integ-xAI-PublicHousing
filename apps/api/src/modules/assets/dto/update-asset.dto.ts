import { IsString, IsOptional, IsEnum, IsInt, Min, MaxLength, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityAssetType, SeverityLevel } from '@ax/shared';

export class UpdateAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;

  @ApiPropertyOptional({ enum: FacilityAssetType })
  @IsOptional()
  @IsEnum(FacilityAssetType)
  assetType?: FacilityAssetType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) material?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) serviceLifeYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedReplacementDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, string | number>;

  @ApiPropertyOptional({ enum: SeverityLevel })
  @IsOptional()
  @IsEnum(SeverityLevel)
  riskLevel?: SeverityLevel;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
