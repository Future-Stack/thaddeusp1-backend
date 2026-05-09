import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationType, UserStatus } from '@prisma/client';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // Internal: create a notification for a user and send via socket
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, metadata },
    });

    // Send real-time notification
    this.notificationGateway.sendToUser(userId, 'notification', notification);
    await this.updateAndNotifyCount(userId);

    return notification;
  }

  // Helper to fetch unread count and notify user via socket
  async updateAndNotifyCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    this.notificationGateway.sendUnreadCount(userId, unreadCount);
    return unreadCount;
  }

  // Create notifications for multiple users (bulk) and broadcast
  async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, message, metadata })),
    });

    // Broadcast to all (since it's bulk/public event)
    this.notificationGateway.sendToAll('notification', {
      type,
      title,
      message,
      metadata,
    });

    // Notify each user of their updated unread count
    for (const userId of userIds) {
      await this.updateAndNotifyCount(userId);
    }
  }

  // Broadcast to all users and save to DB
  async broadcast(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.active },
      select: { id: true },
    });

    if (users.length > 0) {
      await this.createBulk(
        users.map((u) => u.id),
        type,
        title,
        message,
        metadata,
      );
    }
  }

  /*
  // Functionality to send to specific users based on region
  async notifyByRegion(
    regionId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const users = await this.prisma.user.findMany({
      where: { regionId, status: UserStatus.active },
      select: { id: true },
    });

    if (users.length > 0) {
      const userIds = users.map((u) => u.id);
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({ userId, type, title, message, metadata })),
      });

      // Send to these specific users via socket
      userIds.forEach(userId => {
        this.notificationGateway.sendToUser(userId, 'notification', {
          type,
          title,
          message,
          metadata,
        });
      });
    }
  }
  */

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
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    const unreadCount = await this.updateAndNotifyCount(userId);
    console.log("unread count :", unreadCount);
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    const unreadCount = await this.updateAndNotifyCount(userId);
    console.log("unread count :", unreadCount)
    return result;
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
