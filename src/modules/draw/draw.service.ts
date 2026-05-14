import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoucherService } from '../voucher/voucher.service';
import { CreateDrawDto } from './dto/create-draw.dto';
import { DrawQueryDto } from './dto/draw-query.dto';
import { DrawMethod, EventStatus, NotificationType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DrawService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly voucherService: VoucherService,
    private readonly notificationService: NotificationService,
  ) {}

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
          winner: { select: { id: true, fullName: true, email: true, profileImg: true } },
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

      // Update event status to COMPLETED
      await tx.event.update({
        where: { id: eventId },
        data: { status: EventStatus.COMPLETED },
      });

      // Automatically issue voucher to the winner
      const voucher = await this.voucherService.issueVoucher(newDraw.id, undefined, 30, tx);

      return { ...newDraw, voucher };
    });

    // Send notifications
    // 1. Notify all participants (one record in DB)
    await this.notificationService.notifyParticipants(
      eventId,
      NotificationType.DRAW_RESULT,
      'Draw Completed!',
      `The draw for "${draw.event.name}" has been completed. Check if you won!`,
      { drawId: draw.id, eventId },
    );

    // 2. Notify the winner (private record)
    await this.notificationService.create(
      draw.winnerId,
      NotificationType.WINNER_ANNOUNCEMENT,
      'Congratulations! You Won!',
      `You are the winner of "${draw.event.name}"! A voucher has been issued to you.`,
      { drawId: draw.id, eventId, voucherId: draw.voucher?.id },
    );

    return draw;
  }

  async findAll(query: DrawQueryDto, currentUser: any) {
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
          winner: { select: { id: true, fullName: true, email: true, profileImg: true } },
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

    const formattedDraws = draws.map((draw) => {
      const isWinner = currentUser?.id === draw.winnerId;

      if (currentUser.role === 'ADMIN') {
        return { ...draw, isWinner };
      }

      // Filtered response for regular users
      return {
        id: draw.id,
        drawnAt: draw.drawnAt,
        method: draw.method,
        totalParticipants: draw.totalParticipants,
        totalTickets: draw.totalTickets,
        isWinner,
        winner: {
          id: draw.winnerId,
          fullName: draw.winner.fullName,
          profileImg: draw.winner.profileImg,
        },
        event: {
          id: draw.event.id,
          name: draw.event.name,
          prizeValue: draw.event.prizeValue,
        },
      };
    });

    return {
      data: formattedDraws,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const draw = await this.prisma.draw.findUnique({
      where: { id },
      include: {
        winner: { select: { id: true, fullName: true, email: true, phone: true, profileImg: true } },
        winningTicket: true,
        event: { include: { region: true } },
        drawnBy: { select: { id: true, fullName: true } },
        voucher: true,
      },
    });
    if (!draw) throw new NotFoundException('Draw not found');

    const isWinner = currentUser?.id === draw.winnerId;

    if (currentUser.role === 'ADMIN') {
      return { ...draw, isWinner };
    }

    // Filtered response for regular users
    return {
      id: draw.id,
      drawnAt: draw.drawnAt,
      method: draw.method,
      totalParticipants: draw.totalParticipants,
      totalTickets: draw.totalTickets,
      isWinner,
      winner: {
        id: draw.winnerId,
        fullName: draw.winner.fullName,
        profileImg: draw.winner.profileImg,
      },
      event: {
        id: draw.event.id,
        name: draw.event.name,
        prizeValue: draw.event.prizeValue,
      },
    };
  }

  async getWinners(query: { searchTerm?: string; page?: string; limit?: string }) {
    const { searchTerm, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (searchTerm) {
      where.winner = {
        fullName: { contains: searchTerm, mode: 'insensitive' },
      };
    }

    const [draws, total] = await Promise.all([
      this.prisma.draw.findMany({
        where,
        include: {
          winner: {
            select: {
              fullName: true,
              profileImg: true,
              streetAddress: true,
              city: true,
              state: true,
            },
          },
          event: {
            select: {
              prizeValue: true,
              name: true,
            },
          },
        },
        skip,
        take,
        orderBy: { drawnAt: 'desc' },
      }),
      this.prisma.draw.count({ where }),
    ]);

    // Find the latest winner globally to mark them
    const latestDraw = await this.prisma.draw.findFirst({
      orderBy: { drawnAt: 'desc' },
      select: { id: true },
    });

    const formattedWinners = draws.map((draw) => ({
      id: draw.id,
      winnerId: draw.winnerId,
      name: draw.winner.fullName,
      profileImg: draw.winner.profileImg,
      address: `${draw.winner.streetAddress || ''}, ${draw.winner.city || ''}, ${draw.winner.state || ''}`.trim().replace(/^, |, $/g, ''),
      winDate: draw.drawnAt,
      prize: draw.event.prizeValue,
      eventName: draw.event.name,
      isLastWinner: draw.id === latestDraw?.id,
    }));

    return {
      data: formattedWinners,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
