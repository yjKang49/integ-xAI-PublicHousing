// apps/api/src/modules/maintenance-recommendations/maintenance-recommendations.module.ts
// Phase 2-9: 장기수선 권장 모듈

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CouchService } from '../../database/couch.service';
import { MaintenanceRecommendationsService } from './maintenance-recommendations.service';
import { MaintenanceRecommendationsController } from './maintenance-recommendations.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MaintenanceRecommendationsController],
  providers: [MaintenanceRecommendationsService, CouchService],
  exports: [MaintenanceRecommendationsService],
})
export class MaintenanceRecommendationsModule {}
