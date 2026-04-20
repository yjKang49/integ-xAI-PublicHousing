// apps/api/src/modules/external-integrations/dto/external-integration.dto.ts

import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KalisFmsSyncDto {
  @ApiProperty({ description: '건물 ID', example: 'building:org001:bldg_101' })
  @IsString()
  buildingId: string;

  @ApiProperty({ description: 'KALIS-FMS 시설물 코드', example: 'F-2024-12345' })
  @IsString()
  facilityCode: string;
}

export class SejumteoQueryDto {
  @ApiProperty({ description: '시군구 코드', example: '11680' })
  @IsString()
  sigunguCd: string;

  @ApiProperty({ description: '법정동 코드', example: '10300' })
  @IsString()
  bjdongCd: string;

  @ApiProperty({ description: '대지 구분 코드 (0=대지)', example: '0' })
  @IsOptional()
  @IsString()
  platGbCd?: string = '0';

  @ApiProperty({ description: '본번', example: '0100' })
  @IsString()
  bun: string;

  @ApiProperty({ description: '부번', example: '0000' })
  @IsOptional()
  @IsString()
  ji?: string = '0000';
}
