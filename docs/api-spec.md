# AX 공공임대주택 플랫폼 — REST API 명세 v1

Base URL: `/api/v1`
Content-Type: `application/json`
Auth: `Authorization: Bearer {accessToken}` (JWT)

## 인증 규칙 요약

| Role | 접근 범위 |
|------|-----------|
| SUPER_ADMIN | 전체 |
| ORG_ADMIN | 소속 org 전체 |
| INSPECTOR | 배정된 complex, 본인 session/defect |
| REVIEWER | 배정된 project 조회 + 검토 승인 |
| COMPLAINT_MGR | 소속 org complaint 전체 |
| VIEWER | 소속 org 조회 전용 (GET only) |

---

## 1. AUTH

### POST /auth/login
```
Request:  { email, password }
Response: { accessToken, refreshToken, user: { id, email, name, role, organizationId, assignedComplexIds } }
Errors:   401 Invalid credentials | 403 Account inactive
```

### POST /auth/refresh
```
Request:  { refreshToken }
Response: { accessToken, refreshToken }
Errors:   401 Invalid/expired refresh token
```

### POST /auth/logout
```
Auth:     Required (any role)
Request:  { refreshToken }
Response: { success: true }
Action:   Adds refresh token to Redis deny-list
```

### GET /auth/me
```
Auth:     Required (any role)
Response: UserProfile (no passwordHash)
```

---

## 2. USERS

### GET /users
```
Auth:     ORG_ADMIN+
Query:    role?, complexId?, isActive?, search?, page, limit
Response: { data: UserProfile[], meta: PaginationMeta }
```

### POST /users
```
Auth:     ORG_ADMIN+
Body:     CreateUserRequest
Response: UserProfile
Validation:
  - email: unique within org, valid format
  - password: min 8 chars, 1 upper, 1 number, 1 special
  - role: valid UserRole enum
```

### GET /users/:id
```
Auth:     ORG_ADMIN+ or self
Response: UserProfile
```

### PATCH /users/:id
```
Auth:     ORG_ADMIN+ (or self for name/phone only)
Body:     UpdateUserRequest
Response: UserProfile
```

### DELETE /users/:id
```
Auth:     ORG_ADMIN+
Action:   Soft delete (isActive = false)
Response: { success: true }
```

---

## 3. COMPLEXES (단지/시설물 계층)

### GET /complexes
```
Auth:     All roles
Query:    page, limit, search
Note:     INSPECTOR/VIEWER filtered to assignedComplexIds
Response: { data: HousingComplex[], meta }
```

### POST /complexes
```
Auth:     ORG_ADMIN+
Body:     CreateComplexRequest
Response: HousingComplex
```

### GET /complexes/:id
```
Auth:     All roles (scope check)
Response: HousingComplex
```

### PATCH /complexes/:id
```
Auth:     ORG_ADMIN+
Body:     UpdateComplexRequest
```

### POST /complexes/:id/model
```
Auth:     ORG_ADMIN+
Body:     multipart/form-data { file: glTF binary }
Response: { modelUrl: string }
Action:   Uploads to S3, stores key in complex.siteModelUrl
```

### GET /complexes/:id/buildings
```
Auth:     All roles (scope check)
Response: Building[]
```

### POST /complexes/:id/buildings
```
Auth:     ORG_ADMIN+
Body:     CreateBuildingRequest
Response: Building
```

### GET /complexes/:id/buildings/:buildingId/floors
```
Response: Floor[]
```

### GET /complexes/:id/buildings/:buildingId/floors/:floorId/zones
```
Response: Zone[]
```

### GET /complexes/:id/facilities
```
Query:    buildingId?, floorId?, zoneId?, assetType?
Response: FacilityAsset[]
```

---

## 4. PROJECTS (점검 프로젝트)

### GET /projects
```
Auth:     All roles (scope)
Query:    complexId?, status?, dateFrom?, dateTo?, page, limit
Response: { data: InspectionProject[], meta }
```

### POST /projects
```
Auth:     ORG_ADMIN, REVIEWER
Body:     CreateProjectRequest
Validation:
  - plannedEndDate > plannedStartDate
  - leadInspectorId must exist and have INSPECTOR role
Response: InspectionProject
```

### GET /projects/:id
```
Response: InspectionProject with sessionCount, defectCount summary
```

