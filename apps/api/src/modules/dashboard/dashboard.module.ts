import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [DashboardService, CouchService],
  controllers: [DashboardController],
})
export class DashboardModule {}
