import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEventDto) {
    // Verify region exists
    const region = await this.prisma.region.findUnique({
      where: { id: data.regionId },
    });
    if (!region) throw new NotFoundException('Region not found');

    return this.prisma.event.create({
      data: {
        ...data,
        drawDate: new Date(data.drawDate),
        ticketOpen: new Date(data.ticketOpen),
        ticketClose: new Date(data.ticketClose),
      },
    });
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
