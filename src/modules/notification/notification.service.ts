import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Internal: create a notification for a user
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });
  }

  // Create notifications for multiple users (bulk)
  async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, message, metadata })),
    });
  }

  async findMyNotifications(userId: string, query: NotificationQueryDto) {
    const { type, isRead, page = '1', limit = '20' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = { userId };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
        unreadCount,
      },
    };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Admin: view all notifications with filters
  async findAll(query: NotificationQueryDto & { userId?: string }) {
    const { userId, type, isRead, page = '1', limit = '20' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    };
  }
}
