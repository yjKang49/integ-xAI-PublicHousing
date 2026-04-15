import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDefectDto {
  @IsOptional()
  @IsBoolean()
  isRepaired?: boolean;

  @IsOptional()
  @IsString()
  repairNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthMm?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
