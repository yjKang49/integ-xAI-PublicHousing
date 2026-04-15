// apps/api/src/modules/work-orders/work-orders.module.ts
import { Module } from '@nestjs/common';
import { CouchService } from '../../database/couch.service';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';

@Module({
  providers: [WorkOrdersService, CouchService],
  controllers: [WorkOrdersController],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
