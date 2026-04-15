// apps/api/src/modules/repair-recommendations/repair-recommendations.module.ts
import { Module } from '@nestjs/common'
import { CouchService } from '../../database/couch.service'
import { RepairRecommendationsService } from './repair-recommendations.service'
import { RepairRecommendationsController } from './repair-recommendations.controller'

@Module({
  controllers: [RepairRecommendationsController],
  providers: [RepairRecommendationsService, CouchService],
  exports: [RepairRecommendationsService],
})
export class RepairRecommendationsModule {}
