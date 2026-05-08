import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDrawDto } from './dto/create-draw.dto';
import { DrawQueryDto } from './dto/draw-query.dto';
import { DrawMethod } from '@prisma/client';

@Injectable()
export class DrawService {
  constructor(private readonly prisma: PrismaService) {}

  async runDraw(adminId: string, dto: CreateDrawDto) {
    const { eventId, method = DrawMethod.RANDOM } = dto;

    // Validate event
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    // Check the event hasn't already been drawn
    const existingDraw = await this.prisma.draw.findFirst({ where: { eventId } });
    if (existingDraw) throw new BadRequestException('This event already has a draw result');

    // Get all eligible tickets (paid)
    const tickets = await this.prisma.ticket.findMany({
      where: {
        eventId,
        purchase: { status: 'paid' },
      },
      include: { user: true },
    });

    if (tickets.length === 0) {
      throw new BadRequestException('No eligible tickets found for this event');
    }

    // Check admin settings for minimum ticket threshold
    const adminSettings = await this.prisma.adminSettings.findFirst();
    const minTickets = adminSettings?.minTicketForDraw ?? 1;
    if (tickets.length < minTickets) {
      throw new BadRequestException(
        `Not enough tickets for a draw. Need at least ${minTickets}, have ${tickets.length}`,
      );
    }

    // Pick a winner
    const winningTicket = tickets[Math.floor(Math.random() * tickets.length)];

    // Get total unique participants
    const uniqueParticipants = new Set(tickets.map((t) => t.userId)).size;

    // Run in a transaction
    const draw = await this.prisma.$transaction(async (tx) => {
      // Create the draw record
      const newDraw = await tx.draw.create({
        data: {
          eventId,
          winnerId: winningTicket.userId,
          winningTicketId: winningTicket.id,
          method,
          totalParticipants: uniqueParticipants,
          totalTickets: tickets.length,
          drawnById: adminId,
        },
        include: {
          winner: { select: { id: true, fullName: true, email: true } },
          winningTicket: true,
          event: true,
        },
      });

      // Mark ticket as winner
      await tx.ticket.update({
        where: { id: winningTicket.id },
        data: {
          isWinner: true,
          winnerSelectedAt: new Date(),
        },
      });

      return newDraw;
    });

    return draw;
  }

  async findAll(query: DrawQueryDto) {
    const { eventId, winnerId, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (winnerId) where.winnerId = winnerId;

    const [draws, total] = await Promise.all([
      this.prisma.draw.findMany({
        where,
        include: {
          winner: { select: { id: true, fullName: true, email: true } },
          winningTicket: true,
          event: { include: { region: true } },
          drawnBy: { select: { id: true, fullName: true } },
          voucher: true,
        },
        skip,
        take,
        orderBy: { drawnAt: 'desc' },
      }),
      this.prisma.draw.count({ where }),
    ]);

    return {
      data: draws,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findOne(id: string) {
    const draw = await this.prisma.draw.findUnique({
      where: { id },
      include: {
        winner: { select: { id: true, fullName: true, email: true, phone: true } },
        winningTicket: true,
        event: { include: { region: true } },
        drawnBy: { select: { id: true, fullName: true } },
        voucher: true,
      },
    });
    if (!draw) throw new NotFoundException('Draw not found');
    return draw;
  }
}
