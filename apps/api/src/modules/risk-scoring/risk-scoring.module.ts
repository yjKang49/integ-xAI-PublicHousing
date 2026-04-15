// apps/api/src/modules/risk-scoring/risk-scoring.module.ts
// Phase 2-9: 위험도 스코어 모듈

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CouchService } from '../../database/couch.service';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoringController } from './risk-scoring.controller';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'job-queue' }),
  ],
  controllers: [RiskScoringController],
  providers: [RiskScoringService, CouchService],
  exports: [RiskScoringService],
})
export class RiskScoringModule {}
