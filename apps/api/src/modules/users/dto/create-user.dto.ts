import {
  IsEmail, IsString, IsEnum, IsBoolean,
  IsOptional, IsArray, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@ax/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'user@happy-housing.kr' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@1234', minLength: 8 })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ example: '홍길동' })
  @IsString() @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.INSPECTOR })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'org_seed001', description: 'organizationId (orgId)' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ example: [], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  assignedComplexIds?: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(50) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) assignedComplexIds?: string[];
  @IsOptional() @IsString() @MinLength(8) password?: string;
}
