import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { CouchService } from '../../database/couch.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [SchedulesService, CouchService],
  controllers: [SchedulesController],
  exports: [SchedulesService],
})
export class SchedulesModule {}
