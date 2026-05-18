import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { DrawService } from './draw.service';
import { DrawMethod, EventStatus } from '@prisma/client';

@Injectable()
export class AutoDrawCron {
  private readonly logger = new Logger(AutoDrawCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly drawService: DrawService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('--- Cron Job Started: Checking Auto Draw ---');
    console.log(`[${new Date().toISOString()}] Cron is running!`);

    // 1. Fetch admin settings
    let adminSettings;
    try {
      adminSettings = await this.prisma.adminSettings.findFirst();
    } catch (error) {
      console.error('Error fetching admin settings in cron:', error);
      return;
    }

    if (!adminSettings || !adminSettings.automatedDraws || adminSettings.maintenanceMode) {
      this.logger.log('Auto draw is disabled, missing settings, or platform is in maintenance mode.');
      return; // Automated draws disabled or maintenance mode is on
    }

    const { drawDay, drawTime, minTicketForDraw } = adminSettings;

    if (!drawDay || !drawTime) {
      return; // Not fully configured
    }

    // 2. Check current day and time against settings
    // drawDay example: "MONDAY", "TUESDAY"
    // drawTime example: "18:00" (HH:mm)
    const now = new Date();
    
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()];
    
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    if (currentDay !== drawDay.toUpperCase() || currentTime !== drawTime) {
      return; // Not the right time
    }

    this.logger.log(`Auto draw time reached (${currentDay} ${currentTime}). Checking for eligible events...`);

    // 3. Find eligible events
    const ongoingEvents = await this.prisma.event.findMany({
      where: {
        status: EventStatus.ONGOING,
        isAutoDraw: true,
      },
    });

    this.logger.log(`Found ${ongoingEvents.length} ONGOING event(s) with isAutoDraw=true.`);

    for (const event of ongoingEvents) {
      this.logger.log(`Processing Event: ${event.id} (${event.name})`);
      
      // Check if it already has a draw
      const existingDraw = await this.prisma.draw.findFirst({ where: { eventId: event.id } });
      if (existingDraw) {
        this.logger.log(`Event ${event.id} already has a draw (${existingDraw.id}). Skipping.`);
        continue; // Already drawn
      }

      // Check min tickets
      const ticketsCount = await this.prisma.ticket.count({
        where: {
          eventId: event.id,
          purchase: { status: 'paid' },
        },
      });

      this.logger.log(`Event ${event.id} has ${ticketsCount} paid ticket(s). Minimum required: ${minTicketForDraw ?? 1}`);

      if (ticketsCount >= (minTicketForDraw ?? 1)) {
        this.logger.log(`Executing auto draw for event: ${event.id} - ${event.name}`);
        try {
          // system-triggered draw, so no specific adminId
          await this.drawService.runDraw(null as any, {
            eventId: event.id,
            method: DrawMethod.RANDOM,
          });
          this.logger.log(`Auto draw completed for event: ${event.id}`);
        } catch (error: any) {
          this.logger.error(`Failed to execute auto draw for event: ${event.id}`, error?.stack || error);
        }
      } else {
        this.logger.log(`Event ${event.id} does not have enough tickets for auto draw (${ticketsCount}/${minTicketForDraw})`);
      }
    }
  }
}
