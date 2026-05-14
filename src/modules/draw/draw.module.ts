import { Module } from '@nestjs/common';
import { DrawService } from './draw.service';
import { DrawController } from './draw.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoucherModule } from '../voucher/voucher.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [VoucherModule, NotificationModule],
  controllers: [DrawController],
  providers: [DrawService, PrismaService],
  exports: [DrawService],
})
export class DrawModule {}
