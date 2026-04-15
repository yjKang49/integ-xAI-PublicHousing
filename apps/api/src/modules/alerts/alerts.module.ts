import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [AlertsService, CouchService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
