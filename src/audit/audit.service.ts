import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Write an audit log entry. Call this from other services on sensitive actions. */
  async log(data: {
    actorUserId?: string;
    schoolId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  /** Super admin: read audit logs for a school or globally */
  async findLogs(
    user: any,
    filters: { schoolId?: string; entity?: string; limit?: number },
  ) {
    const isSuperAdmin = user.roles.some((r: any) => r.role === AppRole.super_admin);
    const isPrincipal = user.roles.some((r: any) =>
      [AppRole.principal, AppRole.school_admin].includes(r.role) &&
      r.schoolId === filters.schoolId,
    );

    if (!isSuperAdmin && !isPrincipal) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.schoolId && { schoolId: filters.schoolId }),
        ...(filters.entity && { entity: filters.entity }),
        // Non-super-admins can only see their own school
        ...(!isSuperAdmin && filters.schoolId
          ? { schoolId: filters.schoolId }
          : {}),
      },
      include: {
        actor: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 100,
    });
  }
}
