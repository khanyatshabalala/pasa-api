import {
  Controller, Get, Post, Put, Param, Body,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LearnersService } from './learners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('learners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learners')
export class LearnersController {
  constructor(private learners: LearnersService) {}

  // ── School staff ───────────────────────────────────────────────────────

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'List all learners at a school (staff only)' })
  findBySchool(@Param('schoolId') schoolId: string, @CurrentUser() user: any) {
    return this.learners.findBySchool(schoolId, user);
  }

  @Get('school/:schoolId/requests')
  @ApiOperation({ summary: 'List pending parent link requests (managers only)' })
  findPendingRequests(@Param('schoolId') schoolId: string, @CurrentUser() user: any) {
    return this.learners.findPendingRequests(schoolId, user);
  }

  @Put('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a parent link request' })
  approveRequest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.learners.approveRequest(id, user.id, user);
  }

  @Put('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a parent link request' })
  rejectRequest(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.learners.rejectRequest(id, user.id, reason, user);
  }

  // ── Parent ─────────────────────────────────────────────────────────────

  @Get('my-children')
  @ApiOperation({ summary: 'Get all children linked to the current parent' })
  findLinkedChildren(@CurrentUser() user: any) {
    return this.learners.findLinkedChildren(user.id);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get all link requests submitted by the current parent' })
  findLinkRequests(@CurrentUser() user: any) {
    return this.learners.findLinkRequests(user.id);
  }

  @Post('link-request')
  @ApiOperation({ summary: 'Submit a request to link a child' })
  submitLinkRequest(@Body() body: any, @CurrentUser() user: any) {
    return this.learners.submitLinkRequest(user.id, body);
  }
}
