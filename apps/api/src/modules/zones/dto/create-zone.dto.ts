import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ example: 'floor:org001:flr_abc' })
  @IsString() floorId: string;

  @ApiProperty({ example: 'building:org001:bldg_abc' })
  @IsString() buildingId: string;

  @ApiProperty({ example: 'housingComplex:org001:cplx_abc' })
  @IsString() complexId: string;

  @ApiProperty({ example: '북측 복도' })
  @IsString() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Z-N01', description: 'QR/검색용 단축코드' })
  @IsString() @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ example: '북쪽 계단 접근 복도' })
  @IsOptional() @IsString()
  description?: string;
}

export class UpdateZoneDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
}
