// apps/api/src/modules/jobs/jobs.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { v4 as uuid } from 'uuid'
import { CouchService } from '../../database/couch.service'
import { JobType, JobStatus, QUEUE_FOR_JOB_TYPE } from '@ax/shared'
import { QUEUE_AI, QUEUE_JOB } from '../../common/queue/queue.constants'
import { CreateJobDto, UpdateJobStatusDto } from './dto/create-job.dto'

const PRIORITY_MAP: Record<string, number> = {
  LOW: 20,
  NORMAL: 10,
  HIGH: 1,  // Bull: 낮을수록 높은 우선순위
}

/** CouchDB 작업 문서 타입 */
export interface JobDoc {
  _id: string
  _rev?: string
  docType: 'job'
  orgId: string
  type: JobType
  status: JobStatus
  payload: Record<string, any>
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  complexId?: string
  queueName: 'ai-queue' | 'job-queue'
  bullJobId?: string
  progress: number
  result?: any
  error?: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
  retryCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface JobQueryOptions {
  type?: JobType
  status?: JobStatus
  complexId?: string
  page?: number
  limit?: number
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    private readonly couch: CouchService,
    @InjectQueue(QUEUE_AI) private readonly aiQueue: Queue,
    @InjectQueue(QUEUE_JOB) private readonly jobQueue: Queue,
  ) {}

  /**
   * 작업 생성: CouchDB 저장 → Bull 큐 등록 → bullJobId 반영
   */
  async create(orgId: string, dto: CreateJobDto, userId: string): Promise<JobDoc> {
    const now = new Date().toISOString()
    const shortId = uuid().replace(/-/g, '').slice(0, 8)
    const docId = `job:${orgId}:${shortId}`
    const queueName = QUEUE_FOR_JOB_TYPE[dto.type]

    const doc: JobDoc = {
      _id: docId,
      docType: 'job',
      orgId,
      type: dto.type,
      status: JobStatus.PENDING,
      payload: dto.payload ?? {},
      priority: dto.priority ?? 'NORMAL',
      ...(dto.complexId ? { complexId: dto.complexId } : {}),
      queueName,
      progress: 0,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    }

    // 1. CouchDB에 저장
    const saved = await this.couch.create(orgId, doc)

    // 2. 적절한 Bull 큐에 등록
    const queue = queueName === 'ai-queue' ? this.aiQueue : this.jobQueue
    const bullJob = await queue.add(
      dto.type,
      { jobDocId: saved._id, orgId, ...dto.payload },
      {
        priority: PRIORITY_MAP[dto.priority ?? 'NORMAL'],
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    )

    this.logger.log(
      `Job created: type=${dto.type} id=${saved._id} queue=${queueName} bullJobId=${bullJob.id}`,
    )

    // 3. bullJobId 및 상태를 QUEUED로 업데이트
    const updated = await this.couch.update(orgId, {
      ...saved,
      bullJobId: String(bullJob.id),
      status: JobStatus.QUEUED,
      updatedAt: new Date().toISOString(),
    })

    return updated as JobDoc
  }

  /**
   * 작업 목록 조회 (페이지네이션 + 필터)
   */
  async findAll(
    orgId: string,
    query: JobQueryOptions,
  ): Promise<{ data: JobDoc[]; meta: { page: number; limit: number; total: number; hasNext: boolean } }> {
    const selector: Record<string, any> = { docType: 'job', orgId }
    if (query.type)      selector.type      = query.type
    if (query.status)    selector.status    = query.status
    if (query.complexId) selector.complexId = query.complexId

    const page  = Math.max(1, query.page  ?? 1)
    const limit = Math.min(query.limit ?? 20, 100)

    // total 카운트용 쿼리 (limit 0 → 전체 fetch)
    const { docs: allDocs } = await this.couch.find<JobDoc>(orgId, selector, { limit: 0 })
    const total = allDocs.length

    const { docs } = await this.couch.find<JobDoc>(orgId, selector, {
      limit,
      skip: (page - 1) * limit,
      sort: [{ createdAt: 'desc' }],
    })

    return {
      data: docs,
      meta: {
        page,
        limit,
        total,
        hasNext: page * limit < total,
      },
    }
  }

  /**
   * 단일 작업 조회
   */
  async findById(orgId: string, id: string): Promise<JobDoc> {
    const doc = await this.couch.findById<JobDoc>(orgId, id)
    if (!doc || (doc as any)._deleted) {
      throw new NotFoundException(`작업 ${id}를 찾을 수 없습니다.`)
    }
    return doc
  }

  /**
   * 작업 취소 (PENDING 또는 QUEUED 상태만 가능)
   */
  async cancel(orgId: string, id: string, userId: string): Promise<JobDoc> {
    const doc = await this.findById(orgId, id)

    if (doc.status === JobStatus.RUNNING) {
      throw new BadRequestException('실행 중인 작업은 취소할 수 없습니다.')
    }
    if (doc.status === JobStatus.COMPLETED || doc.status === JobStatus.FAILED || doc.status === JobStatus.CANCELLED) {
      throw new BadRequestException(`이미 종료된 작업입니다. (status: ${doc.status})`)
    }

    // Bull 큐에서도 제거 시도
    if (doc.bullJobId) {
      try {
        const queue = doc.queueName === 'ai-queue' ? this.aiQueue : this.jobQueue
        const bullJob = await queue.getJob(doc.bullJobId)
        if (bullJob) await bullJob.remove()
      } catch (err: any) {
        this.logger.warn(`Bull 작업 제거 실패 (bullJobId=${doc.bullJobId}): ${err.message}`)
      }
    }

    const now = new Date().toISOString()
    const updated = await this.couch.update(orgId, {
      ...doc,
      status: JobStatus.CANCELLED,
      updatedAt: now,
    })

    this.logger.log(`Job cancelled: id=${id} by=${userId}`)
    return updated as JobDoc
  }

  /**
   * 작업 상태 업데이트 — 워커 내부용 (인증 불필요)
   */
  async updateStatus(
    orgId: string,
    id: string,
    patch: UpdateJobStatusDto,
  ): Promise<JobDoc> {
    const doc = await this.findById(orgId, id)
    const now = new Date().toISOString()

    const statusStr = patch.status as string
    let extra: Partial<JobDoc> = {}

    if (statusStr === JobStatus.RUNNING && !doc.startedAt) {
      extra.startedAt = now
    }
    if (statusStr === JobStatus.COMPLETED) {
      extra.completedAt = now
    }
    if (statusStr === JobStatus.FAILED) {
      extra.failedAt = now
      extra.retryCount = (doc.retryCount ?? 0) + 1
    }

    const updated = await this.couch.update(orgId, {
      ...doc,
      status: patch.status as JobStatus,
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.result  !== undefined ? { result:   patch.result }   : {}),
      ...(patch.error   !== undefined ? { error:    patch.error }    : {}),
      ...extra,
      updatedAt: now,
    })

    this.logger.log(`Job status updated: id=${id} status=${patch.status}`)
    return updated as JobDoc
  }
}
