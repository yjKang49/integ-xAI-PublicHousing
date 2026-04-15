// apps/api/src/modules/reports/report-generator.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { CouchService } from '../../database/couch.service';
import { MediaService } from '../media/media.service';
import {
  Defect, CrackGaugePoint, CrackMeasurement,
  DefectMedia, InspectionSession, Report,
} from '@ax/shared';

// ── Handlebars Helpers ─────────────────────────────────────────────
Handlebars.registerHelper('increment', (idx: number) => idx + 1);
Handlebars.registerHelper('yesNo',     (v: boolean) => v ? '완료' : '미완료');
Handlebars.registerHelper('shortDate', (iso: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
});
Handlebars.registerHelper('shouldPageBreak', (idx: number, perPage: number) =>
  idx > 0 && idx % perPage === 0,
);

const DEFECT_TYPE_LABELS: Record<string, string> = {
  CRACK: '균열', LEAK: '누수', SPALLING: '박리/박락',
  CORROSION: '부식', EFFLORESCENCE: '백태', DEFORMATION: '변형',
  SETTLEMENT: '침하', OTHER: '기타',
};
const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: '긴급', HIGH: '높음', MEDIUM: '보통', LOW: '낮음',
};

/**
 * Bull queue processor for asynchronous PDF report generation.
 * Uses Handlebars templates + Puppeteer for HTML-to-PDF rendering.
 * Templates: src/templates/report/*.hbs  (copied to dist/ via nest-cli.json assets)
 */
@Processor('reports')
export class ReportGeneratorProcessor {
  private readonly logger = new Logger(ReportGeneratorProcessor.name);

  /** Compiled Handlebars templates cache */
  private readonly templates = new Map<string, HandlebarsTemplateDelegate<any>>();

  constructor(
    private readonly couch: CouchService,
    private readonly media: MediaService,
  ) {}

