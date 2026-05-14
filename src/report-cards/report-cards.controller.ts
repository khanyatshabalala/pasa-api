import {
  Controller, Get, Post, Delete, Param, Body,
  Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ReportCardsService } from './report-cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('report-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('report-cards')
export class ReportCardsController {
  constructor(private reportCards: ReportCardsService) {}

  // ── School staff ───────────────────────────────────────────────────────

  @Get('school/:schoolId')
  @ApiOperation({ summary: 'List report cards for a school' })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'term', required: false })
  findBySchool(
    @Param('schoolId') schoolId: string,
    @Query('year') year: string,
    @Query('term') term: string,
    @CurrentUser() user: any,
  ) {
    return this.reportCards.findBySchool(schoolId, user, {
      year: year ? parseInt(year) : undefined,
      term: term ? parseInt(term) : undefined,
    });
  }

  @Post('school/:schoolId/upload')
  @ApiOperation({ summary: 'Upload a PDF report card' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('schoolId') schoolId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { learnerId: string; academicYear: string; term: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.reportCards.upload(schoolId, {
      learnerId: body.learnerId,
      academicYear: parseInt(body.academicYear),
      term: parseInt(body.term),
      fileName: file.originalname,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      notes: body.notes,
    }, user);
  }

  @Delete(':id/school/:schoolId')
  @ApiOperation({ summary: 'Delete a report card' })
  delete(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportCards.delete(id, schoolId, user);
  }

  // ── Parent ─────────────────────────────────────────────────────────────

  @Get('my-children')
  @ApiOperation({ summary: 'List report cards for parent linked children' })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'term', required: false })
  findForParent(
    @CurrentUser() user: any,
    @Query('year') year: string,
    @Query('term') term: string,
  ) {
    return this.reportCards.findForParent(user.id, {
      year: year ? parseInt(year) : undefined,
      term: term ? parseInt(term) : undefined,
    });
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get a signed download URL for a report card (parent only)' })
  getSignedUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reportCards.getSignedUrl(id, user.id);
  }
}
