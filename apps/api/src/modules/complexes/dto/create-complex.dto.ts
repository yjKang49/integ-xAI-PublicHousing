import {
  IsString, IsInt, IsOptional, IsNumber, IsArray,
  Min, Max, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateComplexDto {
  @ApiProperty({ example: '행복마을 1단지' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ example: '경기도 성남시 분당구 판교역로 235' })
  @IsString() @MinLength(5)
  address: string;

  @ApiProperty({ example: 500, description: '총 세대수' })
  @Type(() => Number)
  @IsInt() @Min(1)
  totalUnits: number;

  @ApiProperty({ example: 10, description: '총 동수' })
  @Type(() => Number)
  @IsInt() @Min(1)
  totalBuildings: number;

  @ApiProperty({ example: 1998, description: '준공연도' })
  @Type(() => Number)
  @IsInt() @Min(1950) @Max(new Date().getFullYear())
  builtYear: number;

  @ApiProperty({ example: 'user:org001:usr_mgr01', description: '담당자 userId' })
  @IsString()
  managedBy: string;

  @ApiPropertyOptional({ example: 37.3947 })
  @IsOptional() @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 127.1108 })
  @IsOptional() @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: ['신축', '아파트'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  floorPlanUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  siteModelUrl?: string;
}
