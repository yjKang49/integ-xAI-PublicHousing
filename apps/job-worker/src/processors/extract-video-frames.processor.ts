// apps/job-worker/src/processors/extract-video-frames.processor.ts
// 드론 영상 프레임 추출 프로세서
//
// Phase 2 stub — 실제 프로덕션 구현 시:
//   1. S3에서 영상 다운로드 (presigned GET or stream)
//   2. fluent-ffmpeg로 keyframe 추출 (설치: npm i fluent-ffmpeg @types/fluent-ffmpeg ffmpeg-static)
//   3. 추출된 프레임을 S3에 업로드
//   4. CouchDB에 MediaFrame 문서 생성
//   5. DroneMissionMedia 상태를 DONE으로 업데이트
//
// 현재는 구조를 완전히 갖추고 실제 파일 처리 대신 시뮬레이션만 수행

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { JobStatusClient } from '../job-status.client';

interface VideoFrameExtractionPayload {
  jobDocId: string;
  orgId: string;
  missionId: string;
  mediaItemId: string;
  complexId: string;
  storageKey: string;
  keyframeIntervalSec?: number;
  maxFrames?: number;
  quality?: number;
}

interface ExtractedFrame {
  frameIndex: number;
  timestampMs: number;
  storageKey: string;  // S3 키
  fileSize: number;    // bytes
}

@Processor('job-queue')
export class ExtractVideoFramesProcessor {
  private readonly logger = new Logger(ExtractVideoFramesProcessor.name);

  constructor(private readonly client: JobStatusClient) {}

  @Process('VIDEO_FRAME_EXTRACTION')
  async handleVideoFrameExtraction(job: Job<VideoFrameExtractionPayload>): Promise<void> {
    const {
      jobDocId, orgId, missionId, mediaItemId, complexId,
      storageKey, keyframeIntervalSec = 5, maxFrames = 200,
    } = job.data;

    this.logger.log(
      `Processing VIDEO_FRAME_EXTRACTION: ${jobDocId} [mission=${missionId} interval=${keyframeIntervalSec}s]`,
    );

    await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 0 });

    try {
      // ── 단계 1: 영상 정보 조회 (Phase 2: S3 presigned URL → ffprobe) ──────
      await this.delay(800);
      await job.progress(10);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 10 });
      this.logger.debug(`${jobDocId} — 영상 메타데이터 조회 완료 (10%)`);

      // Phase 2 실제 구현 시 여기서 ffprobe로 duration, fps 등 조회
      const videoDurationSec = 120; // stub: 2분 영상 가정
      const fps = 30;
      const estimatedFrameCount = Math.min(
        Math.floor(videoDurationSec / keyframeIntervalSec),
        maxFrames,
      );

      // ── 단계 2: 영상 다운로드 (Phase 2: stream from S3) ──────────────────
      await this.delay(1500);
      await job.progress(20);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 20 });
      this.logger.debug(`${jobDocId} — 영상 다운로드 완료 (20%)`);

      // ── 단계 3: 키프레임 추출 (Phase 2: fluent-ffmpeg) ───────────────────
      // 실제 구현 예시:
      //
      // import ffmpeg from 'fluent-ffmpeg';
      // import ffmpegStatic from 'ffmpeg-static';
      // ffmpeg.setFfmpegPath(ffmpegStatic);
      //
      // await new Promise<void>((resolve, reject) => {
      //   ffmpeg(videoLocalPath)
      //     .outputOptions([
      //       `-vf select='not(mod(n\\,${Math.round(fps * keyframeIntervalSec)}))'`,
      //       '-vsync', 'vfr',
      //       '-q:v', String(quality ?? 2),
      //       '-frame_pts', '1',
      //     ])
      //     .output(path.join(framesDir, 'frame_%06d.jpg'))
      //     .on('end', resolve)
      //     .on('error', reject)
      //     .run();
      // });

      const extractedFrames: ExtractedFrame[] = [];
      const shortMissionId = missionId.split(':').pop();

      for (let i = 0; i < estimatedFrameCount; i++) {
        const progressPct = 20 + Math.round((i / estimatedFrameCount) * 60);
        if (i % 10 === 0) {
          await job.progress(progressPct);
          await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: progressPct });
          this.logger.debug(`${jobDocId} — 프레임 추출 중 ${i}/${estimatedFrameCount} (${progressPct}%)`);
        }

        const frameIndex   = i;
        const timestampMs  = i * keyframeIntervalSec * 1000;
        const frameKey     = `drone/${orgId}/${complexId}/${shortMissionId}/frames/${mediaItemId}/frame_${String(frameIndex).padStart(6, '0')}.jpg`;

        extractedFrames.push({
          frameIndex,
          timestampMs,
          storageKey: frameKey,
          fileSize: Math.round(50_000 + Math.random() * 150_000), // stub: 50~200KB
        });

        // Phase 2: 실제로는 루프마다 S3 업로드 + CouchDB MediaFrame 문서 생성
        await this.delay(20); // 시뮬레이션 딜레이
      }

      this.logger.debug(`${jobDocId} — 키프레임 추출 완료 (80%)`);

      // ── 단계 4: S3 업로드 (Phase 2: 루프 내에서 처리, 여기선 완료만 표기) ─
      await job.progress(85);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 85 });
      await this.delay(500);
      this.logger.debug(`${jobDocId} — S3 프레임 업로드 완료 (85%)`);

      // ── 단계 5: DroneMission 상태 업데이트 API 호출 ──────────────────────
      // Phase 2: 여기서 /api/v1/drone-missions/:id/media/:mediaItemId 를 PATCH 하여
      // status: DONE, frameCount: extractedFrames.length 업데이트
      await job.progress(95);
      await this.client.updateStatus(jobDocId, orgId, { status: 'RUNNING', progress: 95 });
      await this.delay(300);

      const result = {
        missionId,
        mediaItemId,
        storageKey,
        frameCount: extractedFrames.length,
        keyframeIntervalSec,
        videoDurationSec,
        fps,
        // Phase 2에서 실제 storageKey 목록 제공
        frameKeys: extractedFrames.map(f => f.storageKey),
        completedAt: new Date().toISOString(),
      };

      await this.client.updateStatus(jobDocId, orgId, {
        status: 'COMPLETED',
        progress: 100,
        result,
      });

      this.logger.log(
        `VIDEO_FRAME_EXTRACTION completed: ${jobDocId} frames=${extractedFrames.length}`,
      );
    } catch (err: any) {
      await this.client.updateStatus(jobDocId, orgId, {
        status: 'FAILED',
        error: err.message,
      });
      this.logger.error(`VIDEO_FRAME_EXTRACTION failed: ${jobDocId} — ${err.message}`);
      throw err;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
