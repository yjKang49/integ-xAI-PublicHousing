import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [ZonesService, CouchService],
  controllers: [ZonesController],
  exports: [ZonesService],
})
export class ZonesModule {}
