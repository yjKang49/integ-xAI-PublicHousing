import { Module } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';
import { CouchService } from '../../database/couch.service';
import { AutomationRulesModule } from '../automation-rules/automation-rules.module';

@Module({
  imports: [AutomationRulesModule],
  providers: [ComplaintsService, CouchService],
  controllers: [ComplaintsController],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
