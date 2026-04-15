import { Module } from '@nestjs/common';
import { DefectsService } from './defects.service';
import { DefectsController } from './defects.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [DefectsService, CouchService],
  controllers: [DefectsController],
  exports: [DefectsService],
})
export class DefectsModule {}
