// packages/shared/src/jobs/job-types.ts

export enum JobType {
  // ── AI 분석 큐 (ai-queue) ─────────────────────────────────────────
  AI_IMAGE_ANALYSIS       = 'AI_IMAGE_ANALYSIS',       // 이미지 결함 탐지 (Mask R-CNN / Y-MaskNet)
  DRONE_VIDEO_ANALYSIS    = 'DRONE_VIDEO_ANALYSIS',    // 드론 영상 자동 분석
  CRACK_WIDTH_MEASUREMENT = 'CRACK_WIDTH_MEASUREMENT', // 균열 폭 정밀 측정 (OpenCV.js WASM)

  // ── 작업 큐 (job-queue) ───────────────────────────────────────────
  REPORT_GENERATION       = 'REPORT_GENERATION',       // 보고서 자동 생성 (Handlebars + Puppeteer)
  RPA_BILL_GENERATION     = 'RPA_BILL_GENERATION',     // 관리비 고지서 자동 생성 (80% 자동화)
  RPA_CONTRACT_EXPIRY     = 'RPA_CONTRACT_EXPIRY',     // 계약 만료 알림 자동 발송 (100% 자동화)
  RPA_COMPLAINT_INTAKE    = 'RPA_COMPLAINT_INTAKE',    // 민원 접수·AI 자동 분류 (70% 자동화)
  SCHEDULE_AUTO_GENERATE  = 'SCHEDULE_AUTO_GENERATE',  // 정기 점검 일정 자동 생성 (90% 자동화)

  // ── Phase 2: 드론 미디어 파이프라인 (job-queue) ───────────────────
  VIDEO_FRAME_EXTRACTION     = 'VIDEO_FRAME_EXTRACTION',    // 드론 영상 → 프레임 추출 (ffmpeg)
  IMAGE_METADATA_EXTRACTION  = 'IMAGE_METADATA_EXTRACTION', // 이미지 EXIF/GPS 메타데이터 추출

  // ── Phase 2: 결함 자동 탐지 파이프라인 (ai-queue) ────────────────
  DEFECT_DETECTION = 'DEFECT_DETECTION', // 이미지/프레임 결함 후보 자동 탐지 (Mask R-CNN / Y-MaskNet)

  // ── Phase 2: 균열 심층 분석 파이프라인 (ai-queue) ─────────────────
  CRACK_ANALYSIS = 'CRACK_ANALYSIS', // 이미지 기반 균열 폭/길이 추정 + ROI + 마스크 + 신뢰도

  // ── Phase 2: AI 진단 의견 파이프라인 (ai-queue) ───────────────────
  DIAGNOSIS_OPINION = 'DIAGNOSIS_OPINION', // 결함·점검세션 종합 AI 진단 의견 초안 생성 (LLM)

  // ── Phase 2-6: 민원 AI 트리아지 파이프라인 (ai-queue) ────────────
  COMPLAINT_TRIAGE = 'COMPLAINT_TRIAGE', // 민원 텍스트/이미지 기반 자동 분류·우선순위·배정 추천

  // ── Phase 2-7: RPA/업무 자동화 엔진 (job-queue) ──────────────────
  AUTOMATION_RULE_EXECUTE = 'AUTOMATION_RULE_EXECUTE', // 자동화 룰 액션 실행 (외부 알림)
  AUTOMATION_RULE_SCAN    = 'AUTOMATION_RULE_SCAN',    // 날짜 기반 룰 전체 스캔
  NOTIFICATION_SEND       = 'NOTIFICATION_SEND',       // 이메일/SMS mock 발송

  // ── Phase 2-9: 예지정비 & 장기수선 의사결정 (job-queue) ──────────
  RISK_SCORE_CALCULATE    = 'RISK_SCORE_CALCULATE',    // 자산/구역 위험도 스코어 계산
  MAINTENANCE_RECOMMEND   = 'MAINTENANCE_RECOMMEND',   // 장기수선 권장 문서 생성
}

/** AI 처리 큐로 라우팅될 작업 유형 */
export const AI_JOB_TYPES: JobType[] = [
  JobType.AI_IMAGE_ANALYSIS,
  JobType.DRONE_VIDEO_ANALYSIS,
  JobType.CRACK_WIDTH_MEASUREMENT,
  JobType.DEFECT_DETECTION,
  JobType.CRACK_ANALYSIS,
  JobType.DIAGNOSIS_OPINION,
  JobType.COMPLAINT_TRIAGE,
]

/** 범용 작업 큐로 라우팅될 작업 유형 */
export const JOB_WORKER_JOB_TYPES: JobType[] = [
  JobType.REPORT_GENERATION,
  JobType.RPA_BILL_GENERATION,
  JobType.RPA_CONTRACT_EXPIRY,
  JobType.RPA_COMPLAINT_INTAKE,
  JobType.SCHEDULE_AUTO_GENERATE,
  JobType.VIDEO_FRAME_EXTRACTION,
  JobType.IMAGE_METADATA_EXTRACTION,
  JobType.AUTOMATION_RULE_EXECUTE,
  JobType.AUTOMATION_RULE_SCAN,
  JobType.NOTIFICATION_SEND,
  // Phase 2-9
  JobType.RISK_SCORE_CALCULATE,
  JobType.MAINTENANCE_RECOMMEND,
]

/** 작업 유형 → Bull 큐 이름 매핑 */
export const QUEUE_FOR_JOB_TYPE: Record<JobType, 'ai-queue' | 'job-queue'> = {
  [JobType.AI_IMAGE_ANALYSIS]:          'ai-queue',
  [JobType.DRONE_VIDEO_ANALYSIS]:       'ai-queue',
  [JobType.CRACK_WIDTH_MEASUREMENT]:    'ai-queue',
  [JobType.REPORT_GENERATION]:          'job-queue',
  [JobType.RPA_BILL_GENERATION]:        'job-queue',
  [JobType.RPA_CONTRACT_EXPIRY]:        'job-queue',
  [JobType.RPA_COMPLAINT_INTAKE]:       'job-queue',
  [JobType.SCHEDULE_AUTO_GENERATE]:     'job-queue',
  [JobType.VIDEO_FRAME_EXTRACTION]:     'job-queue',
  [JobType.IMAGE_METADATA_EXTRACTION]:  'job-queue',
  [JobType.DEFECT_DETECTION]:           'ai-queue',
  [JobType.CRACK_ANALYSIS]:             'ai-queue',
  [JobType.DIAGNOSIS_OPINION]:          'ai-queue',
  [JobType.COMPLAINT_TRIAGE]:           'ai-queue',
  [JobType.AUTOMATION_RULE_EXECUTE]:    'job-queue',
  [JobType.AUTOMATION_RULE_SCAN]:       'job-queue',
  [JobType.NOTIFICATION_SEND]:          'job-queue',
  // Phase 2-9
  [JobType.RISK_SCORE_CALCULATE]:       'job-queue',
  [JobType.MAINTENANCE_RECOMMEND]:      'job-queue',
}
