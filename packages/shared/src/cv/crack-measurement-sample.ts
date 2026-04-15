/**
 * packages/shared/src/cv/crack-measurement-sample.ts
 *
 * OpenCV.js 기반 균열 폭 측정 샘플 코드
 * ─────────────────────────────────────────────────────────────────
 * 실제 AI 모델 없이 이미지 처리만으로 균열 폭을 추정합니다.
 * 측정 실패 시 isManualOverride=true로 수동값 입력 가능합니다.
 *
 * ⚠  OpenCV.js WASM 바이너리는 index.html에서 script 태그로 로드합니다:
 *    <script async src="https://docs.opencv.org/4.10.0/opencv.js"
 *            onload="Module.onRuntimeInitialized = () => { cv = Module; }"></script>
 *
 * 알고리즘 흐름:
 *   1. 이미지 → 그레이스케일 변환
 *   2. 가우시안 블러 (노이즈 제거)
 *   3. 적응형 이진화 (균열 = 어두운 영역)
 *   4. 모폴로지 닫힘 연산 (균열 선 연결)
 *   5. 외곽선 검출 → 가장 큰 윤곽 = 균열 영역
 *   6. Hough 변환으로 수평 눈금선 검출 → px/mm 비율 계산
 *   7. 균열 폭(px) / (px/mm) = 균열 폭(mm)
 */

declare const cv: any; // OpenCV.js global

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface CvMeasurementInput {
  /** HTMLCanvasElement or ImageData containing the image */
  canvas: HTMLCanvasElement;
  /** mm per graduation mark (calibration value, e.g., 0.1 mm per tick) */
  mmPerGraduation: number;
  /** Optional: restrict analysis to this region */
  roi?: { x: number; y: number; w: number; h: number };
}

export interface CvMeasurementOutput {
  /** Final crack width in mm */
  measuredWidthMm: number;
  /** Crack width in pixels (before scale conversion) */
  crackWidthPx: number;
  /** Number of graduation marks detected */
  graduationCount: number;
  /** Pixels per millimeter (derived from graduation spacing) */
  pxPerMm: number;
  /** Scale calibration: mm per graduation used */
  scaleMmPerGraduation: number;
  /** Confidence 0–1 based on contour quality + graduation detection */
  autoConfidence: number;
  /** True if crack contour was found */
  crackDetected: boolean;
  /** True if graduation marks were detected */
  graduationsDetected: boolean;
  /** Raw debug info */
  debug: {
    largestContourArea: number;
    uniqueGraduationPositions: number[];
    avgGraduationSpacingPx: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// Main measurement function
// ─────────────────────────────────────────────────────────────────

/**
 * Run OpenCV.js crack width measurement on the given canvas.
 * This function is synchronous — wrap in setTimeout or requestAnimationFrame
 * to keep the UI responsive.
 */
export function measureCrackWidth(input: CvMeasurementInput): CvMeasurementOutput {
  let src: any, gray: any, blurred: any, binary: any, morphed: any;

  try {
    // ── Step 1: Load image ──────────────────────────────────────
    src = cv.imread(input.canvas);

    // Apply ROI crop if specified
    if (input.roi) {
      const { x, y, w, h } = input.roi;
      const rect = new cv.Rect(x, y, w, h);
      const cropped = src.roi(rect);
      src.delete();
      src = cropped;
    }

    // ── Step 2: Grayscale ────────────────────────────────────────
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // ── Step 3: Gaussian blur ─────────────────────────────────────
    blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // ── Step 4: Adaptive threshold ────────────────────────────────
    // Cracks are dark regions → THRESH_BINARY_INV makes them white
    binary = new cv.Mat();
    cv.adaptiveThreshold(
      blurred, binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11, 2,
    );

    // ── Step 5: Morphological close ───────────────────────────────
    // Closes small gaps in the crack line
    morphed = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);
    kernel.delete();

    // ── Step 6: Find contours → largest = crack region ───────────
    const contours  = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      morphed, contours, hierarchy,
      cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE,
    );

    let maxArea = 0;
    let crackWidthPx = 0;

    for (let i = 0; i < contours.size(); i++) {
      const c    = contours.get(i);
      const area = cv.contourArea(c);
      if (area > maxArea) {
        maxArea = area;
        const bRect  = cv.boundingRect(c);
        // Crack width = minimum dimension of bounding rect
        // (cracks are typically longer than wide)
        crackWidthPx = Math.min(bRect.width, bRect.height);
      }
      c.delete();
    }
    contours.delete();
    hierarchy.delete();

    // ── Step 7: Detect graduation marks via Hough lines ─────────
    const { graduationCount, pxPerMm, uniquePositions, avgSpacingPx } =
      detectGraduations(gray, input.mmPerGraduation);

    // ── Step 8: Convert px → mm ───────────────────────────────────
    const measuredWidthMm = pxPerMm > 0
      ? parseFloat((crackWidthPx / pxPerMm).toFixed(3))
      : parseFloat((crackWidthPx * 0.01).toFixed(3)); // fallback: assume 10px/mm

    // ── Step 9: Confidence score ──────────────────────────────────
    const crackDetected      = maxArea > 50;
    const graduationsDetected = graduationCount >= 2;
    const autoConfidence =
      (crackDetected ? 0.5 : 0.1) +
      (graduationsDetected ? 0.4 : 0) +
      (maxArea > 200 ? 0.1 : 0); // bonus for large contour

    return {
      measuredWidthMm,
      crackWidthPx,
      graduationCount,
      pxPerMm,
      scaleMmPerGraduation: input.mmPerGraduation,
      autoConfidence: Math.min(autoConfidence, 1),
      crackDetected,
      graduationsDetected,
      debug: {
        largestContourArea: maxArea,
        uniqueGraduationPositions: uniquePositions,
        avgGraduationSpacingPx: avgSpacingPx,
      },
    };
  } finally {
    src?.delete();
    gray?.delete();
    blurred?.delete();
    binary?.delete();
    morphed?.delete();
  }
}

