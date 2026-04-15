// apps/ai-worker/src/adapters/mock-crack-analysis.adapter.ts
import { Injectable } from '@nestjs/common'
import { CrackAnalysisAdapter, CrackAnalysisInput, CrackAnalysisAdapterResult } from './crack-analysis.adapter'
import { CrackCalibrationParams } from '@ax/shared'

/** storageKey 기반 결정론적 해시 (같은 이미지 → 같은 결과) */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Mock CV 어댑터 — 실제 OpenCV/WASM 없이 결정론적 결과 반환.
 * 프로덕션 교체 시: { provide: CRACK_ANALYSIS_ADAPTER, useClass: OpenCvWasmAdapter }
 */
@Injectable()
export class MockCrackAnalysisAdapter implements CrackAnalysisAdapter {
  async analyze(input: CrackAnalysisInput): Promise<CrackAnalysisAdapterResult> {
    // 모의 처리 지연 (300~800ms)
    const delay = 300 + (hashCode(input.storageKey) % 500)
    await new Promise(r => setTimeout(r, delay))

    const h = hashCode(input.storageKey)
    const { mmPerGraduation, manualPxPerMm } = input.options.calibration

    // 모의 캘리브레이션: 눈금 간격 8~15px
    const avgSpacingPx = 8 + (h % 8)
    const pxPerMm = manualPxPerMm ?? (avgSpacingPx / mmPerGraduation)
    const graduationCount = 3 + (h % 5)
    const graduationsDetected = !manualPxPerMm

    const calibration: CrackCalibrationParams = {
      mmPerGraduation,
      pxPerMm,
      graduationCount: graduationsDetected ? graduationCount : 0,
      avgGraduationSpacingPx: graduationsDetected ? avgSpacingPx : 0,
      isManualCalibration: !!manualPxPerMm,
    }

    // 모의 균열 크기 (폭 0.05~0.50mm, 길이 5~50mm)
    const maxWidthMm = Number(((h % 45 + 5) / 100).toFixed(3))
    const avgWidthMm = Number((maxWidthMm * 0.7).toFixed(3))
    const lengthMm   = Number((5 + (h % 45)).toFixed(1))
    const maxWidthPx = Math.round(maxWidthMm * pxPerMm)
    const lengthPx   = Math.round(lengthMm * pxPerMm)

    const sampleCount = input.options.widthSampleCount ?? 5
    const widthSamples = Array.from({ length: sampleCount }, (_, i) => ({
      position: i / (sampleCount - 1),
      widthPx: Math.round(maxWidthPx * (0.6 + Math.sin(i) * 0.4)),
      widthMm: Number((maxWidthMm * (0.6 + Math.sin(i) * 0.4)).toFixed(3)),
    }))

    const crackDetected = maxWidthMm > 0.05

    const calibrationConfidence = graduationsDetected ? 0.85 + (h % 15) / 100 : 0.5
    const contourQuality = crackDetected ? 0.7 + (h % 30) / 100 : 0.2
    const overall = crackDetected
      ? Number(((calibrationConfidence * 0.4 + contourQuality * 0.6)).toFixed(3))
      : 0.1

    return {
      analysis: {
        maxWidthMm,
        avgWidthMm,
        lengthMm,
        maxWidthPx,
        lengthPx,
        crackAreaPx: Math.round(lengthPx * avgWidthMm * pxPerMm),
        widthSamples,
        orientationDeg: (h % 180) - 90,
        boundingBox: {
          x: 10 + (h % 50),
          y: 10 + (h % 50),
          w: Math.round(lengthPx * 0.8),
          h: Math.round(maxWidthPx * 3),
        },
        ...(input.options.extractMask && {
          mask: {
            encoding: 'polygon' as const,
            imageWidth: 640,
            imageHeight: 480,
            polygon: [[10, 240], [630, 240], [630, 244], [10, 244]] as [number, number][],
            pixelCount: Math.round(lengthPx * maxWidthPx),
          },
        }),
        ...(input.options.extractSkeleton && {
          skeleton: {
            points: Array.from({ length: 5 }, (_, i) => [
              Math.round(10 + (lengthPx * i) / 4),
              242,
            ]) as [number, number][],
            totalLengthPx: lengthPx,
          },
        }),
      },
      calibration,
      confidence: overall,
      confidenceBreakdown: {
        crackDetected,
        graduationsDetected,
        calibrationConfidence,
        contourQuality,
        overall,
      },
      modelVersion: 'mock-cv-1.0.0',
    }
  }
}
