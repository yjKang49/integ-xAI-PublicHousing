// apps/api/src/modules/sensors/sensors.module.ts
// Phase 2-8: IoT 센서 기기 모듈

import { Module } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [SensorsService, CouchService],
  controllers: [SensorsController],
  exports: [SensorsService],
})
export class SensorsModule {}
