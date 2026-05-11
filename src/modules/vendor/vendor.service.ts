import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateVendorDto) {
    // Verify region exists if provided
    if (data.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: data.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    return this.prisma.vendor.create({ data });
  }

  async findAll() {
    return this.prisma.vendor.findMany({
      include: { region: true },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(id: string, data: UpdateVendorDto) {
    await this.findOne(id);
    if (data.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: data.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }
    return this.prisma.vendor.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vendor.delete({
      where: { id },
    });
  }
}
