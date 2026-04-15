import { IsString, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({ example: 'building:org001:bldg_abc' })
  @IsString()
  buildingId: string;

  @ApiProperty({ example: 'housingComplex:org001:cplx_abc' })
  @IsString()
  complexId: string;

  @ApiProperty({ example: 3, description: '층 번호 (지하는 음수: -1, -2)' })
  @Type(() => Number) @IsInt()
  floorNumber: number;

  @ApiProperty({ example: '3F', description: '표시명' })
  @IsString()
  floorName: string;

  @ApiProperty({ example: 320.5, description: '바닥 면적 (㎡)' })
  @Type(() => Number) @IsNumber()
  area: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  planImageUrl?: string;
}

export class UpdateFloorDto {
  @IsOptional() @IsString() floorName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() area?: number;
  @IsOptional() @IsString() planImageUrl?: string;
}
