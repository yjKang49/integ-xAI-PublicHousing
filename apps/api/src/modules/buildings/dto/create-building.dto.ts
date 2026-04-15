import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiProperty({ example: '101동' })
  @IsString() @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'B101', description: 'QR/검색용 단축코드' })
  @IsString() @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'housingComplex:org001:cplx_abc' })
  @IsString()
  complexId: string;

  @ApiProperty({ example: 15, description: '지상 층수' })
  @Type(() => Number) @IsInt() @Min(1)
  totalFloors: number;

  @ApiProperty({ example: 2, description: '지하 층수' })
  @Type(() => Number) @IsInt() @Min(0)
  undergroundFloors: number;

  @ApiProperty({ example: 50, description: '총 세대수' })
  @Type(() => Number) @IsInt() @Min(1)
  totalUnits: number;

  @ApiProperty({ example: '1998-06-30', description: '준공일 (YYYY-MM-DD)' })
  @IsString()
  builtDate: string;

  @ApiProperty({ example: '철근콘크리트조' })
  @IsString()
  structureType: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  modelUrl?: string;
}
