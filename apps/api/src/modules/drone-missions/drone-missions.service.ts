// apps/api/src/modules/drone-missions/drone-missions.service.ts
import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import { ConfigService } from '@nestjs/config'
import {
  S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import { CouchService } from '../../database/couch.service'

const CACHE_TTL = 10
import { JobsService } from '../jobs/jobs.service'
import {
  DroneMission, DroneMissionMedia, DroneMissionStatus, DroneMediaItemStatus,
  MediaFrame,
} from '@ax/shared'
import { JobType } from '@ax/shared'
import {
  CreateDroneMissionDto, UpdateDroneMissionDto,
  InitDroneMediaUploadDto, CompleteDroneMediaUploadDto,
  DroneMissionQueryDto,
} from './dto/drone-mission.dto'

// ── S3 경로 규칙 ──────────────────────────────────────────────────────────────
// drone/{orgId}/{complexId}/{missionShortId}/videos/{ts}_{uuid}.{ext}
// drone/{orgId}/{complexId}/{missionShortId}/images/{ts}_{uuid}.{ext}
// drone/{orgId}/{complexId}/{missionShortId}/frames/{mediaItemId}/frame_{idx:06d}.jpg

const UPLOAD_URL_EXPIRY = 900      // 15분 (대용량 영상 고려)
const DOWNLOAD_URL_EXPIRY = 3600

@Injectable()
export class DroneMissionsService {
  private readonly logger = new Logger(DroneMissionsService.name)
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly computingKeys = new Set<string>()

  constructor(
    private readonly couch: CouchService,
    private readonly config: ConfigService,
    private readonly jobsService: JobsService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'ap-northeast-2'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
    })
    this.bucket = config.get<string>('S3_BUCKET', 'ax-media')
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(orgId: string, dto: CreateDroneMissionDto, userId: string): Promise<DroneMission> {
    const now = new Date().toISOString()
    const shortId = uuid().replace(/-/g, '').slice(0, 8)
    const docId = `droneMission:${orgId}:${shortId}`

    const doc: DroneMission = {
      _id: docId,
      docType: 'droneMission',
      orgId,
      complexId: dto.complexId,
      ...(dto.buildingId  && { buildingId:  dto.buildingId }),
      ...(dto.sessionId   && { sessionId:   dto.sessionId }),
      title: dto.title,
      ...(dto.description && { description: dto.description }),
      status: DroneMissionStatus.CREATED,
      pilot: dto.pilot,
      flightDate: dto.flightDate,
      ...(dto.droneModel         && { droneModel:         dto.droneModel }),
      ...(dto.weatherCondition   && { weatherCondition:   dto.weatherCondition }),
      mediaItems: [],
      jobIds: [],
      ...(dto.gpsTrack           && { gpsTrack:           dto.gpsTrack }),
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    }

    const saved = await this.couch.create(orgId, doc)
    this.logger.log(`DroneMission created: ${docId}`)
    return saved as DroneMission
  }

  async findAll(
    orgId: string,
    query: DroneMissionQueryDto,
  ): Promise<{ data: DroneMission[]; meta: { total: number; page: number; limit: number; hasNext: boolean } }> {
    const cacheKey = `drone-missions:list:${orgId}:${JSON.stringify(query)}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
    while (this.computingKeys.has(cacheKey)) {
      await new Promise(r => setTimeout(r, 150))
      const retry = await this.redis.get(cacheKey)
      if (retry) return JSON.parse(retry)
    }
    this.computingKeys.add(cacheKey)
    const fresh = await this.redis.get(cacheKey)
    if (fresh) { this.computingKeys.delete(cacheKey); return JSON.parse(fresh) }
    try {
      const selector: Record<string, any> = { docType: 'droneMission', orgId }
      if (query.complexId) selector.complexId = query.complexId
      if (query.sessionId) selector.sessionId = query.sessionId
      if (query.status)    selector.status    = query.status
      const page  = Math.max(1, query.page  ?? 1)
      const limit = Math.min(query.limit ?? 20, 100)
      const { docs } = await this.couch.find<DroneMission>(orgId, selector, { limit: limit + 1, skip: (page - 1) * limit, sort: [{ createdAt: 'desc' }] })
      const hasNext = docs.length > limit
      const result = { data: hasNext ? docs.slice(0, limit) : docs, meta: { total: docs.length, page, limit, hasNext } }
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
      return result
    } finally { this.computingKeys.delete(cacheKey) }
  }

  async findById(orgId: string, missionId: string): Promise<DroneMission> {
    const doc = await this.couch.findById<DroneMission>(orgId, missionId)
    if (!doc || (doc as any)._deleted) {
      throw new NotFoundException(`DroneMission ${missionId} 를 찾을 수 없습니다.`)
    }
    return doc
  }

  async update(
    orgId: string,
    missionId: string,
    dto: UpdateDroneMissionDto,
    userId: string,
  ): Promise<DroneMission> {
    const doc = await this.findById(orgId, missionId)

    const updated: DroneMission = {
      ...doc,
      ...(dto.title            !== undefined && { title:            dto.title }),
      ...(dto.description      !== undefined && { description:      dto.description }),
      ...(dto.pilot            !== undefined && { pilot:            dto.pilot }),
      ...(dto.flightDate       !== undefined && { flightDate:       dto.flightDate }),
      ...(dto.droneModel       !== undefined && { droneModel:       dto.droneModel }),
      ...(dto.weatherCondition !== undefined && { weatherCondition: dto.weatherCondition }),
      ...(dto.sessionId        !== undefined && { sessionId:        dto.sessionId }),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }

    return this.couch.update(orgId, updated) as Promise<DroneMission>
  }

  // ── 미디어 업로드 ────────────────────────────────────────────────────────────

  /**
   * 미디어 업로드 초기화 — S3 pre-signed PUT URL 발급, DroneMissionMedia 항목 추가
   */
  async initMediaUpload(
    orgId: string,
    missionId: string,
    dto: InitDroneMediaUploadDto,
    userId: string,
  ) {
    const mission = await this.findById(orgId, missionId)
    if (mission.status === DroneMissionStatus.COMPLETED || mission.status === DroneMissionStatus.FAILED) {
      throw new BadRequestException(`완료/실패 상태의 미션에는 파일을 추가할 수 없습니다.`)
    }

    const mediaItemId = uuid()
    const ext  = dto.fileName.split('.').pop()?.toLowerCase() ?? 'bin'
    const subDir = dto.mediaType === 'VIDEO' ? 'videos' : 'images'
    const shortMissionId = missionId.split(':').pop()
    const storageKey = `drone/${orgId}/${mission.complexId}/${shortMissionId}/${subDir}/${Date.now()}_${uuid().slice(0, 8)}.${ext}`

    // pre-signed PUT URL 발급
    const putCmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: dto.mimeType,
      ContentLength: dto.fileSize,
      Metadata: { orgId, missionId, mediaItemId, uploadedBy: userId },
    })
    const uploadUrl = await getSignedUrl(this.s3, putCmd, { expiresIn: UPLOAD_URL_EXPIRY })

    // DroneMissionMedia 항목 추가
    const newItem: DroneMissionMedia = {
      mediaItemId,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      mediaType: dto.mediaType,
      storageKey,
      status: DroneMediaItemStatus.PENDING,
      ...(dto.capturedAt && { capturedAt: dto.capturedAt }),
    }

    const updatedMission: DroneMission = {
      ...mission,
      mediaItems: [...mission.mediaItems, newItem],
      status: DroneMissionStatus.UPLOADING,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }
    await this.couch.update(orgId, updatedMission)

    this.logger.log(`Media upload initiated: missionId=${missionId} mediaItemId=${mediaItemId}`)
    return { mediaItemId, uploadUrl, storageKey }
  }

  /**
   * 업로드 완료 확인 — S3 검증 후 메타데이터 업데이트 + 추출 Job 생성
   */
  async completeMediaUpload(
    orgId: string,
    missionId: string,
    mediaItemId: string,
    dto: CompleteDroneMediaUploadDto,
    userId: string,
  ): Promise<DroneMission> {
    const mission = await this.findById(orgId, missionId)

    const itemIdx = mission.mediaItems.findIndex(m => m.mediaItemId === mediaItemId)
    if (itemIdx === -1) {
      throw new NotFoundException(`미디어 항목 ${mediaItemId}를 찾을 수 없습니다.`)
    }
    const item = mission.mediaItems[itemIdx]

    // S3 업로드 검증
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: item.storageKey }))
    } catch {
      throw new BadRequestException('S3 업로드가 완료되지 않았습니다. 파일을 먼저 업로드하세요.')
    }

    // 추출 Job 생성 (VIDEO → 프레임 추출, IMAGE → 메타데이터 추출)
    const jobType = item.mediaType === 'VIDEO'
      ? JobType.VIDEO_FRAME_EXTRACTION
      : JobType.IMAGE_METADATA_EXTRACTION

    const payload = {
      missionId,
      mediaItemId,
      complexId: mission.complexId,
      storageKey: item.storageKey,
      ...(item.mediaType === 'VIDEO' && { keyframeIntervalSec: 5, maxFrames: 200 }),
    }

    const job = await this.jobsService.create(orgId, {
      type: jobType,
      payload,
      priority: 'NORMAL',
      complexId: mission.complexId,
    }, userId)

    // 미디어 아이템 상태 업데이트
    const updatedItems = [...mission.mediaItems]
    updatedItems[itemIdx] = {
      ...item,
      status: DroneMediaItemStatus.UPLOADED,
      uploadedAt: new Date().toISOString(),
      extractionJobId: job._id,
      ...(dto.capturedAt && { capturedAt: dto.capturedAt }),
      ...(dto.gpsLat !== undefined && { gpsLat: dto.gpsLat }),
      ...(dto.gpsLng !== undefined && { gpsLng: dto.gpsLng }),
      ...(dto.gpsAlt !== undefined && { gpsAlt: dto.gpsAlt }),
    }

    const allDone = updatedItems.every(m =>
      [DroneMediaItemStatus.UPLOADED, DroneMediaItemStatus.DONE, DroneMediaItemStatus.FAILED].includes(m.status)
    )

    const updatedMission: DroneMission = {
      ...mission,
      mediaItems: updatedItems,
      status: allDone ? DroneMissionStatus.UPLOADED : DroneMissionStatus.UPLOADING,
      jobIds: [...(mission.jobIds || []), job._id],
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }

    const saved = await this.couch.update(orgId, updatedMission)
    this.logger.log(`Media upload complete: missionId=${missionId} mediaItemId=${mediaItemId} jobId=${job._id}`)
    return saved as DroneMission
  }

  /**
   * 미디어 항목 삭제 (PENDING/UPLOADED 상태만 가능)
   */
  async removeMedia(orgId: string, missionId: string, mediaItemId: string, userId: string): Promise<DroneMission> {
    const mission = await this.findById(orgId, missionId)
    const item = mission.mediaItems.find(m => m.mediaItemId === mediaItemId)
    if (!item) throw new NotFoundException(`미디어 항목 ${mediaItemId}를 찾을 수 없습니다.`)
    if (item.status === DroneMediaItemStatus.EXTRACTING) {
      throw new BadRequestException('추출 중인 미디어는 삭제할 수 없습니다.')
    }

    // S3 비동기 삭제
    this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: item.storageKey }))
      .catch(err => this.logger.warn(`S3 삭제 실패 (${item.storageKey}): ${err.message}`))

    const updated: DroneMission = {
      ...mission,
      mediaItems: mission.mediaItems.filter(m => m.mediaItemId !== mediaItemId),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }
    return this.couch.update(orgId, updated) as Promise<DroneMission>
  }

  // ── AI 분석 트리거 ───────────────────────────────────────────────────────────

  /**
   * 미션의 추출된 프레임 전체에 대해 AI 분석 Job 생성
   */
  async startAnalysis(orgId: string, missionId: string, userId: string): Promise<{ jobsCreated: number }> {
    const mission = await this.findById(orgId, missionId)

    if (mission.status === DroneMissionStatus.CREATED || mission.status === DroneMissionStatus.UPLOADING) {
      throw new BadRequestException('업로드가 완료되지 않은 미션은 분석을 시작할 수 없습니다.')
    }

    // 추출 완료된 VIDEO 미디어 아이템의 프레임들을 AI 분석으로 넘김
    const videoItems = mission.mediaItems.filter(
      m => m.mediaType === 'VIDEO' && m.status === DroneMediaItemStatus.DONE,
    )

    let jobsCreated = 0
    for (const item of videoItems) {
      const job = await this.jobsService.create(orgId, {
        type: JobType.DRONE_VIDEO_ANALYSIS,
        payload: {
          missionId,
          mediaId: item.mediaItemId,
          complexId: mission.complexId,
          buildingId: mission.buildingId,
          storageKey: item.storageKey,
          keyframeIntervalSec: 5,
        },
        priority: 'NORMAL',
        complexId: mission.complexId,
      }, userId)

      jobsCreated++
      this.logger.log(`AI analysis job created: ${job._id} for mediaItemId=${item.mediaItemId}`)
    }

    // 정지 이미지도 AI 분석 등록
    const imageItems = mission.mediaItems.filter(
      m => m.mediaType === 'IMAGE' && m.status === DroneMediaItemStatus.DONE,
    )
    for (const item of imageItems) {
      const job = await this.jobsService.create(orgId, {
        type: JobType.AI_IMAGE_ANALYSIS,
        payload: {
          missionId,
          mediaId: item.mediaItemId,
          complexId: mission.complexId,
          storageKey: item.storageKey,
          model: 'Y_MASKNET',
          confidenceThreshold: 0.8,
        },
        priority: 'NORMAL',
        complexId: mission.complexId,
      }, userId)
      jobsCreated++
      this.logger.log(`Image AI job created: ${job._id} for mediaItemId=${item.mediaItemId}`)
    }

    // 미션 상태를 PROCESSING으로 변경
    const updated: DroneMission = {
      ...mission,
      status: DroneMissionStatus.PROCESSING,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }
    await this.couch.update(orgId, updated)

    return { jobsCreated }
  }

  // ── 프레임 조회 ──────────────────────────────────────────────────────────────

  async listFrames(
    orgId: string,
    missionId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ data: MediaFrame[]; meta: { total: number; page: number; limit: number; hasNext: boolean } }> {
    const page  = Math.max(1, query.page  ?? 1)
    const limit = Math.min(query.limit ?? 50, 200)

    const selector = { docType: 'mediaFrame', orgId, missionId }

    const { docs: allDocs } = await this.couch.find<MediaFrame>(orgId, selector, { limit: 0 })
    const total = allDocs.length

    const { docs } = await this.couch.find<MediaFrame>(orgId, selector, {
      limit,
      skip: (page - 1) * limit,
      sort: [{ frameIndex: 'asc' }],
    })

    return { data: docs, meta: { total, page, limit, hasNext: page * limit < total } }
  }
}
