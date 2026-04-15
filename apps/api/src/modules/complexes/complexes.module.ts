import { Module } from '@nestjs/common';
import { ComplexesService } from './complexes.service';
import { ComplexesController } from './complexes.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [ComplexesService, CouchService],
  controllers: [ComplexesController],
  exports: [ComplexesService],
})
export class ComplexesModule {}
