import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats() {
    const [
      totalTickets,
      revenueData,
      totalEvents,
      activeEvents,
      completedEvents,
      uniqueParticipantsData,
      totalUsers,
      statsToday,
      uniqueWinnersData,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.purchase.aggregate({
        where: { status: 'paid' },
        _sum: { total: true },
      }),
      this.prisma.event.count(),
      this.prisma.event.count({
        where: { status: { in: ['UPCOMING', 'ONGOING'] } },
      }),
      this.prisma.event.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.ticket.groupBy({
        by: ['userId'],
      }),
      this.prisma.user.count({
        where: { role: 'USER' },
      }),
      this.prisma.purchase.aggregate({
        where: {
          status: 'paid',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.draw.groupBy({
        by: ['winnerId'],
      }),
    ]);

    const grossRevenue = Number(revenueData._sum.total || 0);
    const revenueToday = Number(statsToday?._sum?.total || 0);
    const ticketsToday = Number(statsToday?._count?.id || 0);
    const uniqueWinnersCount = uniqueWinnersData.length;

    // Calculate total prize cost from events that have draws (Sync with RevenueService)
    const eventsWithDraws = await this.prisma.event.findMany({
      where: { draws: { some: {} } },
      select: { prizeValue: true },
    });
    const totalPrizeCost = eventsWithDraws.reduce(
      (sum, e) => sum + Number(e.prizeValue),
      0,
    );

    return {
      totalTicketsSold: totalTickets,
      totalRevenue: grossRevenue,
      totalEvents,
      activeEvents,
      completedEvents,
      totalUniqueParticipants: uniqueParticipantsData.length,
      totalUniqueWinners: uniqueWinnersCount,
      totalUsers,
      totalPrizeCost,
      netProfit: grossRevenue - totalPrizeCost,
      revenueToday,
      ticketsSoldToday: ticketsToday,
      averageTicketsPerUser:
        uniqueParticipantsData.length > 0
          ? (totalTickets / uniqueParticipantsData.length).toFixed(2)
          : 0,
    };
  }
}
