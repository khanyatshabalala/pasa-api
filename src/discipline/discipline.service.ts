import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole, DisciplineType } from '@prisma/client';

@Injectable()
export class DisciplineService {
  constructor(private prisma: PrismaService) {}

  // ── School staff: list records for school ─────────────────────────────
  async findBySchool(
    schoolId: string,
    user: any,
    filters: { type?: DisciplineType; dateFrom?: string; dateTo?: string; search?: string },
  ) {
    this.assertStaff(schoolId, user);

    const learners = await this.prisma.learner.findMany({
      where: { schoolId },
      select: { id: true },
    });
    const ids = learners.map((l) => l.id);
    if (!ids.length) return [];

    return this.prisma.disciplineRecord.findMany({
      where: {
        learnerId: { in: ids },
        ...(filters.type && { type: filters.type }),
        ...(filters.dateFrom && { date: { gte: new Date(filters.dateFrom) } }),
        ...(filters.dateTo && { date: { lte: new Date(filters.dateTo) } }),
      },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true, gradeId: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  // ── School staff: create record ────────────────────────────────────────
  async create(schoolId: string, data: {
    learnerId: string;
    type: DisciplineType;
    title: string;
    description?: string;
    points?: number;
    date?: string;
  }, user: any) {
    this.assertStaff(schoolId, user);

    // Verify learner belongs to this school
    const learner = await this.prisma.learner.findFirst({
      where: { id: data.learnerId, schoolId },
    });
    if (!learner) throw new ForbiddenException('Learner does not belong to this school');

    return this.prisma.disciplineRecord.create({
      data: {
        learnerId: data.learnerId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        points: data.points ?? null,
        date: data.date ? new Date(data.date) : new Date(),
        recordedBy: user.id,
      },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ── School staff: delete record ────────────────────────────────────────
  async delete(id: string, schoolId: string, user: any) {
    const record = await this.prisma.disciplineRecord.findUnique({
      where: { id },
      include: { learner: { select: { schoolId: true } } },
    });
    if (!record) throw new NotFoundException('Record not found');
    if (record.learner.schoolId !== schoolId) throw new ForbiddenException();

    // Only the recorder, principal, school_admin, or super_admin can delete
    const canDelete =
      record.recordedBy === user.id ||
      user.roles.some((r: any) =>
        [AppRole.principal, AppRole.school_admin, AppRole.super_admin].includes(r.role),
      );
    if (!canDelete) throw new ForbiddenException('You cannot delete this record');

    return this.prisma.disciplineRecord.delete({ where: { id } });
  }

  // ── Parent: get discipline for linked children ─────────────────────────
  async findForParent(parentId: string, learnerId?: string) {
    const links = await this.prisma.parentLink.findMany({
      where: { parentUserId: parentId, ...(learnerId && { learnerId }) },
      select: { learnerId: true },
    });
    const ids = links.map((l) => l.learnerId);
    if (!ids.length) return [];

    return this.prisma.disciplineRecord.findMany({
      where: { learnerId: { in: ids } },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  private assertStaff(schoolId: string, user: any) {
    const staffRoles = [AppRole.teacher, AppRole.principal, AppRole.school_admin, AppRole.super_admin];
    const ok = user.roles.some(
      (r: any) => staffRoles.includes(r.role) &&
        (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('School staff access required');
  }
}
