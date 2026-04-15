// apps/api/src/modules/ai-detections/ai-detections.module.ts
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { AiDetectionsService } from './ai-detections.service'
import { AiDetectionsController } from './ai-detections.controller'
import { JobsModule } from '../jobs/jobs.module'
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module'
import { DefectCandidatesModule } from '../defect-candidates/defect-candidates.module'
import { DroneMissionsModule } from '../drone-missions/drone-missions.module'
import { QUEUE_AI, QUEUE_JOB } from '../../common/queue/queue.constants'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AI }),
    BullModule.registerQueue({ name: QUEUE_JOB }),
    JobsModule,
    FeatureFlagsModule,
    DefectCandidatesModule,
    DroneMissionsModule,
  ],
  controllers: [AiDetectionsController],
  providers:   [AiDetectionsService],
  exports:     [AiDetectionsService],
})
export class AiDetectionsModule {}
