import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RegionModule } from './modules/region/region.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { EventModule } from './modules/event/event.module';
import { MailModule } from './mail/mail.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { DrawModule } from './modules/draw/draw.module';
import { VoucherModule } from './modules/voucher/voucher.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RevenueModule } from './modules/revenue/revenue.module';
import { ReviewModule } from './modules/review/review.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import envConfig from './config/env.config';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      cache: true,
    }),
    AuthModule,
    UserModule,
    CloudinaryModule,
    RegionModule,
    VendorModule,
    EventModule,
    MailModule,
    PurchaseModule,
    TicketModule,
    DrawModule,
    VoucherModule,
    NotificationModule,
    SettingsModule,
    RevenueModule,
    ReviewModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