// ─────────────────────────────────────────────────────────────────
// Graduation detection helper
// ─────────────────────────────────────────────────────────────────

interface GraduationResult {
  graduationCount: number;
  pxPerMm: number;
  uniquePositions: number[];
  avgSpacingPx: number;
}

function detectGraduations(grayMat: any, mmPerGraduation: number): GraduationResult {
  let edges: any, lines: any;
  try {
    edges = new cv.Mat();
    lines = new cv.Mat();

    // Canny edge detection
    cv.Canny(grayMat, edges, 50, 150);

    // Hough line transform — detect candidate lines
    cv.HoughLines(edges, lines, 1, Math.PI / 180, 60);

    // Filter for near-horizontal lines (graduation marks are horizontal)
    const yPositions: number[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const theta = lines.data32F[i * 2 + 1];
      const isHorizontal = Math.abs(theta) < 0.2 || Math.abs(theta - Math.PI) < 0.2;
      if (isHorizontal) {
        const rho = lines.data32F[i * 2];
        yPositions.push(Math.abs(rho));
      }
    }

    // Cluster positions within 3px to count unique graduation marks
    const unique = clusterPositions(yPositions, 3);
    const count  = unique.length;

    // Calculate average spacing between graduation marks
    let avgSpacingPx = 0;
    let pxPerMm = 0;
    if (count >= 2) {
      const sorted = [...unique].sort((a, b) => a - b);
      const spacings = sorted.slice(1).map((v, i) => v - sorted[i]);
      avgSpacingPx = spacings.reduce((s, v) => s + v, 0) / spacings.length;
      pxPerMm = mmPerGraduation > 0 ? avgSpacingPx / mmPerGraduation : 0;
    }

    return { graduationCount: count, pxPerMm, uniquePositions: unique, avgSpacingPx };
  } finally {
    edges?.delete();
    lines?.delete();
  }
}

/** Cluster nearby values within `threshold` pixels */
function clusterPositions(positions: number[], threshold: number): number[] {
  if (positions.length === 0) return [];
  const sorted = [...positions].sort((a, b) => a - b);
  const clusters: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - clusters[clusters.length - 1] > threshold) {
      clusters.push(sorted[i]);
    }
  }
  return clusters;
}

// ─────────────────────────────────────────────────────────────────
// Async wrapper (avoids blocking the main thread)
// ─────────────────────────────────────────────────────────────────

/**
 * Asynchronous wrapper — runs measureCrackWidth in the next microtask
 * so the loading spinner has a chance to render.
 */
export function measureCrackWidthAsync(input: CvMeasurementInput): Promise<CvMeasurementOutput> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(measureCrackWidth(input));
      } catch (err) {
        reject(err);
      }
    }, 50);
  });
}

// ─────────────────────────────────────────────────────────────────
// Visualisation helper (debug overlay)
// ─────────────────────────────────────────────────────────────────

/**
 * Draw crack detection result onto a canvas for debugging.
 * Returns the canvas element with the overlay rendered.
 */
export function drawDebugOverlay(
  sourceCanvas: HTMLCanvasElement,
  result: CvMeasurementOutput,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width  = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx  = out.getContext('2d')!;

  // Draw original image
  ctx.drawImage(sourceCanvas, 0, 0);

  // Draw graduation lines
  ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
  ctx.lineWidth   = 1;
  for (const y of result.debug.uniqueGraduationPositions) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(out.width, y);
    ctx.stroke();
  }

  // Draw crack width indicator
  ctx.fillStyle = 'rgba(255, 80, 0, 0.9)';
  ctx.font      = `bold ${Math.max(14, out.width * 0.04)}px sans-serif`;
  ctx.fillText(
    `${result.measuredWidthMm.toFixed(2)} mm  (conf: ${(result.autoConfidence * 100).toFixed(0)}%)`,
    10,
    Math.max(24, out.height * 0.06),
  );

  return out;
}
