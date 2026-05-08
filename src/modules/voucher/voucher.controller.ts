import { Controller, Get, Post, Param, Query, UseGuards, Body } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { IsInt, IsString, Min } from 'class-validator';

class IssueVoucherDto {
  @ApiProperty()
  @IsString()
  drawId: string;

  @ApiProperty()
  @IsString()
  vendorId: string;

  @ApiProperty({ default: 30 })
  @IsInt()
  @Min(1)
  expiresInDays: number;
}

@ApiTags('Vouchers')
@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post('issue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Issue a voucher to a draw winner (Admin only)' })
  issueVoucher(@Body() dto: IssueVoucherDto) {
    return this.voucherService.issueVoucher(dto.drawId, dto.vendorId, dto.expiresInDays);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all vouchers with filters (Admin only)' })
  findAll(@Query() query: VoucherQueryDto) {
    return this.voucherService.findAll(query);
  }

  @Get('my-vouchers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user vouchers' })
  findMyVouchers(
    @GetCurrentUser('id') userId: string,
    @Query() query: VoucherQueryDto,
  ) {
    return this.voucherService.findMyVouchers(userId, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single voucher' })
  findOne(@Param('id') id: string) {
    return this.voucherService.findOne(id);
  }

  @Post(':id/redeem')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Redeem a voucher' })
  redeem(
    @Param('id') id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    return this.voucherService.redeemVoucher(id, userId);
  }
}
