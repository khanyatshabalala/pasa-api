import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExamTimetablesService } from './exam-timetables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('exam-timetables')
@Controller('exam-timetables')
export class ExamTimetablesController {
  constructor(private exams: ExamTimetablesService) {}

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'List exam timetable for a school' })
  @ApiQuery({ name: 'term', required: false })
  @ApiQuery({ name: 'year', required: false })
  findBySchool(
    @Param('schoolId') schoolId: string,
    @Query('term') term: string,
    @Query('year') year: string,
  ) {
    return this.exams.findBySchool(schoolId, {
      term: term ? parseInt(term) : undefined,
      year: year ? parseInt(year) : undefined,
    });
  }

  @Post('school/:schoolId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an exam to the timetable' })
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.exams.create(schoolId, body, user);
  }

  @Delete(':id/school/:schoolId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an exam from the timetable' })
  delete(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.exams.delete(id, schoolId, user);
  }
}
