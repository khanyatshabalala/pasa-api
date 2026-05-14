import {
  Injectable, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const STAFF_ROLES = [AppRole.teacher, AppRole.principal, AppRole.school_admin];

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findBySchool(schoolId: string, user: any) {
    this.assertManager(schoolId, user);

    const roles = await this.prisma.userRole.findMany({
      where: { schoolId, role: { in: STAFF_ROLES } },
      include: { profile: { select: { id: true, fullName: true, createdAt: true } } },
    });

    // Group by user
    const byUser = new Map<string, any>();
    for (const r of roles) {
      if (!byUser.has(r.userId)) {
        byUser.set(r.userId, { ...r.profile, roles: [] });
      }
      byUser.get(r.userId).roles.push({ id: r.id, role: r.role });
    }

    return [...byUser.values()];
  }

  async createStaffAccount(schoolId: string, data: {
    fullName: string;
    email: string;
    password: string;
    role: AppRole;
  }, user: any) {
    this.assertManager(schoolId, user);

    // Only principal can create school_admin; both can create teacher
    if (data.role === AppRole.school_admin) {
      const isPrincipalOrSuper = user.roles.some(
        (r: any) => [AppRole.principal, AppRole.super_admin].includes(r.role),
      );
      if (!isPrincipalOrSuper) {
        throw new ForbiddenException('Only principals can create school admin accounts');
      }
    }

    const existing = await this.prisma.authUser.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('An account with this email already exists');

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const id = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.authUser.create({
        data: { id, email: data.email.toLowerCase(), passwordHash: hashed },
      });
      await tx.profile.create({
        data: { id, fullName: data.fullName },
      });
      await tx.userRole.create({
        data: { userId: id, role: data.role, schoolId },
      });
    });

    return { message: `Account created for ${data.fullName}` };
  }

  async removeRole(roleId: string, schoolId: string, user: any) {
    this.assertManager(schoolId, user);
    return this.prisma.userRole.delete({ where: { id: roleId } });
  }

  private assertManager(schoolId: string, user: any) {
    const ok = user.roles.some(
      (r: any) =>
        [AppRole.principal, AppRole.school_admin, AppRole.super_admin].includes(r.role) &&
        (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('Only principals and school admins can manage staff');
  }
}
