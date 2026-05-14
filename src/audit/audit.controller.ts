import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Read audit logs (super_admin or principal for their school)' })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findLogs(
    @CurrentUser() user: any,
    @Query('schoolId') schoolId?: string,
    @Query('entity') entity?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.findLogs(user, {
      schoolId,
      entity,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
