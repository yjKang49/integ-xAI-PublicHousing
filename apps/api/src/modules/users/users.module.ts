import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CouchService } from '../../database/couch.service';

@Module({
  providers: [UsersService, CouchService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
