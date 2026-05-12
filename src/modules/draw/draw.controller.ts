import { Controller, Get, Post, Param, Query, UseGuards, Body } from '@nestjs/common';
import { DrawService } from './draw.service';
import { CreateDrawDto } from './dto/create-draw.dto';
import { DrawQueryDto } from './dto/draw-query.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
    @GetCurrentUser('userId') adminId: string,
    @Body() dto: CreateDrawDto,
  ) {
    return this.drawService.runDraw(adminId, dto);
  }

  @Get('winners')
  @ApiOperation({ summary: 'Get all winner information (Public)' })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getWinners(
    @Query('searchTerm') searchTerm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drawService.getWinners({ searchTerm, page, limit });
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all draws' })
  findAll(@Query() query: DrawQueryDto, @GetCurrentUser() user: any) {
    return this.drawService.findAll(query, user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single draw result' })
  findOne(@Param('id') id: string, @GetCurrentUser() user: any) {
    return this.drawService.findOne(id, user);
  }
}
