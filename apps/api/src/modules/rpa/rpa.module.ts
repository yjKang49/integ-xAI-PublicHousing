// apps/api/src/modules/rpa/rpa.module.ts
// AX-SPRINT — 지능형 행정자동화 (RPA) 모듈
//
// 자동화 대상 업무:
//   BILL_GENERATION        관리비 고지서 자동 생성    80% 자동화
//   CONTRACT_EXPIRY_NOTICE 계약 만료 알림 자동 발송   100% 자동화
//   COMPLAINT_INTAKE       민원 접수·AI 분류          70% 자동화
//   INSPECTION_SCHEDULE    정기 점검 일정 자동 생성   90% 자동화
//   REPORT_SUBMISSION      안전관리계획 법정 보고      85% 자동화
//   MILEAGE_GRANT          클린하우스 마일리지 지급    100% 자동화

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RpaService } from './rpa.service';
import { RpaController } from './rpa.controller';
import { RpaProcessor } from './rpa.processor';
import { RPA_QUEUE } from './rpa.constants';
import { CouchService } from '../../database/couch.service';

export { RPA_QUEUE } from './rpa.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: RPA_QUEUE }),
  ],
  controllers: [RpaController],
  providers: [RpaService, RpaProcessor, CouchService],
  exports: [RpaService],
})
export class RpaModule {}
