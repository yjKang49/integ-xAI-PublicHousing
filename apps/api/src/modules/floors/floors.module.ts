import { Module } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FloorsController } from './floors.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [FloorsService, CouchService],
  controllers: [FloorsController],
  exports: [FloorsService],
})
export class FloorsModule {}
