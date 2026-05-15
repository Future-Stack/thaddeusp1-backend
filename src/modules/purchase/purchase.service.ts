import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import Stripe from 'stripe';

@Injectable()
export class PurchaseService {
  private stripe: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('env.STRIPE.STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  async createCheckoutSession(userId: string, createPurchaseDto: CreatePurchaseDto) {
    // 0. Check for maintenance mode
    const adminSettings = await this.prisma.adminSettings.findFirst();
    if (adminSettings?.maintenanceMode) {
      throw new BadRequestException('Platform is currently in maintenance mode. Ticket purchases are temporarily disabled.');
    }

    const { eventId, quantity } = createPurchaseDto;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check ticket availability
    const soldTickets = await this.prisma.ticket.count({
      where: { eventId },
    });

    if (soldTickets + quantity > event.maxTickets) {
      throw new BadRequestException('Not enough tickets available');
    }

    const total = Number(event.ticketPrice) * quantity;

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        eventId,
        quantity,
        total,
        status: 'pending',
      },
    });

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: event.name,
              description: `Tickets for ${event.name}`,
            },
            unit_amount: Math.round(Number(event.ticketPrice) * 100), // Stripe expects cents
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${this.configService.get<string>('env.APPLICATION.FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get<string>('env.APPLICATION.FRONTEND_URL')}/payment/failed`,
      metadata: {
        purchaseId: purchase.id,
        userId,
        eventId,
      },
    });

    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('env.STRIPE.STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const purchaseId = session.metadata?.purchaseId;
      const paymentIntentId = session.payment_intent as string;

      if (purchaseId && paymentIntentId) {
        await this.confirmPurchase(purchaseId, paymentIntentId);
      }
    }

    return { received: true };
  }

  private async confirmPurchase(purchaseId: string, paymentIntentId: string) {
    if (!purchaseId) return;

    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { event: { include: { region: true } } },
    });

    if (!purchase || purchase.status !== 'pending') {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update purchase status
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'paid',
          stripePaymentIntentId: paymentIntentId,
        },
      });

      // Generate tickets
      for (let i = 0; i < purchase.quantity; i++) {
        const tempTicket = await tx.ticket.create({
          data: {
            userId: purchase.userId,
            eventId: purchase.eventId,
            purchaseId: purchase.id,
            ticketNumber: `TEMP-${purchase.id}-${i}-${Date.now()}`, // Temporary unique
          },
        });

        const regionName = purchase.event.region?.name || 'GLOBAL';
        const formattedNumber = this.generateTicketNumber(regionName, tempTicket.serialNumber);

        await tx.ticket.update({
          where: { id: tempTicket.id },
          data: { ticketNumber: formattedNumber },
        });
      }
    });
  }

  private generateTicketNumber(regionName: string, serial: number): string {
    const initials = regionName
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
    return `TKT-${initials}-${serial.toString().padStart(6, '0')}`;
  }
}
