import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRegionDto) {
    const existing = await this.prisma.region.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Region with this name already exists');
    }
    return this.prisma.region.create({ data });
  }

  async findAll() {
    return this.prisma.region.findMany({
      include: {
        _count: {
          select: { users: true, vendors: true, events: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: {
        vendors: true,
        events: true,
      },
    });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  async update(id: string, data: UpdateRegionDto) {
    await this.findOne(id);
    return this.prisma.region.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.region.delete({
      where: { id },
    });
  }
}
