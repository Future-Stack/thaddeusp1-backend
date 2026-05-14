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
    const myParticipatedEvents = await this.prisma.ticket.findMany({
      where: { userId, purchase: { status: 'paid' } },
      select: { eventId: true },
    });
    const eventIds = [...new Set(myParticipatedEvents.map((t) => t.eventId))];

    // Count private unread
    const privateUnread = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Count global/targeted unread (not in NotificationRead)
    const globalUnread = await this.prisma.notification.count({
      where: {
        userId: null,
        OR: [{ targetEventId: null }, { targetEventId: { in: eventIds } }],
        readBy: { none: { userId } },
      },
    });

    const totalUnread = privateUnread + globalUnread;
    this.notificationGateway.sendUnreadCount(userId, totalUnread);
    return totalUnread;
  }

  // Broadcast to all users - STORE ONLY ONE RECORD
  async broadcast(
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: null,
        type,
        title,
        message,
        metadata,
      },
    });

    // Send real-time notification to all connected users
    this.notificationGateway.sendToAll('notification', notification);

    // We don't loop through all users to update count here for performance
    // Users will get their updated count when they connect or refresh
    // Or we could use a different strategy if real-time count is critical for ALL
  }

  // Notify all participants of a specific event - STORE ONLY ONE RECORD
  async notifyParticipants(
    eventId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: null,
        targetEventId: eventId,
        type,
        title,
        message,
        metadata,
      },
    });

    // Get unique participants to send socket messages
    const participants = await this.prisma.ticket.findMany({
      where: { eventId, purchase: { status: 'paid' } },
      select: { userId: true },
      distinct: ['userId'],
    });

    // Send real-time notification to each participant
    participants.forEach((p) => {
      this.notificationGateway.sendToUser(p.userId, 'notification', notification);
      this.updateAndNotifyCount(p.userId).catch(() => {});
    });

    return notification;
  }

  async findMyNotifications(userId: string, query: NotificationQueryDto) {
    const { type, isRead, page = '1', limit = '20' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get events user participated in
    const myParticipatedEvents = await this.prisma.ticket.findMany({
      where: { userId, purchase: { status: 'paid' } },
      select: { eventId: true },
    });
    const eventIds = [...new Set(myParticipatedEvents.map((t) => t.eventId))];

    const where: any = {
      OR: [
        { userId }, // Private
        { userId: null, targetEventId: null }, // Global broadcast
        { userId: null, targetEventId: { in: eventIds } }, // Targeted broadcast
      ],
    };

    if (type) where.type = type;

    // Handle isRead filter efficiently in DB
    if (isRead !== undefined) {
      const isReadBool = isRead;
      if (isReadBool) {
        where.OR = [
          { userId, isRead: true },
          {
            userId: null,
            OR: [{ targetEventId: null }, { targetEventId: { in: eventIds } }],
            readBy: { some: { userId } },
          },
        ];
      } else {
        where.OR = [
          { userId, isRead: false },
          {
            userId: null,
            OR: [{ targetEventId: null }, { targetEventId: { in: eventIds } }],
            readBy: { none: { userId } },
          },
        ];
      }
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          readBy: { where: { userId }, select: { id: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const finalData = notifications.map((n) => ({
      ...n,
      isRead: n.userId ? n.isRead : n.readBy.length > 0,
      readBy: undefined, // Don't expose this
    }));

    const unreadCount = await this.updateAndNotifyCount(userId);

    return {
      data: finalData,
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
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) return { success: false };

    if (notification.userId) {
      // Private notification
      if (notification.userId === userId) {
        await this.prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      }
    } else {
      // Global/Targeted notification
      await this.prisma.notificationRead.upsert({
        where: { userId_notificationId: { userId, notificationId: id } },
        create: { userId, notificationId: id },
        update: {},
      });
    }

    await this.updateAndNotifyCount(userId);
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    // 1. Mark all private as read
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // 2. Mark all global/targeted as read by creating records in NotificationRead
    const myParticipatedEvents = await this.prisma.ticket.findMany({
      where: { userId, purchase: { status: 'paid' } },
      select: { eventId: true },
    });
    const eventIds = [...new Set(myParticipatedEvents.map((t) => t.eventId))];

    const unreadGlobal = await this.prisma.notification.findMany({
      where: {
        userId: null,
        OR: [{ targetEventId: null }, { targetEventId: { in: eventIds } }],
        readBy: { none: { userId } },
      },
      select: { id: true },
    });

    if (unreadGlobal.length > 0) {
      await this.prisma.notificationRead.createMany({
        data: unreadGlobal.map((n) => ({ userId, notificationId: n.id })),
        skipDuplicates: true,
      });
    }

    await this.updateAndNotifyCount(userId);
    return { success: true };
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
