import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [BuildingsService, CouchService],
  controllers: [BuildingsController],
  exports: [BuildingsService],
})
export class BuildingsModule {}
