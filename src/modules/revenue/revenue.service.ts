import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueStats() {
    const [totalTickets, revenueData] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.purchase.aggregate({
        where: { status: 'paid' },
        _sum: { total: true },
      }),
    ]);

    const grossRevenue = Number(revenueData._sum.total || 0);
    // Net profit = Gross Revenue - Total Prize Costs
    const eventsWithDraws = await this.prisma.event.findMany({
      where: { draws: { some: {} } },
      select: { prizeValue: true },
    });
    const totalPrizeCost = eventsWithDraws.reduce((sum, e) => sum + Number(e.prizeValue), 0);

    return {
      totalTickets,
      grossRevenue,
      totalPrizeCost,
      netProfit: grossRevenue - totalPrizeCost,
    };
  }

  async getRevenueByEvent(query: { page?: string; limit?: string }) {
    const { page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        include: {
          _count: { select: { tickets: true } },
          purchases: {
            where: { status: 'paid' },
            select: { total: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.event.count(),
    ]);

    const data = events.map((event) => {
      const poolTotal = event.purchases.reduce((sum, p) => sum + Number(p.total), 0);
      return {
        eventId: event.id,
        eventName: event.name,
        ticketsSold: event._count.tickets,
        poolTotal,
        voucherCost: Number(event.prizeValue),
      };
    });

    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
