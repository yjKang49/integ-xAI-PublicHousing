// apps/api/src/modules/reports/reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuid } from 'uuid';
import { CouchService } from '../../database/couch.service';
import { Report, ReportType } from '@ax/shared';
import { GenerateReportRequest } from '@ax/shared';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class ReportsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly couch: CouchService,
    private readonly config: ConfigService,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
  ) {
    this.bucket = config.get('S3_BUCKET', 'ax-media');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'ap-northeast-2'),
      endpoint: config.get('S3_ENDPOINT'),
      forcePathStyle: !!config.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      },
    });
  }

  /**
   * Enqueue a report generation job.
   * Returns immediately — report is generated asynchronously.
   */
  async generateReport(
    orgId: string,
    dto: GenerateReportRequest,
    userId: string,
  ): Promise<{ reportId: string; status: 'QUEUED' }> {
    const reportId = `report:${orgId}:rpt_${Date.now()}_${uuid().slice(0, 8)}`;
    const now = new Date().toISOString();

    const title = (dto as any).title
      ?? `${dto.reportType} — ${now.split('T')[0]}`;

    // Create placeholder doc with empty fileKey
    const report: Report = {
      _id: reportId,
      docType: 'report',
      orgId,
      complexId: dto.complexId,
      projectId: dto.projectId,
      sessionId: dto.sessionId,
      reportType: dto.reportType as ReportType,
      title,
      generatedBy: userId,
      generatedAt: now,
      fileKey: '',
      fileSize: 0,
      parameters: dto.parameters ?? {},
      isPublic: dto.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    await this.couch.create(orgId, report);

    // Enqueue Bull job — worker will generate PDF and update the report doc
    await this.reportsQueue.add('generate', { orgId, reportId, dto, userId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    return { reportId, status: 'QUEUED' };
  }

  async findAll(orgId: string, query: any) {
    const selector: Record<string, any> = { docType: 'report', orgId };
    if (query.complexId) selector.complexId = query.complexId;
    if (query.reportType) selector.reportType = query.reportType;
    if (query.projectId)  selector.projectId  = query.projectId;
    if (query.publicOnly) selector.isPublic = true;

    const page  = query.page  ? +query.page  : 1;
    const limit = Math.min(query.limit ? +query.limit : 20, 100);

    const { docs } = await this.couch.find<Report>(orgId, selector, {
      limit: limit + 1,
      skip: (page - 1) * limit,
      sort: [{ generatedAt: 'desc' }],
    });

    const hasNext = docs.length > limit;
    return { data: hasNext ? docs.slice(0, limit) : docs, meta: { page, limit, hasNext } };
  }

  async findById(orgId: string, id: string): Promise<Report> {
    const doc = await this.couch.findById<Report>(orgId, id);
    if (!doc || doc._deleted) throw new NotFoundException(`보고서 ${id}를 찾을 수 없습니다.`);
    return doc;
  }

  /** Generate a 15-minute presigned download URL for the report PDF. */
  async getDownloadUrl(orgId: string, id: string): Promise<{
    url: string; expiresAt: string; fileName: string;
  }> {
    const report = await this.findById(orgId, id);
    if (!report.fileKey) {
      throw new NotFoundException('보고서 파일이 아직 생성 중입니다. 잠시 후 다시 시도하세요.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: report.fileKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(report.title)}.pdf"`,
    });

    const url      = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    const expiresAt = new Date(Date.now() + 900_000).toISOString();
    const fileName  = `${report.title}.pdf`;

    return { url, expiresAt, fileName };
  }

  async remove(orgId: string, id: string): Promise<void> {
    await this.findById(orgId, id);
    await this.couch.softDelete(orgId, id);
  }
}
