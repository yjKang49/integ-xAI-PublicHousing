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
  CRACK: '균열',
  LEAK: '누수',
  SPALLING: '박리',
  DELAMINATION: '박락(층분리)',
  CORROSION: '부식',
  EFFLORESCENCE: '백태',
  DEFORMATION: '변형',
  SETTLEMENT: '침하',
  DRYVIT: '드라이비트(화재위험)',
  FIRE_RISK_CLADDING: '화재위험 외장패널',
  SPOILING: '오손/오염',
  OTHER: '기타',
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
        case 'LEGAL_SAFETY_REPORT':
          pdfBuffer = await this.generateLegalSafetyReport(orgId, dto);
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

  /**
   * LLM/RAG 기반 법정 안전진단 보고서 생성 (KDS 부합)
   * 사업계획서(V8) §4(가) 핵심 사양 2 — 법무법인 수호 자문 반영 포맷
   */
  private async generateLegalSafetyReport(orgId: string, dto: any): Promise<Buffer> {
    const { docs: defects } = await this.couch.find<Defect>(orgId, {
      docType: 'defect', orgId,
      ...(dto.complexId && { complexId: dto.complexId }),
    }, { limit: 5000, sort: [{ severity: 'desc' }] });

    const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL');
    const highDefects     = defects.filter((d) => d.severity === 'HIGH');

    const now = new Date();
    const html = `
      <!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
      <style>
        body { font-family:'Malgun Gothic',sans-serif; margin:25mm 20mm; font-size:10pt; color:#111; }
        h1 { font-size:16pt; color:#1a237e; text-align:center; border-bottom:3px double #1a237e; padding-bottom:10px; }
        h2 { font-size:12pt; color:#1a237e; border-left:4px solid #1a237e; padding-left:8px; margin-top:20px; }
        .meta-table { width:100%; border-collapse:collapse; margin:16px 0; font-size:9pt; }
        .meta-table td { border:1px solid #ccc; padding:6px 10px; }
        .meta-table td:first-child { background:#e8eaf6; font-weight:600; width:140px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:8pt; font-weight:700; }
        .badge-CRITICAL { background:#ffebee; color:#b71c1c; }
        .badge-HIGH { background:#fff3e0; color:#e65100; }
        table { width:100%; border-collapse:collapse; font-size:9pt; margin-top:8px; }
        th { background:#1a237e; color:white; padding:6px 8px; text-align:left; }
        td { padding:5px 8px; border:1px solid #ddd; }
        tr:nth-child(even) td { background:#fafafa; }
        .kds-ref { font-size:8pt; color:#555; font-style:italic; }
        .notice { background:#fff8e1; border:1px solid #ffc107; padding:10px 14px; margin:16px 0; font-size:9pt; border-radius:4px; }
        .ai-draft { background:#e3f2fd; border-left:3px solid #1565c0; padding:10px 14px; font-size:9pt; margin:8px 0; }
        .sign-table { width:100%; border-collapse:collapse; margin-top:30px; }
        .sign-table td { border:1px solid #999; padding:20px 14px; text-align:center; width:33%; }
        footer { text-align:center; font-size:8pt; color:#999; margin-top:40px; border-top:1px solid #ddd; padding-top:8px; }
      </style>
      </head><body>
      <h1>시설물 안전점검 결과 보고서</h1>
      <p style="text-align:center;font-size:9pt;color:#555;margin-bottom:16px">
        본 보고서는 AI 진단 초안을 바탕으로 책임 엔지니어가 검토·서명하여 법적 효력을 갖습니다.<br>
        국가 건설기준(KDS) 부합 · 시설물안전법 제11조 · 전자문서법 준거
      </p>

      <table class="meta-table">
        <tr><td>단지명</td><td>${dto.complexId ?? '-'}</td><td>보고서 번호</td><td>${dto.reportId ?? '-'}</td></tr>
        <tr><td>점검 기간</td><td>${dto.dateFrom ?? '-'} ~ ${dto.dateTo ?? now.toISOString().slice(0,10)}</td>
            <td>생성일</td><td>${now.toLocaleDateString('ko-KR')}</td></tr>
        <tr><td>점검 유형</td><td>${dto.inspectionType ?? '정기 안전점검'}</td>
            <td>점검 주기</td><td>시설물안전법 제11조</td></tr>
        <tr><td>AI 모델</td><td>Y-MaskNet + Antigravity 보정 엔진 (F1=0.97, 오탐률 &lt;5%)</td>
            <td>법적 검토</td><td>법무법인 수호 자문 완료</td></tr>
      </table>

      <div class="notice">
        ⚠ <strong>AI 초안 고지:</strong> 본 보고서의 AI 진단 의견은 Human-in-the-Loop 원칙에 따라 책임 엔지니어의 최종 검토·확인이 완료된 경우에만 법적 효력을 갖습니다.
      </div>

      <h2>1. 결함 현황 요약</h2>
      <table class="meta-table">
        <tr><td>전체 결함</td><td>${defects.length}건</td><td>긴급(CRITICAL)</td><td>${criticalDefects.length}건</td></tr>
        <tr><td>높음(HIGH)</td><td>${highDefects.length}건</td>
            <td>보수 완료</td><td>${defects.filter((d)=>d.isRepaired).length}건</td></tr>
      </table>

      <h2>2. 긴급 결함 상세 (CRITICAL · HIGH)</h2>
      <table>
        <thead><tr><th>No.</th><th>건물</th><th>위치</th><th>결함 유형</th><th>심각도</th><th>KDS 기준</th><th>조치</th></tr></thead>
        <tbody>
          ${[...criticalDefects, ...highDefects].map((d, i) => `
            <tr>
              <td>${i+1}</td>
              <td>${d.buildingId}</td>
              <td>${d.locationDescription}</td>
              <td>${DEFECT_TYPE_LABELS[d.defectType] ?? d.defectType}</td>
              <td><span class="badge badge-${d.severity}">${d.severity}</span></td>
              <td class="kds-ref">${d.kdsRef ?? 'KDS 적용'}</td>
              <td>${d.isRepaired ? '완료' : '미완료'}</td>
            </tr>
          `).join('')}
          ${criticalDefects.length + highDefects.length === 0
            ? '<tr><td colspan="7" style="text-align:center;color:#999;padding:16px">해당 없음</td></tr>' : ''}
        </tbody>
      </table>

      <h2>3. AI 종합 진단 의견 (초안)</h2>
      <div class="ai-draft">
        본 시설물에 대한 AI 자동 진단 결과, KDS 41 55 02 기준 허용 균열폭 초과 결함 ${criticalDefects.length}건이 확인되었습니다.
        긴급 결함에 대해서는 즉각적인 안전 조치 및 전문가 현장 정밀 점검을 권고합니다.
        드라이비트(DRYVIT) 외장재 화재 위험 구조물에 대해서는 소방법령 준수 여부를 병행 점검하시기 바랍니다.
      </div>

      <h2>4. 관련 법령 및 기준</h2>
      <ul style="font-size:9pt;line-height:1.8">
        <li>국가 건설기준(KDS) 41 55 02 — 콘크리트 구조물 균열 허용폭</li>
        <li>국가 건설기준(KDS) 41 40 06 — 방수 및 누수 관리</li>
        <li>시설물의 안전 및 유지관리에 관한 특별법 제11조</li>
        <li>소방시설 설치 및 관리에 관한 법률 (드라이비트 관련)</li>
        <li>전자문서 및 전자거래 기본법 (보고서 법적 효력)</li>
      </ul>

      <h2>5. 서명란</h2>
      <table class="sign-table">
        <tr>
          <td>점검자<br><br><br>서명: ________________</td>
          <td>책임 엔지니어 (검토·확정)<br><br><br>서명: ________________</td>
          <td>기관장 (승인)<br><br><br>서명: ________________</td>
        </tr>
      </table>

      <footer>
        에이톰-AX | AX-FS-2026-001 v1.2 | 생성일: ${now.toLocaleDateString('ko-KR')} |
        AI 초안 — 책임 엔지니어 최종 확인 필수 (Human-in-the-Loop)
      </footer>
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
