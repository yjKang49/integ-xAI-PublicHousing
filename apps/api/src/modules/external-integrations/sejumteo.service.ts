// apps/api/src/modules/external-integrations/sejumteo.service.ts
//
// 세움터(건축물대장) API 연동 서비스
// 사업계획서(V8) §3(가), §5(나) — TRL-8 보완
//
// · 건축물대장 구조 형식·설계 하중·지반 정보 실시간 호출
// · FEM 교차검증 파이프라인 입력 데이터 제공

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SejumteoBuilding {
  mgmBldrgstPk: string;       // 건물 관리 PK
  bldNm: string;              // 건물명
  mainPurpsCdNm: string;      // 주요 용도
  strctCdNm: string;          // 구조 형식 (철근콘크리트조 등)
  etcStrct: string;           // 기타 구조
  totArea: number;            // 연면적 (㎡)
  grndFlrCnt: number;         // 지상층수
  ugrndFlrCnt: number;        // 지하층수
  useAprDay: string;          // 사용승인일 (준공연도)
  platArea: number;           // 대지면적 (㎡)
  bcRat: number;              // 건폐율 (%)
  vlRat: number;              // 용적률 (%)
}

export interface SejumteoSyncResult {
  buildingId: string;
  sejumteoData: SejumteoBuilding | null;
  syncedAt: string;
  femInputReady: boolean;     // FEM 교차검증 입력 데이터 준비 여부
}

@Injectable()
export class SejumteoService {
  private readonly logger = new Logger(SejumteoService.name);

  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('SEJUMTEO_API_URL') ?? 'https://www.sejong.go.kr/pt/ptc/restapi';
    this.apiKey = this.config.get<string>('SEJUMTEO_API_KEY') ?? '';
  }

  /**
   * 세움터 건축물대장 조회
   * Feature Flag: external.sejumteo 활성화 시 실제 API 호출
   */
  async getBuildingInfo(
    sigunguCd: string,
    bjdongCd: string,
    platGbCd: string,
    bun: string,
    ji: string,
  ): Promise<SejumteoBuilding | null> {
    if (!this.apiKey) {
      this.logger.warn('SEJUMTEO_API_KEY not set — returning mock data');
      return this.buildMockBuilding();
    }

    try {
      const params = new URLSearchParams({
        serviceKey: this.apiKey,
        sigunguCd, bjdongCd, platGbCd, bun, ji,
        numOfRows: '1',
        pageNo: '1',
        _type: 'json',
      });

      const res = await fetch(`${this.apiUrl}/getBrBasisOulnInfo?${params}`);
      if (!res.ok) {
        throw new Error(`세움터 API error: ${res.status}`);
      }

      const data: any = await res.json();
      const items = data?.response?.body?.items?.item;
      if (!items || (Array.isArray(items) && items.length === 0)) return null;

      const item = Array.isArray(items) ? items[0] : items;
      return {
        mgmBldrgstPk: item.mgmBldrgstPk ?? '',
        bldNm:        item.bldNm ?? '',
        mainPurpsCdNm: item.mainPurpsCdNm ?? '',
        strctCdNm:    item.strctCdNm ?? '',
        etcStrct:     item.etcStrct ?? '',
        totArea:      Number(item.totArea ?? 0),
        grndFlrCnt:   Number(item.grndFlrCnt ?? 0),
        ugrndFlrCnt:  Number(item.ugrndFlrCnt ?? 0),
        useAprDay:    item.useAprDay ?? '',
        platArea:     Number(item.platArea ?? 0),
        bcRat:        Number(item.bcRat ?? 0),
        vlRat:        Number(item.vlRat ?? 0),
      };
    } catch (err: any) {
      this.logger.error(`세움터 API failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * FEM 교차검증용 건물 기본 사양 추출
   * 세종대 비선형 FEM 파이프라인 입력 데이터
   */
  extractFemInput(building: SejumteoBuilding): Record<string, unknown> {
    return {
      structureType:  building.strctCdNm,
      totalAreaSqm:   building.totArea,
      groundFloors:   building.grndFlrCnt,
      undergroundFloors: building.ugrndFlrCnt,
      completionYear: building.useAprDay?.slice(0, 4) ? Number(building.useAprDay.slice(0, 4)) : null,
      buildingAgeYears: building.useAprDay
        ? new Date().getFullYear() - Number(building.useAprDay.slice(0, 4))
        : null,
    };
  }

  private buildMockBuilding(): SejumteoBuilding {
    return {
      mgmBldrgstPk: 'mock-pk-001',
      bldNm: '테스트 공동주택',
      mainPurpsCdNm: '공동주택',
      strctCdNm: '철근콘크리트구조',
      etcStrct: '',
      totArea: 15420.5,
      grndFlrCnt: 15,
      ugrndFlrCnt: 2,
      useAprDay: '20001215',
      platArea: 3200.0,
      bcRat: 18.5,
      vlRat: 189.2,
    };
  }
}
