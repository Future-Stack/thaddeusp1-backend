import { Module } from '@nestjs/common';
import { DrawService } from './draw.service';
import { DrawController } from './draw.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoucherModule } from '../voucher/voucher.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from 'src/mail/mail.module';
import { AutoDrawCron } from './auto-draw.cron';

@Module({
  imports: [VoucherModule, NotificationModule, MailModule],
  controllers: [DrawController],
  providers: [DrawService, PrismaService, AutoDrawCron],
  exports: [DrawService],
})
export class DrawModule {}
