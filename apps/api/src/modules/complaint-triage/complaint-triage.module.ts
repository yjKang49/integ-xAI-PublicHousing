// apps/api/src/modules/complaint-triage/complaint-triage.module.ts
import { Module } from '@nestjs/common'
import { CouchService } from '../../database/couch.service'
import { ComplaintTriageService } from './complaint-triage.service'
import { ComplaintTriageController } from './complaint-triage.controller'
import { JobsModule } from '../jobs/jobs.module'
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module'

@Module({
  imports: [JobsModule, FeatureFlagsModule],
  controllers: [ComplaintTriageController],
  providers: [ComplaintTriageService, CouchService],
  exports: [ComplaintTriageService],
})
export class ComplaintTriageModule {}
