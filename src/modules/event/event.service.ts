import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationService } from '../notification/notification.service';
import { EventStatus, NotificationType } from '@prisma/client';

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(data: CreateEventDto) {
    // 1. Ensure only one active event exists at a time
    const activeEvent = await this.prisma.event.findFirst({
      where: {
        status: {
          notIn: [EventStatus.COMPLETED, EventStatus.CANCELLED],
        },
      },
    });

    if (activeEvent) {
      throw new BadRequestException(
        'An active event already exists. You can only have one active event at a time.',
      );
    }

    // 2. Verify region exists if provided
    if (data.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: data.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    const event = await this.prisma.event.create({
      data: {
        ...data,
        drawDate: new Date(data.drawDate),
        ticketOpen: new Date(data.ticketOpen),
        ticketClose: new Date(data.ticketClose),
        status: EventStatus.UPCOMING, // Default status
      },
    });

    // Send notification to all users
    await this.notificationService.broadcast(
      NotificationType.SYSTEM,
      'New Event Created!',
      `A new event "${event.name}" has been created. Participate now!`,
      { eventId: event.id },
    );

    return event;
  }

  async findAll() {
    return this.prisma.event.findMany({
      include: { region: true },
      orderBy: { ticketOpen: 'desc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, data: UpdateEventDto) {
    await this.findOne(id);
    if (data.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: data.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    const updateData: any = { ...data };
    if (data.drawDate) updateData.drawDate = new Date(data.drawDate);
    if (data.ticketOpen) updateData.ticketOpen = new Date(data.ticketOpen);
    if (data.ticketClose) updateData.ticketClose = new Date(data.ticketClose);

    return this.prisma.event.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.delete({
      where: { id },
    });
  }

  async getEventStats(eventId: string) {
    const [ticketsSold, uniqueParticipantsData, poolTotalData] = await Promise.all([
      this.prisma.ticket.count({ where: { eventId } }),
      this.prisma.ticket.groupBy({
        by: ['userId'],
        where: { eventId },
      }),
      this.prisma.purchase.aggregate({
        where: { eventId, status: 'paid' },
        _sum: { total: true },
      }),
    ]);

    return {
      totalTickets: ticketsSold,
      poolTotal: Number(poolTotalData._sum.total || 0),
      totalParticipants: uniqueParticipantsData.length,
    };
  }

  async getEventPurchasedUsers(
    eventId: string,
    query: { searchTerm?: string; page?: string; limit?: string },
  ) {
    const { searchTerm, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Search/Filter criteria for Users who have paid purchases for this event
    const where: any = {
      purchases: {
        some: { eventId, status: 'paid' },
      },
    };

    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          purchases: {
            where: { eventId, status: 'paid' },
            select: { quantity: true, total: true, createdAt: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedData = users.map((user) => {
      const ticketAmount = user.purchases.reduce((sum, p) => sum + p.quantity, 0);
      const totalPaid = user.purchases.reduce((sum, p) => sum + Number(p.total), 0);
      const latestPurchaseDate = user.purchases.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0]?.createdAt;

      return {
        userId: user.id,
        name: user.fullName,
        email: user.email,
        ticketAmount,
        totalPaid,
        purchasedDate: latestPurchaseDate,
      };
    });

    return {
      data: formattedData,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
