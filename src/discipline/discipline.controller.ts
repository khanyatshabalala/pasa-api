import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DisciplineService } from './discipline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('discipline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discipline')
export class DisciplineController {
  constructor(private discipline: DisciplineService) {}

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'List discipline records for a school' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  findBySchool(
    @Param('schoolId') schoolId: string,
    @Query('type') type: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser() user: any,
  ) {
    return this.discipline.findBySchool(schoolId, user, { type, dateFrom, dateTo });
  }

  @Post('school/:schoolId')
  @ApiOperation({ summary: 'Log a discipline record' })
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.discipline.create(schoolId, body, user);
  }

  @Delete(':id/school/:schoolId')
  @ApiOperation({ summary: 'Delete a discipline record' })
  delete(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.discipline.delete(id, schoolId, user);
  }

  @Get('my-children')
  @ApiOperation({ summary: 'Get discipline records for parent linked children' })
  @ApiQuery({ name: 'learnerId', required: false })
  findForParent(
    @CurrentUser() user: any,
    @Query('learnerId') learnerId?: string,
  ) {
    return this.discipline.findForParent(user.id, learnerId);
  }
}
