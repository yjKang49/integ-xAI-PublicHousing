import { Module } from '@nestjs/common';
import { CracksService } from './cracks.service';
import { CracksController } from './cracks.controller';
import { CouchService } from '../../database/couch.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [CracksService, CouchService],
  controllers: [CracksController],
  exports: [CracksService],
})
export class CracksModule {}
