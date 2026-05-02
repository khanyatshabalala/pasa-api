import {
  Controller, Get, Post, Put, Param, Body,
  Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppRole } from '@prisma/client';

@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private schools: SchoolsService) {}

  // ── Public endpoints ───────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List schools with optional filters' })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'districtId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('province') province?: string,
    @Query('districtId') districtId?: string,
    @Query('search') search?: string,
  ) {
    return this.schools.findAll({ province, districtId, search });
  }

  @Get('districts')
  @ApiOperation({ summary: 'List districts, optionally filtered by province' })
  @ApiQuery({ name: 'province', required: false })
  findDistricts(@Query('province') province?: string) {
    return this.schools.findDistricts(province);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single school by ID' })
  findOne(@Param('id') id: string) {
    return this.schools.findOne(id);
  }

  // ── Authenticated endpoints ────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a school (super_admin only)' })
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.schools.create(body, user.id);
  }

  @Put(':id/admissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.super_admin, AppRole.principal, AppRole.school_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admissions info for a school' })
  updateAdmissions(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.schools.updateAdmissions(id, body, user);
  }

  // ── Districts (admin only) ─────────────────────────────────────────────

  @Post('districts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.super_admin)
  @ApiBearerAuth()
  createDistrict(@Body() body: any) {
    return this.schools.createDistrict(body);
  }

  @Put('districts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.super_admin)
  @ApiBearerAuth()
  updateDistrict(@Param('id') id: string, @Body() body: any) {
    return this.schools.updateDistrict(id, body);
  }
}
