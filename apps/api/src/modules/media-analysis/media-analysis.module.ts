// apps/api/src/modules/media-analysis/media-analysis.module.ts
import { Module } from '@nestjs/common'
import { MediaAnalysisService } from './media-analysis.service'
import { MediaAnalysisController } from './media-analysis.controller'
import { CouchService } from '../../database/couch.service'

@Module({
  controllers: [MediaAnalysisController],
  providers: [MediaAnalysisService, CouchService],
  exports: [MediaAnalysisService],
})
export class MediaAnalysisModule {}
