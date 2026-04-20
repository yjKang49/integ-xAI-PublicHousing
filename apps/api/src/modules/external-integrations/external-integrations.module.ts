// apps/api/src/modules/external-integrations/external-integrations.module.ts

import { Module } from '@nestjs/common';
import { KalisFmsService } from './kalis-fms.service';
import { SejumteoService } from './sejumteo.service';
import { ExternalIntegrationsController } from './external-integrations.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  controllers: [ExternalIntegrationsController],
  providers: [KalisFmsService, SejumteoService, CouchService],
  exports: [KalisFmsService, SejumteoService],
})
export class ExternalIntegrationsModule {}
