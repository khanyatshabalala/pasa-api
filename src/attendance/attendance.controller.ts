import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'Get attendance for a school on a specific date' })
  @ApiQuery({ name: 'date', description: 'YYYY-MM-DD', required: true })
  findBySchoolDate(
    @Param('schoolId') schoolId: string,
    @Query('date') date: string,
    @CurrentUser() user: any,
  ) {
    return this.attendance.findBySchoolDate(schoolId, date, user);
  }

  @Post('school/:schoolId')
  @ApiOperation({ summary: 'Bulk submit attendance for a school date' })
  bulkUpsert(
    @Param('schoolId') schoolId: string,
    @Body() body: { date: string; entries: any[] },
    @CurrentUser() user: any,
  ) {
    return this.attendance.bulkUpsert(schoolId, body.date, body.entries, user);
  }

  @Get('my-children')
  @ApiOperation({ summary: 'Get attendance for parent linked children' })
  @ApiQuery({ name: 'learnerId', required: false })
  findForParent(
    @CurrentUser() user: any,
    @Query('learnerId') learnerId?: string,
  ) {
    return this.attendance.findForParent(user.id, learnerId);
  }
}
