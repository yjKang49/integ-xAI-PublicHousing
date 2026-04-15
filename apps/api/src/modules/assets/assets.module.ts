// apps/api/src/modules/assets/assets.module.ts
import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CouchService } from '../../database/couch.service';

@Module({
  controllers: [AssetsController],
  providers:   [AssetsService, CouchService],
  exports:     [AssetsService],
})
export class AssetsModule {}
