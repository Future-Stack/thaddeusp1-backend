import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    let profileImg = user.profileImg;

    if (file) {
      const uploadResult: any = await this.cloudinary.uploadImageFromBuffer(
        file.buffer,
        'profile-images',
        `user_${userId}_${Date.now()}`,
      );
      profileImg = uploadResult.secure_url;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName || user.fullName,
        phone: data.phone || user.phone,
        streetAddress: data.streetAddress || user.streetAddress,
        city: data.city || user.city,
        state: data.state || user.state,
        zip: (data.zip && !isNaN(parseInt(data.zip, 10))) ? parseInt(data.zip, 10) : user.zip,
        regionId: data.regionId && data.regionId !== '' ? data.regionId : user.regionId,
        profileImg,
      },
      include: {
        region: true,
      },
    });

    const { password, lastOtp, refreshToken, ...rest } = updatedUser;
    return rest;
  }

  async getUserList(query: { searchTerm?: string; page?: string; limit?: string }) {
    const { searchTerm, page = '1', limit = '10' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
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
          _count: {
            select: { tickets: true },
          },
          purchases: {
            where: { status: 'paid' },
            select: { total: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((user) => {
      const totalAmount = user.purchases.reduce((sum, p) => sum + Number(p.total), 0);
      const { password, refreshToken, lastOtp, ...rest } = user;
      return {
        ...rest,
        ticketCount: user._count.tickets,
        totalPurchaseAmount: totalAmount,
      };
    });

    return {
      data: formattedUsers,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getGlobalUserStats() {
    const [totalUsers, totalTickets, totalDraws] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.ticket.count(),
      this.prisma.draw.count(),
    ]);

    return {
      totalUsers,
      totalTickets,
      totalDraws,
    };
  }

  async updateStatus(userId: string, status: 'active' | 'inActive') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, fullName: true, status: true },
    });
  }

  async adminUpdateStatus(userId: string, status: 'active' | 'suspended') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, fullName: true, status: true },
    });
  }

  async getUserStats(userId: string) {
    const [participatedEvents, purchaseStats, totalWins] = await Promise.all([
      // 1. Total participated events (unique events with paid purchases)
      this.prisma.purchase.groupBy({
        by: ['eventId'],
        where: { userId, status: 'paid' },
      }),

      // 2. Total tickets and total spent
      this.prisma.purchase.aggregate({
        where: { userId, status: 'paid' },
        _sum: {
          quantity: true,
          total: true,
        },
      }),

      // 3. Total wins
      this.prisma.ticket.count({
        where: { userId, isWinner: true },
      }),
    ]);

    return {
      participatedEvents: participatedEvents.length,
      totalTicketsBought: purchaseStats._sum.quantity || 0,
      totalSpentMoney: Number(purchaseStats._sum.total || 0),
      totalWins,
    };
  }
}
