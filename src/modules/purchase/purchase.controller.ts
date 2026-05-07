import * as common from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Purchase')
@common.Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @common.Post('buy')
  @ApiBearerAuth()
  @common.UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate a ticket purchase' })
  async buyTickets(
    @GetCurrentUser('id') userId: string,
    @common.Body() createPurchaseDto: CreatePurchaseDto,
  ) {
    return this.purchaseService.createCheckoutSession(userId, createPurchaseDto);
  }

  @common.Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @common.Headers('stripe-signature') signature: string,
    @common.Req() request: common.RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new common.BadRequestException('Missing stripe-signature');
    }
    const payload = request.rawBody;
    if (!payload) {
      throw new common.BadRequestException('Raw body not available');
    }
    return this.purchaseService.handleWebhook(signature, payload);
  }
}
