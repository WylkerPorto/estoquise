import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService],
})

JwtModule.register({
  secret: process.env.JWT_SECRET || 'dev-secret',
  signOptions: { expiresIn: '1d' },
})

export class AuthModule {}
