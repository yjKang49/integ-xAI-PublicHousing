import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, MaxLength, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityAssetType, SeverityLevel } from '@ax/shared';

export class CreateAssetDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;

  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty() @IsString() @MaxLength(30) code: string;

  @ApiProperty({ enum: FacilityAssetType })
  @IsEnum(FacilityAssetType)
  assetType: FacilityAssetType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) material?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) serviceLifeYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedReplacementDate?: string;

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
