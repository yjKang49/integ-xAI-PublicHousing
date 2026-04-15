// apps/api/src/modules/crack-analysis/crack-analysis.module.ts
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { CouchService } from '../../database/couch.service'
import { CrackAnalysisService } from './crack-analysis.service'
import { CrackAnalysisController } from './crack-analysis.controller'

@Module({
  imports: [BullModule.registerQueue({ name: 'ai-queue' })],
  controllers: [CrackAnalysisController],
  providers: [CrackAnalysisService, CouchService],
  exports: [CrackAnalysisService],
})
export class CrackAnalysisModule {}
