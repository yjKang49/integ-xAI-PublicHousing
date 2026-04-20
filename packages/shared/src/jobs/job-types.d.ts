export declare enum JobType {
    AI_IMAGE_ANALYSIS = "AI_IMAGE_ANALYSIS",// 이미지 결함 탐지 (Mask R-CNN / Y-MaskNet)
    DRONE_VIDEO_ANALYSIS = "DRONE_VIDEO_ANALYSIS",// 드론 영상 자동 분석
    CRACK_WIDTH_MEASUREMENT = "CRACK_WIDTH_MEASUREMENT",// 균열 폭 정밀 측정 (OpenCV.js WASM)
    REPORT_GENERATION = "REPORT_GENERATION",// 보고서 자동 생성 (Handlebars + Puppeteer)
    RPA_BILL_GENERATION = "RPA_BILL_GENERATION",// 관리비 고지서 자동 생성 (80% 자동화)
    RPA_CONTRACT_EXPIRY = "RPA_CONTRACT_EXPIRY",// 계약 만료 알림 자동 발송 (100% 자동화)
    RPA_COMPLAINT_INTAKE = "RPA_COMPLAINT_INTAKE",// 민원 접수·AI 자동 분류 (70% 자동화)
    SCHEDULE_AUTO_GENERATE = "SCHEDULE_AUTO_GENERATE",// 정기 점검 일정 자동 생성 (90% 자동화)
    VIDEO_FRAME_EXTRACTION = "VIDEO_FRAME_EXTRACTION",// 드론 영상 → 프레임 추출 (ffmpeg)
    IMAGE_METADATA_EXTRACTION = "IMAGE_METADATA_EXTRACTION",// 이미지 EXIF/GPS 메타데이터 추출
    DEFECT_DETECTION = "DEFECT_DETECTION",// 이미지/프레임 결함 후보 자동 탐지 (Mask R-CNN / Y-MaskNet)
    CRACK_ANALYSIS = "CRACK_ANALYSIS",// 이미지 기반 균열 폭/길이 추정 + ROI + 마스크 + 신뢰도
    DIAGNOSIS_OPINION = "DIAGNOSIS_OPINION",// 결함·점검세션 종합 AI 진단 의견 초안 생성 (LLM)
    COMPLAINT_TRIAGE = "COMPLAINT_TRIAGE",// 민원 텍스트/이미지 기반 자동 분류·우선순위·배정 추천
    AUTOMATION_RULE_EXECUTE = "AUTOMATION_RULE_EXECUTE",// 자동화 룰 액션 실행 (외부 알림)
    AUTOMATION_RULE_SCAN = "AUTOMATION_RULE_SCAN",// 날짜 기반 룰 전체 스캔
    NOTIFICATION_SEND = "NOTIFICATION_SEND",// 이메일/SMS mock 발송
    RISK_SCORE_CALCULATE = "RISK_SCORE_CALCULATE",// 자산/구역 위험도 스코어 계산
    MAINTENANCE_RECOMMEND = "MAINTENANCE_RECOMMEND",
    ANTIGRAVITY_CORRECTION = "ANTIGRAVITY_CORRECTION",// Antigravity 오탐 보정 후처리
    FEM_CROSS_VALIDATION = "FEM_CROSS_VALIDATION",// 세종대 FEM 구조해석 교차검증
    LIO_SLAM_MAPPING = "LIO_SLAM_MAPPING",// LIO-SLAM 점군 데이터 처리
    VIDEO_DEIDENTIFICATION = "VIDEO_DEIDENTIFICATION",// 드론·앱 영상 NPU 비식별화
    AGING_CURVE_PREDICT = "AGING_CURVE_PREDICT",// KALIS-FMS 기반 노후화 곡선 예측
    LEGAL_REPORT_GENERATION = "LEGAL_REPORT_GENERATION",// LLM/RAG 법정 보고서 생성
    KALIS_FMS_SYNC = "KALIS_FMS_SYNC",// KALIS-FMS 이력 동기화
    SEJUMTEO_SYNC = "SEJUMTEO_SYNC"// 세움터 건축물대장 동기화
}
/** AI 처리 큐로 라우팅될 작업 유형 */
export declare const AI_JOB_TYPES: JobType[];
/** 범용 작업 큐로 라우팅될 작업 유형 */
export declare const JOB_WORKER_JOB_TYPES: JobType[];
/** 작업 유형 → Bull 큐 이름 매핑 */
export declare const QUEUE_FOR_JOB_TYPE: Record<JobType, 'ai-queue' | 'job-queue'>;
