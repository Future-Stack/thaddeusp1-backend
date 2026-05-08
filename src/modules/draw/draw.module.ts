import { Module } from '@nestjs/common';
import { DrawService } from './draw.service';
import { DrawController } from './draw.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DrawController],
  providers: [DrawService, PrismaService],
  exports: [DrawService],
})
export class DrawModule {}
