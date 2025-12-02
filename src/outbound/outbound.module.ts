import { Module } from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';

@Module({
  controllers: [OutboundController],
  providers: [OutboundService],
})
export class OutboundModule {}
