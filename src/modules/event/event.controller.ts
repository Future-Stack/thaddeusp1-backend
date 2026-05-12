import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';

@ApiTags('Events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new event (Admin only)' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  findAll() {
    return this.eventService.findAll();
  }

  @Get('running')
  @ApiOperation({ summary: 'Get the currently running event' })
  getRunningEvent() {
    return this.eventService.getRunningEvent();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event' })
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an event (Admin only)' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an event (Admin only)' })
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Get(':id/admin/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get stats for a single event (Admin only)' })
  getEventStats(@Param('id') id: string) {
    return this.eventService.getEventStats(id);
  }

  @Get(':id/admin/users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get list of users who purchased tickets for an event (Admin only)' })
  @ApiQuery({ name: 'searchTerm', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getEventPurchasedUsers(
    @Param('id') id: string,
    @Query('searchTerm') searchTerm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventService.getEventPurchasedUsers(id, { searchTerm, page, limit });
  }
}
