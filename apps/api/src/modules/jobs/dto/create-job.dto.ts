// apps/api/src/modules/jobs/dto/create-job.dto.ts
import {
  IsEnum, IsObject, IsOptional, IsString,
  IsIn,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JobType } from '@ax/shared'

export class CreateJobDto {
  @ApiProperty({ enum: JobType, description: '작업 유형' })
  @IsEnum(JobType)
  type: JobType

  @ApiProperty({
    description: '작업 페이로드 — JobType에 따라 구조가 다름',
    example: { complexId: 'cplx_abc123', storageKey: 'media/img.jpg' },
  })
  @IsObject()
  payload: Record<string, any>

  @ApiPropertyOptional({
    enum: ['LOW', 'NORMAL', 'HIGH'],
    default: 'NORMAL',
    description: '작업 우선순위',
  })
  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL'

  @ApiPropertyOptional({ description: '연관 단지 ID (필터링·대시보드용)' })
  @IsOptional()
  @IsString()
  complexId?: string
}

export class UpdateJobStatusDto {
  @ApiProperty({ description: '새 상태값' })
  @IsString()
  status: string

  @ApiPropertyOptional({ description: '진행률 (0~100)' })
  @IsOptional()
  progress?: number

  @ApiPropertyOptional({ description: '작업 결과 (성공 시)' })
  @IsOptional()
  result?: any

  @ApiPropertyOptional({ description: '오류 메시지 (실패 시)' })
  @IsOptional()
  @IsString()
  error?: string
}
