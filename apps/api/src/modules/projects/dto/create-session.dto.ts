import { IsString, IsOptional, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty() @IsString() buildingId: string;
  @ApiProperty() @IsString() complexId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;

  /** 점검자 ID — 미지정 시 DRAFT, 지정 시 ASSIGNED */
  @ApiPropertyOptional() @IsOptional() @IsString() inspectorId?: string;

  /** 사용할 체크리스트 템플릿 ID — 미지정 시 기본 템플릿 사용 */
  @ApiPropertyOptional() @IsOptional() @IsString() checklistTemplateId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) weatherCondition?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(-50) @Max(60) temperature?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) humidity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
