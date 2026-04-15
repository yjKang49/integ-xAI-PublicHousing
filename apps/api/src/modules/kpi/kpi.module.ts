import { Module } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [KpiService, CouchService],
  controllers: [KpiController],
  exports: [KpiService],
})
export class KpiModule {}
