// apps/api/src/modules/sensor-readings/sensor-readings.module.ts
// Phase 2-8: 센서 측정값 모듈

import { Module } from '@nestjs/common';
import { SensorReadingsService } from './sensor-readings.service';
import { SensorReadingsController } from './sensor-readings.controller';
import { SensorsModule } from '../sensors/sensors.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CouchService } from '../../database/couch.service';

@Module({
  imports: [SensorsModule, AlertsModule],
  providers: [SensorReadingsService, CouchService],
  controllers: [SensorReadingsController],
  exports: [SensorReadingsService],
})
export class SensorReadingsModule {}
