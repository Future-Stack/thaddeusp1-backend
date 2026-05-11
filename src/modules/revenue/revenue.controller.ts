import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';

@ApiTags('Revenue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global revenue stats (Admin only)' })
  getRevenueStats() {
    return this.revenueService.getRevenueStats();
  }

  @Get('events')
  @ApiOperation({ summary: 'Get revenue stats by event (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getRevenueByEvent(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.revenueService.getRevenueByEvent({ page, limit });
  }
}
