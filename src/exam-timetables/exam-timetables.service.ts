import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '@prisma/client';

@Injectable()
export class ExamTimetablesService {
  constructor(private prisma: PrismaService) {}

  async findBySchool(schoolId: string, filters: { term?: number; year?: number }) {
    return this.prisma.examTimetable.findMany({
      where: {
        schoolId,
        ...(filters.term && { term: filters.term }),
        ...(filters.year && { academicYear: filters.year }),
      },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(schoolId: string, data: {
    subject: string;
    gradeId?: number;
    examDate: string;
    startTime?: string;
    endTime?: string;
    venue?: string;
    notes?: string;
    term: number;
    academicYear: number;
  }, user: any) {
    this.assertManager(schoolId, user);
    return this.prisma.examTimetable.create({
      data: {
        schoolId,
        subject: data.subject,
        gradeId: data.gradeId ?? null,
        examDate: new Date(data.examDate),
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        venue: data.venue ?? null,
        notes: data.notes ?? null,
        term: data.term,
        academicYear: data.academicYear,
        createdBy: user.id,
      },
    });
  }

  async delete(id: string, schoolId: string, user: any) {
    this.assertManager(schoolId, user);
    const exam = await this.prisma.examTimetable.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.schoolId !== schoolId) throw new ForbiddenException();
    return this.prisma.examTimetable.delete({ where: { id } });
  }

  private assertManager(schoolId: string, user: any) {
    const ok = user.roles.some(
      (r: any) =>
        [AppRole.principal, AppRole.school_admin, AppRole.super_admin].includes(r.role) &&
        (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('Principal or school admin access required');
  }
}
