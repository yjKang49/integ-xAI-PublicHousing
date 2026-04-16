import { IsEnum, IsOptional, IsString, MaxLength, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@ax/shared';

export class UpdateSessionStatusDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ChecklistItemUpdateDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty({ enum: ['PASS', 'FAIL', 'N/A'] }) @IsIn(['PASS', 'FAIL', 'N/A']) result: 'PASS' | 'FAIL' | 'N/A';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateChecklistDto {
  @ApiProperty({ type: [ChecklistItemUpdateDto] })
  @IsArray()
  items: ChecklistItemUpdateDto[];
}
