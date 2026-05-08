import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VoucherStatus } from '@prisma/client';

@Injectable()
export class VoucherService {
  constructor(private readonly prisma: PrismaService) {}

  // Called internally after a draw to issue a voucher to the winner
  async issueVoucher(drawId: string, vendorId: string, expiresInDays = 30) {
    const draw = await this.prisma.draw.findUnique({
      where: { id: drawId },
      include: { event: { include: { region: true } }, winningTicket: true },
    });
    if (!draw) throw new NotFoundException('Draw not found');

    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    // Check no voucher already issued for this draw
    const existing = await this.prisma.voucher.findUnique({ where: { drawId } });
    if (existing) throw new BadRequestException('Voucher already issued for this draw');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const serial = draw.winningTicket.serialNumber;
    const regionInitials = draw.event.region.name
      .split(' ')
      .filter((w) => w.length > 0)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    const code = `VCH-${regionInitials}-${serial.toString().padStart(6, '0')}`;

    return this.prisma.voucher.create({
      data: {
        code,
        value: vendor.voucherValue ?? draw.event.prizeValue,
        drawId,
        ticketId: draw.winningTicketId,
        userId: draw.winnerId,
        vendorId,
        expiresAt,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        vendor: true,
        draw: true,
      },
    });
  }

  async findAll(query: VoucherQueryDto) {
    const { searchTerm, status, userId, vendorId, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (searchTerm) where.code = { contains: searchTerm, mode: 'insensitive' };
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (vendorId) where.vendorId = vendorId;

    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          vendor: true,
          draw: { include: { event: true } },
          ticket: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      data: vouchers,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findMyVouchers(userId: string, query: VoucherQueryDto) {
    return this.findAll({ ...query, userId });
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        vendor: true,
        draw: { include: { event: { include: { region: true } } } },
        ticket: true,
      },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return voucher;
  }

  async redeemVoucher(id: string, userId: string) {
    const voucher = await this.findOne(id);
    if (voucher.userId !== userId) throw new BadRequestException('This voucher does not belong to you');
    if (voucher.status !== VoucherStatus.ACTIVE) {
      throw new BadRequestException(`Voucher is ${voucher.status.toLowerCase()}`);
    }
    if (voucher.expiresAt < new Date()) {
      await this.prisma.voucher.update({ where: { id }, data: { status: VoucherStatus.EXPIRED } });
      throw new BadRequestException('Voucher has expired');
    }

    return this.prisma.voucher.update({
      where: { id },
      data: { status: VoucherStatus.REDEEMED, redeemedAt: new Date() },
    });
  }
}
