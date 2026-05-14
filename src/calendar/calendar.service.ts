import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  // ── Public: national SA calendar ───────────────────────────────────────
  async findNational(from: string, to: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        isNational: true,
        eventDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  // ── School events ──────────────────────────────────────────────────────
  async findBySchool(schoolId: string, from: string, to: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        schoolId,
        isNational: false,
        eventDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: [{ eventDate: 'asc' }],
    });
  }

  // ── Combined: national + school events for a month ────────────────────
  async findCombined(schoolId: string | null, from: string, to: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        OR: [
          { isNational: true },
          ...(schoolId ? [{ schoolId }] : []),
        ],
        eventDate: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  // ── School staff: create event ─────────────────────────────────────────
  async create(schoolId: string, data: {
    title: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    eventType?: string;
    classId?: string;
  }, user: any) {
    this.assertStaff(schoolId, user);
    return this.prisma.calendarEvent.create({
      data: {
        schoolId,
        classId: data.classId ?? null,
        title: data.title,
        description: data.description ?? null,
        eventDate: new Date(data.eventDate),
        eventTime: data.eventTime ?? null,
        eventType: data.eventType ?? null,
        isNational: false,
        createdBy: user.id,
      },
    });
  }

  // ── School staff: update event ─────────────────────────────────────────
  async update(id: string, schoolId: string, data: any, user: any) {
    this.assertStaff(schoolId, user);
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.schoolId !== schoolId) throw new ForbiddenException();
    return this.prisma.calendarEvent.update({ where: { id }, data });
  }

  // ── School staff: delete event ─────────────────────────────────────────
  async delete(id: string, schoolId: string, user: any) {
    this.assertStaff(schoolId, user);
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.schoolId !== schoolId) throw new ForbiddenException();
    return this.prisma.calendarEvent.delete({ where: { id } });
  }

  // ── Super admin: seed national calendar ───────────────────────────────
  async seedNational(events: any[], user: any) {
    const isSuperAdmin = user.roles.some((r: any) => r.role === AppRole.super_admin);
    if (!isSuperAdmin) throw new ForbiddenException('Super admin only');
    const ops = events.map((e) =>
      this.prisma.calendarEvent.create({
        data: {
          title: e.title,
          description: e.description ?? null,
          eventDate: new Date(e.eventDate),
          eventType: e.eventType ?? null,
          isNational: true,
        },
      }),
    );
    await this.prisma.$transaction(ops);
    return { message: `${events.length} national events seeded` };
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
