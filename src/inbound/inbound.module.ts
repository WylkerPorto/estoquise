import { Module } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';

@Module({
  controllers: [InboundController],
  providers: [InboundService],
})
export class InboundModule {}