### PATCH /projects/:id/status
```
Auth:     ORG_ADMIN, REVIEWER
Body:     UpdateProjectStatusRequest
Transitions:
  PLANNED → IN_PROGRESS (leadInspector can also trigger)
  IN_PROGRESS → PENDING_REVIEW
  PENDING_REVIEW → REVIEWED (REVIEWER only)
  REVIEWED → COMPLETED (ORG_ADMIN only)
  Any → CANCELLED (ORG_ADMIN only)
```

### GET /projects/:id/sessions
```
Response: InspectionSession[]
```

### POST /projects/:id/sessions
```
Auth:     ORG_ADMIN, INSPECTOR (assigned)
Body:     CreateSessionRequest
Response: InspectionSession
```

### PATCH /projects/:id/sessions/:sessionId
```
Auth:     INSPECTOR (owner) or ORG_ADMIN
Body:     UpdateSessionRequest
Note:     Validates session belongs to project
```

### GET /projects/:id/sessions/:sessionId/defects
```
Response: Defect[] (paginated)
```

---

## 5. DEFECTS

### POST /defects
```
Auth:     INSPECTOR (session owner), ORG_ADMIN
Body:     CreateDefectRequest
Response: Defect
Side effects:
  - If severity=CRITICAL → auto-create Alert(DEFECT_CRITICAL)
  - Increment session.defectCount
Validation:
  - sessionId must belong to caller's project
  - widthMm, lengthMm: positive numbers
```

### GET /defects/:id
```
Auth:     All roles (scope)
Response: Defect with mediaUrls (pre-signed, 1h expiry)
```

### PATCH /defects/:id
```
Auth:     INSPECTOR (owner), REVIEWER, ORG_ADMIN
Body:     UpdateDefectRequest
```

### GET /defects
```
Query:    DefectListQuery
Response: { data: Defect[], meta }
Note:     VIEWER gets isRepaired filter enforced
```

---

## 6. MEDIA UPLOAD

### POST /media/init
```
Auth:     INSPECTOR, ORG_ADMIN, COMPLAINT_MGR
Body:     MediaUploadInitRequest
Response: { mediaId, uploadUrl (S3 presigned PUT, 10min), storageKey }
Note:     Client uploads directly to S3 using uploadUrl
```

### POST /media/complete
```
Auth:     Same as init
Body:     MediaUploadCompleteRequest
Action:   Validates S3 upload completed, links media to entity
Response: DefectMedia
```

### GET /media/:id
```
Auth:     All roles (scope)
Response: { ...DefectMedia, downloadUrl (presigned GET, 1h) }
```

### DELETE /media/:id
```
Auth:     ORG_ADMIN or creator
Action:   Soft delete + schedule S3 cleanup
```

---

## 7. 3D MARKERS

### POST /markers
```
Auth:     INSPECTOR, ORG_ADMIN
Body:     CreateMarker3DRequest
Response: DefectMarker3D
```

### GET /markers
```
Query:    MarkerListQuery (buildingId required)
Response: DefectMarker3D[]
Note:     Returns position, color, label for Three.js rendering
```

### PATCH /markers/:id
```
Auth:     INSPECTOR (owner), ORG_ADMIN
Body:     { position?, isVisible?, label? }
```

### DELETE /markers/:id
```
Auth:     ORG_ADMIN
Action:   Hard delete (unlinks from defect)
```

---

## 8. CRACK MEASUREMENTS

### POST /cracks/gauge-points
```
Auth:     ORG_ADMIN
Body:     CreateCrackGaugePointRequest
Response: CrackGaugePoint
```

### GET /cracks/gauge-points
```
Query:    complexId, buildingId?, isActive?
Response: CrackGaugePoint[]
```

### POST /cracks/measurements
```
Auth:     INSPECTOR
Body:     CreateCrackMeasurementRequest
Response: CrackMeasurement
Side effects:
  - If exceedsThreshold → create Alert(CRACK_THRESHOLD)
  - Update gaugePoint.lastMeasuredAt
Validation:
  - measuredWidthMm > 0
  - If isManualOverride=false, autoConfidence required
```

### GET /cracks/measurements/history
```
Query:    CrackHistoryQuery
Response: CrackHistoryResponse (time-series array for charting)
```

