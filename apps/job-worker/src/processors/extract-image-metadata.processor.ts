// apps/job-worker/src/processors/extract-image-metadata.processor.ts
// 드론 정지 이미지 메타데이터 추출 프로세서 (EXIF, GPS, 해상도)
//
// Phase 2 stub — 실제 프로덕션 구현 시:
//   1. S3에서 이미지 다운로드 (스트림 또는 버퍼)
//   2. sharp 또는 exif-parser로 메타데이터 추출
//   3. GPS 좌표, 촬영 시각, 해상도, DPI 파싱
//   4. DroneMissionMedia 메타데이터 업데이트

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface ImageMetadataExtractionPayload {
  jobDocId: string;
  orgId: string;
  missionId: string;
  mediaItemId: string;
  complexId: string;
  storageKey: string;
}

interface ExtractedImageMetadata {
  width: number;
  height: number;
  dpi?: number;
  colorSpace?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
  capturedAt?: string;
  cameraMake?: string;
  cameraModel?: string;
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
}

@Processor('job-queue')
export class ExtractImageMetadataProcessor {
  private readonly logger = new Logger(ExtractImageMetadataProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('IMAGE_METADATA_EXTRACTION')
  async handleImageMetadataExtraction(job: Job<ImageMetadataExtractionPayload>): Promise<void> {
    const { jobDocId, orgId, missionId, mediaItemId, complexId, storageKey } = job.data;

    this.logger.log(
      `Processing IMAGE_METADATA_EXTRACTION: ${jobDocId} [mission=${missionId}]`,
    );

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // ── 단계 1: 이미지 다운로드 ───────────────────────────────────────────
      await this.delay(600);
      await job.progress(30);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 30 });
      this.logger.debug(`${jobDocId} — 이미지 다운로드 완료 (30%)`);

      // Phase 2 실제 구현 시:
      // import sharp from 'sharp';
      // import * as ExifParser from 'exif-parser';
      //
      // const s3Client = new S3Client({ ... });
      // const { Body } = await s3Client.send(new GetObjectCommand({ Bucket, Key: storageKey }));
      // const buffer = await streamToBuffer(Body);
      //
      // const sharpMeta = await sharp(buffer).metadata();
      // const exif = ExifParser.create(buffer).parse();
      //
      // const gpsLat = exif.tags?.GPSLatitude;
      // const gpsLng = exif.tags?.GPSLongitude;
      // const capturedAt = exif.tags?.DateTimeOriginal
      //   ? new Date(exif.tags.DateTimeOriginal * 1000).toISOString()
      //   : undefined;

      // ── 단계 2: EXIF/메타데이터 파싱 ─────────────────────────────────────
      await this.delay(400);
      await job.progress(70);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 70 });
      this.logger.debug(`${jobDocId} — EXIF 파싱 완료 (70%)`);

      // Stub: DJI Mavic 3 Enterprise 촬영 이미지 메타데이터 시뮬레이션
      const metadata: ExtractedImageMetadata = {
        width: 5280,
        height: 3956,
        dpi: 72,
        colorSpace: 'sRGB',
        gpsLat:  37.5665 + (Math.random() - 0.5) * 0.01,
        gpsLng: 126.9780 + (Math.random() - 0.5) * 0.01,
        gpsAlt:  50 + Math.round(Math.random() * 50),
        capturedAt: new Date(Date.now() - Math.random() * 3_600_000).toISOString(),
        cameraMake:  'DJI',
        cameraModel: 'FC6310S',
        exposureTime: '1/1000',
        fNumber: 2.8,
        iso: 100,
      };

      // ── 단계 3: 결과 저장 (Phase 2: API 콜백으로 DroneMission 업데이트) ──
      await this.delay(300);
      await job.progress(100);
      this.logger.debug(`${jobDocId} — 메타데이터 저장 완료 (100%)`);

      const result = {
        missionId,
        mediaItemId,
        storageKey,
        metadata,
        completedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });

      this.logger.log(
        `IMAGE_METADATA_EXTRACTION completed: ${jobDocId} ` +
        `size=${metadata.width}x${metadata.height} ` +
        `gps=${metadata.gpsLat?.toFixed(4)},${metadata.gpsLng?.toFixed(4)}`,
      );
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      this.logger.error(`IMAGE_METADATA_EXTRACTION failed: ${jobDocId} — ${err.message}`);
      throw err;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
