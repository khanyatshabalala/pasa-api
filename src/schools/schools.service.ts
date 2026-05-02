import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole, SaProvince } from '@prisma/client';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { province?: string; districtId?: string; search?: string }) {
    return this.prisma.school.findMany({
      where: {
        ...(filters.province && { province: filters.province as SaProvince }),
        ...(filters.districtId && { districtId: filters.districtId }),
        ...(filters.search && {
          name: { contains: filters.search, mode: 'insensitive' },
        }),
      },
      include: { districtRel: { select: { name: true } } },
      orderBy: { performanceAvg: { sort: 'desc', nulls: 'last' } },
      take: 100,
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { districtRel: { select: { name: true } } },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async create(data: any, actorId: string) {
    return this.prisma.school.create({ data });
  }

  async update(id: string, data: any, user: any) {
    await this.assertSchoolAccess(id, user);
    return this.prisma.school.update({ where: { id }, data });
  }

  async updateAdmissions(id: string, data: any, user: any) {
    await this.assertSchoolAccess(id, user);
    return this.prisma.school.update({
      where: { id },
      data: {
        gradeFrom: data.gradeFrom,
        gradeTo: data.gradeTo,
        applicationOpen: data.applicationOpen || null,
        applicationClose: data.applicationClose || null,
        admissionRequirements: data.admissionRequirements || null,
        applicationContact: data.applicationContact || null,
      },
    });
  }

  // ── Districts ──────────────────────────────────────────────────────────

  async findDistricts(province?: string) {
    return this.prisma.district.findMany({
      where: province ? { province: province as SaProvince } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createDistrict(data: any) {
    return this.prisma.district.create({ data });
  }

  async updateDistrict(id: string, data: any) {
    return this.prisma.district.update({ where: { id }, data });
  }

  async deleteDistrict(id: string) {
    return this.prisma.district.delete({ where: { id } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async assertSchoolAccess(schoolId: string, user: any) {
    const isSuperAdmin = user.roles.some((r: any) => r.role === AppRole.super_admin);
    if (isSuperAdmin) return;

    const hasRole = user.roles.some(
      (r: any) =>
        r.schoolId === schoolId &&
        [AppRole.principal, AppRole.school_admin].includes(r.role),
    );
    if (!hasRole) throw new ForbiddenException('You do not have access to this school');
  }
}