### GET /cracks/gauge-points/:id/latest
```
Response: CrackMeasurement (most recent)
```

---

## 9. COMPLAINTS

### POST /complaints
```
Auth:     COMPLAINT_MGR, ORG_ADMIN (or unauthenticated resident portal)
Body:     CreateComplaintRequest
Response: Complaint
Side effects:
  - If priority=URGENT → create Alert(COMPLAINT_OVERDUE)
```

### GET /complaints
```
Auth:     COMPLAINT_MGR, ORG_ADMIN, VIEWER
Query:    ComplaintListQuery
Response: { data: Complaint[], meta }
```

### GET /complaints/:id
```
Response: Complaint with full timeline
```

### PATCH /complaints/:id
```
Auth:     COMPLAINT_MGR, ORG_ADMIN
Body:     UpdateComplaintRequest
Action:   Appends ComplaintEvent to timeline on status change
```

### POST /complaints/:id/assign
```
Auth:     COMPLAINT_MGR, ORG_ADMIN
Body:     { assignedTo: string, notes?: string }
Response: Complaint
```

### POST /complaints/:id/resolve
```
Auth:     COMPLAINT_MGR, ORG_ADMIN
Body:     { resolutionNotes: string, workOrderId?: string }
Response: Complaint (status → RESOLVED)
```

---

## 10. SCHEDULES

### GET /schedules
```
Auth:     All roles (scope)
Query:    complexId, scheduleType?, upcoming? (next 30 days)
Response: Schedule[]
```

### POST /schedules
```
Auth:     ORG_ADMIN
Body:     CreateScheduleRequest
```

### PATCH /schedules/:id
```
Auth:     ORG_ADMIN
Body:     Partial<CreateScheduleRequest>
```

### DELETE /schedules/:id
```
Auth:     ORG_ADMIN
Action:   Soft delete (isActive = false)
```

---

## 11. ALERTS

### GET /alerts
```
Auth:     All roles (scope)
Query:    AlertListQuery
Response: { data: Alert[], meta }
```

### PATCH /alerts/:id/acknowledge
```
Auth:     Any role (scoped)
Body:     AcknowledgeAlertRequest
Response: Alert (status → ACKNOWLEDGED)
```

### PATCH /alerts/:id/resolve
```
Auth:     ORG_ADMIN, COMPLAINT_MGR
Response: Alert (status → RESOLVED)
```

---

## 12. REPORTS

### POST /reports/generate
```
Auth:     ORG_ADMIN, REVIEWER
Body:     GenerateReportRequest
Response: { reportId, status: 'QUEUED' }
Note:     Async — Bull queue job; webhook or polling for completion
```

### GET /reports
```
Auth:     All roles (scope; VIEWER only sees isPublic=true)
Query:    complexId, reportType?, projectId?
Response: Report[]
```

### GET /reports/:id/download
```
Auth:     All roles (scope)
Response: { downloadUrl (S3 presigned, 30min) }
```

---

## 13. DASHBOARD

### GET /dashboard
```
Auth:     All roles
Query:    complexId? (optional; if omitted returns org-wide summary)
Response: DashboardResponse
Cache:    Redis, TTL 60s
```

---

## 14. KPI

### GET /kpi
```
Auth:     ORG_ADMIN, VIEWER
Query:    KPIQuery { complexId?, periodStart, periodEnd }
Response: KPIRecord[]
```

### POST /kpi/compute
```
Auth:     ORG_ADMIN (or cron job)
Body:     { complexId, periodStart, periodEnd }
Action:   Recomputes and stores KPIRecord
Response: KPIRecord
```

---

## 공통 에러 코드

| HTTP | Code | 설명 |
|------|------|------|
| 400 | VALIDATION_ERROR | 요청 파라미터 오류 |
| 401 | UNAUTHORIZED | 인증 토큰 없음/만료 |
| 403 | FORBIDDEN | 권한 부족 또는 org 범위 초과 |
| 404 | NOT_FOUND | 리소스 없음 |
| 409 | CONFLICT | 중복 데이터 |
| 422 | BUSINESS_RULE | 비즈니스 규칙 위반 (상태 전환 불가 등) |
| 429 | RATE_LIMITED | 요청 한도 초과 |
| 500 | INTERNAL_ERROR | 서버 오류 |
