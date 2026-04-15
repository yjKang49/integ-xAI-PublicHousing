// apps/api/src/modules/diagnosis-opinions/diagnosis-opinions.module.ts
import { Module } from '@nestjs/common'
import { CouchService } from '../../database/couch.service'
import { DiagnosisOpinionsService } from './diagnosis-opinions.service'
import { DiagnosisOpinionsController } from './diagnosis-opinions.controller'
import { JobsModule } from '../jobs/jobs.module'
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module'
import { RepairRecommendationsModule } from '../repair-recommendations/repair-recommendations.module'

@Module({
  imports: [JobsModule, FeatureFlagsModule, RepairRecommendationsModule],
  controllers: [DiagnosisOpinionsController],
  providers: [DiagnosisOpinionsService, CouchService],
  exports: [DiagnosisOpinionsService],
})
export class DiagnosisOpinionsModule {}
