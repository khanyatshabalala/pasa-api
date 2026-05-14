import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole, AttendanceStatus } from '@prisma/client';

export interface AttendanceEntry {
  learnerId: string;
  status: AttendanceStatus;
  notes?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ── School staff: get attendance for a school on a date ────────────────
  async findBySchoolDate(schoolId: string, date: string, user: any) {
    this.assertStaff(schoolId, user);
    return this.prisma.attendance.findMany({
      where: {
        date: new Date(date),
        learner: { schoolId },
      },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true, gradeId: true } },
      },
      orderBy: { learner: { lastName: 'asc' } },
    });
  }

  // ── School staff: bulk submit attendance for a date ────────────────────
  async bulkUpsert(schoolId: string, date: string, entries: AttendanceEntry[], user: any) {
    this.assertStaff(schoolId, user);

    // Verify all learners belong to this school
    const learnerIds = entries.map((e) => e.learnerId);
    const learners = await this.prisma.learner.findMany({
      where: { id: { in: learnerIds }, schoolId },
      select: { id: true },
    });
    if (learners.length !== learnerIds.length) {
      throw new ForbiddenException('One or more learners do not belong to this school');
    }

    const dateObj = new Date(date);
    const ops = entries.map((entry) =>
      this.prisma.attendance.upsert({
        where: { learnerId_date: { learnerId: entry.learnerId, date: dateObj } },
        create: {
          learnerId: entry.learnerId,
          date: dateObj,
          status: entry.status,
          notes: entry.notes ?? null,
          recordedBy: user.id,
        },
        update: {
          status: entry.status,
          notes: entry.notes ?? null,
          recordedBy: user.id,
        },
      }),
    );

    await this.prisma.$transaction(ops);
    return { message: `Attendance saved for ${entries.length} learners` };
  }

  // ── Parent: get attendance for linked children ─────────────────────────
  async findForParent(parentId: string, learnerId?: string) {
    const links = await this.prisma.parentLink.findMany({
      where: {
        parentUserId: parentId,
        ...(learnerId && { learnerId }),
      },
      select: { learnerId: true },
    });

    const ids = links.map((l) => l.learnerId);
    if (!ids.length) return [];

    return this.prisma.attendance.findMany({
      where: { learnerId: { in: ids } },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private assertStaff(schoolId: string, user: any) {
    const staffRoles = [AppRole.teacher, AppRole.principal, AppRole.school_admin, AppRole.super_admin];
    const ok = user.roles.some(
      (r: any) => staffRoles.includes(r.role) &&
        (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('School staff access required');
  }
}
