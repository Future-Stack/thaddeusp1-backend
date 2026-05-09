import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, PrismaService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
