import { IsString, IsEmail, IsEnum, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: '한국토지주택공사 경기지역본부' })
  @IsString() @MinLength(2)
  name: string;

  @ApiProperty({ example: '123-45-67890', description: '사업자등록번호' })
  @IsString()
  @Matches(/^\d{3}-\d{2}-\d{5}$/, { message: '사업자등록번호 형식: 000-00-00000' })
  businessNumber: string;

  @ApiProperty({ example: '경기도 성남시 분당구 판교역로 235' })
  @IsString()
  address: string;

  @ApiProperty({ example: '김담당' })
  @IsString()
  contactName: string;

  @ApiProperty({ example: 'contact@lh.or.kr' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: '031-1234-5678' })
  @IsString()
  contactPhone: string;

  @ApiProperty({ enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'], default: 'STARTER' })
  @IsEnum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE'])
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

  @ApiProperty({ example: '2024-01-01' })
  @IsString()
  contractStartDate: string;

  @ApiProperty({ example: '2025-12-31' })
  @IsString()
  contractEndDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  logoUrl?: string;
}