  // ── Template loader ────────────────────────────────────────────
  private loadTemplate(name: string): HandlebarsTemplateDelegate<any> {
    if (this.templates.has(name)) return this.templates.get(name)!;

    // Try dist/ first (production), fall back to src/ (development)
    const candidates = [
      path.resolve(__dirname, '..', '..', 'templates', 'report', `${name}.hbs`),
      path.resolve(process.cwd(), 'src', 'templates', 'report', `${name}.hbs`),
    ];

    let source: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) { source = fs.readFileSync(p, 'utf-8'); break; }
    }
    if (!source) throw new Error(`Template not found: ${name}.hbs`);

    const compiled = Handlebars.compile(source);
    this.templates.set(name, compiled);
    return compiled;
  }

  // ── Main job handler ───────────────────────────────────────────
  @Process('generate')
  async handleGenerate(job: Job<{ orgId: string; reportId: string; dto: any; userId: string }>) {
    const { orgId, reportId, dto } = job.data;
    this.logger.log(`Generating report ${reportId} type=${dto.reportType}`);

    try {
      let pdfBuffer: Buffer;

      switch (dto.reportType) {
        case 'INSPECTION_RESULT':
          pdfBuffer = await this.generateInspectionResult(orgId, dto);
          break;
        case 'PHOTO_SHEET':
          pdfBuffer = await this.generatePhotoSheet(orgId, dto);
          break;
        case 'DEFECT_LIST':
          pdfBuffer = await this.generateDefectList(orgId, dto);
          break;
        case 'CRACK_TREND':
          pdfBuffer = await this.generateCrackTrend(orgId, dto);
          break;
        default:
          pdfBuffer = await this.generateSummary(orgId, dto);
      }

      // Upload to S3 via MediaService
      const storageKey = `${dto.complexId}/reports/${reportId.split(':').pop()}.pdf`;
      await this.media.uploadBuffer(pdfBuffer, storageKey, 'application/pdf');

      // Update report document
      const report = await this.couch.findById<Report>(orgId, reportId);
      if (report) {
        await this.couch.update(orgId, {
          ...report,
          fileKey:   storageKey,
          fileSize:  pdfBuffer.length,
          updatedAt: new Date().toISOString(),
        });
      }

      this.logger.log(`Report ${reportId} generated (${pdfBuffer.length} bytes) → s3:${storageKey}`);
    } catch (err: any) {
      this.logger.error(`Report generation failed for ${reportId}: ${err.message}`);
      throw err;
    }
  }

  // ── Report generators ──────────────────────────────────────────

  private async generateInspectionResult(orgId: string, dto: any): Promise<Buffer> {
    const { docs: sessions } = await this.couch.find<InspectionSession>(orgId, {
      docType: 'inspectionSession', orgId,
      ...(dto.projectId && { projectId: dto.projectId }),
    }, { limit: 500 });

    const { docs: defects } = await this.couch.find<Defect>(orgId, {
      docType: 'defect', orgId,
      ...(dto.projectId ? { projectId: dto.projectId } : { complexId: dto.complexId }),
    }, { limit: 5000, sort: [{ severity: 'desc' }] });

    // Crack data
    const { docs: gaugePoints } = await this.couch.find<CrackGaugePoint>(orgId, {
      docType: 'crackGaugePoint', orgId, complexId: dto.complexId, isActive: true,
    }, { limit: 100 });

    const crackRows = await Promise.all(gaugePoints.map(async (gp) => {
      const { docs: meas } = await this.couch.find<CrackMeasurement>(orgId, {
        docType: 'crackMeasurement', orgId, gaugePointId: gp._id,
      }, { limit: 1, sort: [{ measuredAt: 'desc' }] });
      const latest = meas[0];
      return {
        name: gp.name,
        location: gp.location,
        baselineWidthMm: gp.baselineWidthMm,
        thresholdMm: gp.thresholdMm,
        latestWidthMm: latest?.measuredWidthMm ?? '-',
        changeFromBaseline: latest?.changeFromBaselineMm != null
          ? `${latest.changeFromBaselineMm > 0 ? '+' : ''}${latest.changeFromBaselineMm}`
          : '-',
        exceedsThreshold: latest?.exceedsThreshold ?? false,
        lastMeasuredAt: latest?.measuredAt ?? null,
      };
    }));

    const now = new Date();
    const context = {
      title:          `점검 결과 보고서 — ${dto.complexId}`,
      complexName:    dto.complexId,
      projectName:    dto.projectId ?? '전체',
      reportId:       dto.reportId ?? '',
      generatedDate:  now.toLocaleDateString('ko-KR'),
      generatedBy:    dto.generatedBy ?? 'system',
      inspectionType: '정기점검',
      periodStart:    dto.dateFrom ?? now.toLocaleDateString('ko-KR'),
      periodEnd:      dto.dateTo   ?? now.toLocaleDateString('ko-KR'),
      sessionCount:   sessions.length,
      inspectors:     [...new Set(sessions.map((s) => s.inspectorId))].join(', '),
      totalCount:     defects.length,
      criticalCount:  defects.filter((d) => d.severity === 'CRITICAL').length,
      highCount:      defects.filter((d) => d.severity === 'HIGH').length,
      repairedCount:  defects.filter((d) => d.isRepaired).length,
      defects: defects.map((d) => ({
        ...d,
        defectTypeLabel: DEFECT_TYPE_LABELS[d.defectType] ?? d.defectType,
        severityLabel:   SEVERITY_LABELS[d.severity] ?? d.severity,
        buildingName:    d.buildingId,
        floorName:       d.floorId ?? '-',
        widthMm:         d.widthMm  ?? '-',
        lengthMm:        d.lengthMm ?? '-',
      })),
      noDefects: defects.length === 0,
      crackData: crackRows.length > 0 ? crackRows : null,
    };

    const html = this.loadTemplate('inspection-report')(context);
    return this.htmlToPdf(html, 'A4');
  }

  private async generatePhotoSheet(orgId: string, dto: any): Promise<Buffer> {
    const { docs: defects } = await this.couch.find<Defect>(orgId, {
      docType: 'defect', orgId,
      ...(dto.sessionId ? { sessionId: dto.sessionId } : { complexId: dto.complexId }),
    }, { limit: 200, sort: [{ severity: 'desc' }] });

    // Fetch media URLs for each defect (simplified: take first photo)
    const defectRows = await Promise.all(defects.map(async (d) => {
      let photoUrl: string | null = null;
      if (d.mediaIds?.length) {
        const media = await this.couch.findById<DefectMedia>(orgId, d.mediaIds[0]);
        if (media?.storageKey) {
          photoUrl = await this.media.getPresignedUrl(media.storageKey);
        }
      }
      return {
        ...d,
        photoUrl,
        defectTypeLabel: DEFECT_TYPE_LABELS[d.defectType] ?? d.defectType,
        severityLabel:   SEVERITY_LABELS[d.severity] ?? d.severity,
        buildingName:    d.buildingId,
        floorName:       d.floorId ?? '-',
        widthMm:         d.widthMm  ?? null,
        lengthMm:        d.lengthMm ?? null,
      };
    }));

    const photosPerPage = dto.parameters?.photosPerPage ?? 4;
    const columns = photosPerPage === 2 ? 2 : photosPerPage === 6 ? 3 : 2;
    const photoHeight = columns === 3 ? 180 : 220;
    const now = new Date();

    const context = {
      title:         dto.title ?? '사진 대지',
      complexName:   dto.complexId,
      projectName:   dto.projectId ?? '전체',
      generatedDate: now.toLocaleDateString('ko-KR'),
      generatedBy:   dto.generatedBy ?? 'system',
      totalPhotos:   defects.length,
      photosPerPage,
      columns,
      photoHeight,
      defects: defectRows,
      noDefects: defects.length === 0,
    };

    const html = this.loadTemplate('photo-sheet')(context);
    return this.htmlToPdf(html, 'A4');
  }

  private async generateDefectList(orgId: string, dto: any): Promise<Buffer> {
    const { docs: defects } = await this.couch.find<Defect>(orgId, {
      docType: 'defect', orgId,
      complexId: dto.complexId,
      ...(dto.sessionId && { sessionId: dto.sessionId }),
    }, { limit: 5000, sort: [{ severity: 'desc' }] });

    const severitySummary = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => ({
      label: SEVERITY_LABELS[s],
      count: defects.filter((d) => d.severity === s).length,
    }));

    const html = `
      <!DOCTYPE html>
      <html lang="ko"><head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; margin: 20mm 15mm; font-size: 10pt; }
        h1 { color: #1a237e; font-size: 16pt; border-bottom: 2px solid #1a237e; padding-bottom: 8px; margin-bottom: 16px; }
        .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        .s-card { border:1px solid #ddd; border-radius:6px; padding:10px; text-align:center; }
        .s-val { font-size:20pt; font-weight:700; color:#1a237e; }
        .s-lbl { font-size:9pt; color:#666; }
        table { width:100%; border-collapse:collapse; font-size:9pt; }
        th { background:#1a237e; color:white; padding:7px 8px; }
        td { padding:6px 8px; border:1px solid #ddd; }
        tr:nth-child(even) td { background:#fafafa; }
        .badge { padding:2px 8px; border-radius:10px; font-size:8pt; font-weight:600; }
        .badge-CRITICAL { background:#ffebee; color:#c62828; }
        .badge-HIGH     { background:#fff3e0; color:#e65100; }
        .badge-MEDIUM   { background:#e3f2fd; color:#1565c0; }
        .badge-LOW      { background:#e8f5e9; color:#2e7d32; }
      </style>
      </head><body>
      <h1>결함 목록 보고서</h1>
      <p style="margin-bottom:12px">단지: ${dto.complexId} | 생성일: ${new Date().toLocaleDateString('ko-KR')} | 총 ${defects.length}건</p>
      <div class="summary">
        ${severitySummary.map((s) => `
          <div class="s-card"><div class="s-val">${s.count}</div><div class="s-lbl">${s.label}</div></div>
        `).join('')}
      </div>
      <table>
        <thead>
          <tr><th>No.</th><th>건물</th><th>층</th><th>유형</th><th>심각도</th><th>위치</th><th>폭(mm)</th><th>길이(mm)</th><th>보수</th></tr>
        </thead>
        <tbody>
          ${defects.map((d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${d.buildingId}</td>
              <td>${d.floorId ?? '-'}</td>
              <td>${DEFECT_TYPE_LABELS[d.defectType] ?? d.defectType}</td>
              <td><span class="badge badge-${d.severity}">${SEVERITY_LABELS[d.severity] ?? d.severity}</span></td>
              <td>${d.locationDescription}</td>
              <td>${d.widthMm ?? '-'}</td>
              <td>${d.lengthMm ?? '-'}</td>
              <td>${d.isRepaired ? '완료' : '미완료'}</td>
            </tr>
          `).join('')}
          ${defects.length === 0 ? '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">결함 없음</td></tr>' : ''}
        </tbody>
      </table>
      </body></html>
    `;
    return this.htmlToPdf(html, 'A4');
  }

  private async generateCrackTrend(orgId: string, dto: any): Promise<Buffer> {
    const { docs: gaugePoints } = await this.couch.find<CrackGaugePoint>(orgId, {
      docType: 'crackGaugePoint', orgId, complexId: dto.complexId, isActive: true,
    }, { limit: 50 });

    const rows = await Promise.all(gaugePoints.map(async (gp) => {
      const { docs: meas } = await this.couch.find<CrackMeasurement>(orgId, {
        docType: 'crackMeasurement', orgId, gaugePointId: gp._id,
      }, { limit: 12, sort: [{ measuredAt: 'desc' }] });
      const latest = meas[0];
      return {
        name: gp.name, location: gp.location,
        baseline: gp.baselineWidthMm, threshold: gp.thresholdMm,
        latest: latest?.measuredWidthMm ?? '-',
        delta: latest?.changeFromBaselineMm ?? '-',
        exceeds: latest?.exceedsThreshold ? '⚠ 초과' : '정상',
        count: meas.length,
      };
    }));

    const html = `
      <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; margin: 20mm 15mm; font-size: 10pt; }
        h1 { color:#1a237e; font-size:15pt; border-bottom:2px solid #1a237e; padding-bottom:8px; margin-bottom:16px; }
        table { width:100%; border-collapse:collapse; font-size:9pt; }
        th { background:#1a237e; color:white; padding:7px; }
        td { padding:6px 8px; border:1px solid #ddd; }
        tr:nth-child(even) td { background:#fafafa; }
        .exceed { color:#c62828; font-weight:700; }
      </style></head><body>
      <h1>균열 모니터링 추이 보고서</h1>
      <p style="margin-bottom:12px">단지: ${dto.complexId} | 생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
      <table>
        <thead>
          <tr><th>게이지 포인트</th><th>위치</th><th>기준(mm)</th><th>임계치(mm)</th>
              <th>최근 측정(mm)</th><th>변화량(mm)</th><th>상태</th><th>측정 횟수</th></tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td>${r.name}</td><td>${r.location}</td>
              <td>${r.baseline}</td><td>${r.threshold}</td>
              <td>${r.latest}</td><td>${r.delta}</td>
              <td class="${r.exceeds !== '정상' ? 'exceed' : ''}">${r.exceeds}</td>
              <td>${r.count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </body></html>
    `;
    return this.htmlToPdf(html, 'A4');
  }

  private async generateSummary(_orgId: string, dto: any): Promise<Buffer> {
    const html = `
      <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; margin:40px; font-size:12pt; }
        h1 { color:#1a237e; border-bottom:2px solid #1a237e; padding-bottom:8px; }
      </style></head><body>
      <h1>시설물 운영 요약 보고서</h1>
      <p>단지: ${dto.complexId}</p>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
      </body></html>
    `;
    return this.htmlToPdf(html, 'A4');
  }

  // ── PDF generation via Puppeteer ──────────────────────────────
  private async htmlToPdf(html: string, format: 'A4' | 'A3' = 'A4'): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format,
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
        displayHeaderFooter: false,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
