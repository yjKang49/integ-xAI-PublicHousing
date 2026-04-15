import { Module } from '@nestjs/common';
import { CouchService } from '../../database/couch.service';
import { MarkersService } from './markers.service';
import { MarkersController } from './markers.controller';

@Module({
  providers: [MarkersService, CouchService],
  controllers: [MarkersController],
  exports: [MarkersService],
})
export class MarkersModule {}
