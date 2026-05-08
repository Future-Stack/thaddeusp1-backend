import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';

@Module({
  controllers: [VoucherController],
  providers: [VoucherService, PrismaService],
  exports: [VoucherService],
})
export class VoucherModule {}
