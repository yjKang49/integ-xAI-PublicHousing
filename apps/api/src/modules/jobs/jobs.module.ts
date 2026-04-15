// apps/api/src/modules/jobs/jobs.module.ts
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { JobsService } from './jobs.service'
import { JobsController } from './jobs.controller'
import { CouchService } from '../../database/couch.service'
import { QUEUE_AI, QUEUE_JOB } from '../../common/queue/queue.constants'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AI }),
    BullModule.registerQueue({ name: QUEUE_JOB }),
  ],
  controllers: [JobsController],
  providers: [JobsService, CouchService],
  exports: [JobsService],
})
export class JobsModule {}
