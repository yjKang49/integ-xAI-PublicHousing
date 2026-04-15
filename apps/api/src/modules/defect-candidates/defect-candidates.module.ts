// apps/api/src/modules/defect-candidates/defect-candidates.module.ts
import { Module } from '@nestjs/common'
import { DefectCandidatesService } from './defect-candidates.service'
import { DefectCandidatesController } from './defect-candidates.controller'
import { CouchService } from '../../database/couch.service'

@Module({
  controllers: [DefectCandidatesController],
  providers:   [DefectCandidatesService, CouchService],
  exports:     [DefectCandidatesService],
})
export class DefectCandidatesModule {}
