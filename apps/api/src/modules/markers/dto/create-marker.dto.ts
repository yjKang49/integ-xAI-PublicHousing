import { IsString, IsOptional, ValidateNested, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DefectType } from '@ax/shared';

class Vector3Dto {
  @ApiProperty() @IsNumber() x: number;
  @ApiProperty() @IsNumber() y: number;
  @ApiProperty() @IsNumber() z: number;
}

export class CreateMarkerDto {
  @ApiProperty() @IsString() defectId: string;
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsString() buildingId: string;
  @ApiProperty() @IsString() modelUrl: string;

  @ApiProperty({ type: Vector3Dto })
  @ValidateNested()
  @Type(() => Vector3Dto)
  position: Vector3Dto;

  @ApiPropertyOptional({ type: Vector3Dto })
  @IsOptional()
  @ValidateNested()
  @Type(() => Vector3Dto)
  normal?: Vector3Dto;

  @ApiPropertyOptional() @IsOptional() @IsString() meshName?: string;

  /** Hex color, e.g. "#FF0000" */
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;

  @ApiPropertyOptional({ enum: DefectType }) @IsOptional() @IsEnum(DefectType) iconType?: DefectType;
}

export class UpdateMarkerDto {
  @ApiPropertyOptional({ type: Vector3Dto })
  @IsOptional()
  @ValidateNested()
  @Type(() => Vector3Dto)
  position?: Vector3Dto;

  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
}
