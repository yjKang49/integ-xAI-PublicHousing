import { IsString, IsInt, IsEnum, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty() @IsString() complexId: string;
  @ApiProperty() @IsString() @MaxLength(200) name: string;

  @ApiProperty({ example: 1 }) @IsInt() @Min(1) round: number;

  @ApiProperty({ enum: ['REGULAR', 'EMERGENCY', 'SPECIAL'] })
  @IsEnum(['REGULAR', 'EMERGENCY', 'SPECIAL'])
  inspectionType: 'REGULAR' | 'EMERGENCY' | 'SPECIAL';

  @ApiProperty({ example: '2026-04-07' }) @IsDateString() plannedStartDate: string;
  @ApiProperty({ example: '2026-04-30' }) @IsDateString() plannedEndDate: string;

  @ApiProperty() @IsString() leadInspectorId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) description?: string;
}
