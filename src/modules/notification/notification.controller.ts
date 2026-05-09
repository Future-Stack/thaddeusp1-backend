import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // User routes
  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my notifications' })
  findMyNotifications(
    @GetCurrentUser('userId') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findMyNotifications(userId, query);
  }

  @Patch('my/read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllAsRead(@GetCurrentUser('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Patch('my/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(
    @Param('id') id: string,
    @GetCurrentUser('userId') userId: string,
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  // Admin routes
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all notifications (Admin only)' })
  findAll(@Query() query: NotificationQueryDto) {
    return this.notificationService.findAll(query);
  }
}
