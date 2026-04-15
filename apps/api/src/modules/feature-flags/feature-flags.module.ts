// apps/api/src/modules/feature-flags/feature-flags.module.ts
// RedisModule is registered globally in AppModule (RedisModule.forRootAsync),
// so @InjectRedis() works here without re-importing it.
import { Module } from '@nestjs/common'
import { FeatureFlagsService } from './feature-flags.service'
import { FeatureFlagsController } from './feature-flags.controller'
import { CouchService } from '../../database/couch.service'

@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, CouchService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
