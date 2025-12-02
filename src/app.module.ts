import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { InboundModule } from './inbound/inbound.module';
import { OutboundModule } from './outbound/outbound.module';

@Module({
  imports: [AuthModule, PrismaModule, UserModule, ProductModule, InboundModule, OutboundModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
