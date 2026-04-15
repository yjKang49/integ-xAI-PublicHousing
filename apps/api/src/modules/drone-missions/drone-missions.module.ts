// apps/api/src/modules/drone-missions/drone-missions.module.ts
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { DroneMissionsService } from './drone-missions.service'
import { DroneMissionsController } from './drone-missions.controller'
import { CouchService } from '../../database/couch.service'
import { JobsModule } from '../jobs/jobs.module'
import { QUEUE_AI, QUEUE_JOB } from '../../common/queue/queue.constants'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AI }),
    BullModule.registerQueue({ name: QUEUE_JOB }),
    JobsModule,
  ],
  controllers: [DroneMissionsController],
  providers: [DroneMissionsService, CouchService],
  exports: [DroneMissionsService],
})
export class DroneMissionsModule {}
