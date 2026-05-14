import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private calendar: CalendarService) {}

  @Get('national')
  @ApiOperation({ summary: 'Get national SA calendar events' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  findNational(@Query('from') from: string, @Query('to') to: string) {
    return this.calendar.findNational(from, to);
  }

  @Get('combined')
  @ApiOperation({ summary: 'Get national + school events combined' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'schoolId', required: false })
  findCombined(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.calendar.findCombined(schoolId ?? null, from, to);
  }

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get school-specific events' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  findBySchool(
    @Param('schoolId') schoolId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.calendar.findBySchool(schoolId, from, to);
  }

  @Post('school/:schoolId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a school calendar event' })
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.calendar.create(schoolId, body, user);
  }

  @Put(':id/school/:schoolId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a school calendar event' })
  update(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.calendar.update(id, schoolId, body, user);
  }

  @Delete(':id/school/:schoolId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a school calendar event' })
  delete(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.calendar.delete(id, schoolId, user);
  }

  @Post('national/seed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed national calendar events (super_admin only)' })
  seedNational(@Body() body: { events: any[] }, @CurrentUser() user: any) {
    return this.calendar.seedNational(body.events, user);
  }
}
