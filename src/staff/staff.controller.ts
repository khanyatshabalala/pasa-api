import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private staff: StaffService) {}

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'List all staff at a school' })
  findBySchool(@Param('schoolId') schoolId: string, @CurrentUser() user: any) {
    return this.staff.findBySchool(schoolId, user);
  }

  @Post('school/:schoolId')
  @ApiOperation({ summary: 'Create a staff account for a school' })
  createStaff(@Param('schoolId') schoolId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.staff.createStaffAccount(schoolId, body, user);
  }

  @Delete('roles/:roleId/school/:schoolId')
  @ApiOperation({ summary: 'Remove a staff role' })
  removeRole(
    @Param('roleId') roleId: string,
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.staff.removeRole(roleId, schoolId, user);
  }
}
