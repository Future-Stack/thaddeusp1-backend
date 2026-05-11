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
}
