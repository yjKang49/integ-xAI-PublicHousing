import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportGeneratorProcessor } from './report-generator.processor';
import { CouchService } from '../../database/couch.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reports' }),
    MediaModule,
  ],
  providers: [ReportsService, ReportGeneratorProcessor, CouchService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
