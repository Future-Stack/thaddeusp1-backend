import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(query: TicketQueryDto) {
    const { searchTerm, eventId, userId, isWinner, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (searchTerm) {
      where.ticketNumber = {
        contains: searchTerm,
        mode: 'insensitive',
      };
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (isWinner !== undefined) {
      where.isWinner = isWinner;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          event: true,
          purchase: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        event: true,
        purchase: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async findMyTickets(userId: string, query: TicketQueryDto) {
    return this.findAll({ ...query, userId });
  }

  async update(id: string, data: UpdateTicketDto) {
    await this.findOne(id);
    return this.prisma.ticket.update({
      where: { id },
      data,
    });
  }
}
