import { Module } from '@nestjs/common';
import { CouchService } from '../../database/couch.service';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  providers: [ProjectsService, CouchService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
