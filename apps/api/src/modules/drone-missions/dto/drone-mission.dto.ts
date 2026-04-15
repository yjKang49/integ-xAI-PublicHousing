// apps/api/src/modules/drone-missions/dto/drone-mission.dto.ts
import {
  IsString, IsOptional, IsArray, IsEnum, IsNumber,
  IsDateString, IsPositive, ValidateNested, ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DroneMediaItemType } from '@ax/shared'

export class GpsPointDto {
  @ApiProperty() @IsNumber() lat: number
  @ApiProperty() @IsNumber() lng: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() alt?: number
  @ApiPropertyOptional() @IsOptional() @IsString() timestamp?: string
}

export class CreateDroneMissionDto {
  @ApiProperty({ description: '단지 ID' })
  @IsString()
  complexId: string

  @ApiPropertyOptional({ description: '동 ID (특정 동 대상 미션)' })
  @IsOptional() @IsString()
  buildingId?: string

  @ApiPropertyOptional({ description: '연결할 InspectionSession ID' })
  @IsOptional() @IsString()
  sessionId?: string

  @ApiProperty({ example: '101동 외벽 드론 점검 2026-04' })
  @IsString()
  title: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string

  @ApiProperty({ example: '김점검' })
  @IsString()
  pilot: string

  @ApiProperty({ example: '2026-04-13' })
  @IsDateString()
  flightDate: string

  @ApiPropertyOptional({ example: 'DJI Mavic 3 Enterprise' })
  @IsOptional() @IsString()
  droneModel?: string

  @ApiPropertyOptional({ example: '맑음' })
  @IsOptional() @IsString()
  weatherCondition?: string

  @ApiPropertyOptional({ type: [GpsPointDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => GpsPointDto)
  gpsTrack?: GpsPointDto[]
}

export class UpdateDroneMissionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsString() pilot?: string
  @ApiPropertyOptional() @IsOptional() @IsDateString() flightDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() droneModel?: string
  @ApiPropertyOptional() @IsOptional() @IsString() weatherCondition?: string
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string
}

export class InitDroneMediaUploadDto {
  @ApiProperty({ example: 'DJI_0001.MP4' })
  @IsString()
  fileName: string

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  mimeType: string

  @ApiProperty({ example: 524288000, description: '파일 크기 (bytes)' })
  @IsNumber() @IsPositive()
  fileSize: number

  @ApiProperty({ enum: ['VIDEO', 'IMAGE'] })
  @IsEnum(['VIDEO', 'IMAGE'])
  mediaType: DroneMediaItemType

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  capturedAt?: string
}

export class CompleteDroneMediaUploadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() capturedAt?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLat?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLng?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsAlt?: number
}

export class DroneMissionQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() complexId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) page?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) limit?: number
}
