import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [MediaService, CouchService],
  controllers: [MediaController],
  exports: [MediaService],
})
export class MediaModule {}
