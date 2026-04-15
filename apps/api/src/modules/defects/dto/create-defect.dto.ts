// apps/api/src/modules/defects/dto/create-defect.dto.ts
import {
  IsString, IsEnum, IsOptional, IsNumber, IsArray,
  IsPositive, Min, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DefectType, SeverityLevel } from '@ax/shared';

class Coords2DDto {
  @IsNumber() x: number;
  @IsNumber() y: number;
}

export class CreateDefectDto {
  @ApiProperty() @IsString() sessionId: string;
  @ApiProperty() @IsString() projectId: string;
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsString() buildingId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string;

  @ApiProperty({ enum: DefectType })
  @IsEnum(DefectType)
  defectType: DefectType;

  @ApiProperty({ enum: SeverityLevel })
  @IsEnum(SeverityLevel)
  severity: SeverityLevel;

  @ApiProperty() @IsString() @MaxLength(1000) description: string;
  @ApiProperty() @IsString() @MaxLength(500) locationDescription: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depthMm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() areaSqm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => Coords2DDto)
  photo2DCoords?: Coords2DDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];
}
