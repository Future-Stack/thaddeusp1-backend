import { Controller, Get, Post, Param, Query, UseGuards, Body } from '@nestjs/common';
import { DrawService } from './draw.service';
import { CreateDrawDto } from './dto/create-draw.dto';
import { DrawQueryDto } from './dto/draw-query.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';

@ApiTags('Draws')
@Controller('draws')
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  @Post('run')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Run a draw for an event (Admin only)' })
  runDraw(
    @GetCurrentUser('id') adminId: string,
    @Body() dto: CreateDrawDto,
  ) {
    return this.drawService.runDraw(adminId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all draws (Admin only)' })
  findAll(@Query() query: DrawQueryDto) {
    return this.drawService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single draw result' })
  findOne(@Param('id') id: string) {
    return this.drawService.findOne(id);
  }
}
