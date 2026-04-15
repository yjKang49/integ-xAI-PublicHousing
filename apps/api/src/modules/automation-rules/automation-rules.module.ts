// apps/api/src/modules/automation-rules/automation-rules.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationRulesController } from './automation-rules.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'job-queue' }),
  ],
  providers: [AutomationRulesService, CouchService],
  controllers: [AutomationRulesController],
  exports: [AutomationRulesService],
})
export class AutomationRulesModule {}
