// apps/api/src/modules/ai-detections/dto/ai-detection.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TriggerDetectionDto {
  @ApiProperty({ description: '단지 ID' })
  @IsString()
  complexId: string

  @ApiPropertyOptional({ description: '동 ID' })
  @IsOptional()
  @IsString()
  buildingId?: string

  @ApiProperty({ enum: ['DRONE_FRAME', 'DRONE_IMAGE', 'MOBILE_PHOTO', 'MANUAL'] })
  @IsEnum(['DRONE_FRAME', 'DRONE_IMAGE', 'MOBILE_PHOTO', 'MANUAL'])
  sourceType: 'DRONE_FRAME' | 'DRONE_IMAGE' | 'MOBILE_PHOTO' | 'MANUAL'

  @ApiProperty({ description: '소스 미디어 식별자 (mediaItemId 또는 DefectMedia._id)' })
  @IsString()
  sourceMediaId: string

  @ApiPropertyOptional({ description: '드론 미션 ID' })
  @IsOptional()
  @IsString()
  sourceMissionId?: string

  @ApiPropertyOptional({ description: '드론 프레임 _id' })
  @IsOptional()
  @IsString()
  sourceFrameId?: string

  @ApiProperty({ description: '분석 대상 이미지 S3 키' })
  @IsString()
  storageKey: string

  @ApiPropertyOptional({ enum: ['MASK_RCNN', 'Y_MASKNET', 'MOCK'], default: 'MOCK' })
  @IsOptional()
  @IsEnum(['MASK_RCNN', 'Y_MASKNET', 'MOCK'])
  model?: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK'

  @ApiPropertyOptional({ description: '신뢰도 임계값 0~1 (기본 0.5)', default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number

  @ApiPropertyOptional({ description: '최대 탐지 수 (기본 20)', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxDetections?: number
}

export class TriggerMissionDetectionDto {
  @ApiPropertyOptional({ enum: ['MASK_RCNN', 'Y_MASKNET', 'MOCK'], default: 'MOCK' })
  @IsOptional()
  @IsEnum(['MASK_RCNN', 'Y_MASKNET', 'MOCK'])
  model?: 'MASK_RCNN' | 'Y_MASKNET' | 'MOCK'

  @ApiPropertyOptional({ default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number
}
