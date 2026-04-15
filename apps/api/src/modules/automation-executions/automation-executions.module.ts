// apps/api/src/modules/automation-executions/automation-executions.module.ts
import { Module } from '@nestjs/common';
import { AutomationExecutionsService } from './automation-executions.service';
import { AutomationExecutionsController } from './automation-executions.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [AutomationExecutionsService, CouchService],
  controllers: [AutomationExecutionsController],
  exports: [AutomationExecutionsService],
})
export class AutomationExecutionsModule {}
