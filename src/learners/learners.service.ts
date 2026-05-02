import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole, LinkRequestStatus } from '@prisma/client';

@Injectable()
export class LearnersService {
  constructor(private prisma: PrismaService) {}

  // ── School staff: list learners ────────────────────────────────────────

  async findBySchool(schoolId: string, user: any) {
    this.assertSchoolStaff(schoolId, user);
    return this.prisma.learner.findMany({
      where: { schoolId },
      include: { grade: true },
      orderBy: { lastName: 'asc' },
    });
  }

  // ── Parent: list linked children ───────────────────────────────────────

  async findLinkedChildren(parentId: string) {
    return this.prisma.parentLink.findMany({
      where: { parentUserId: parentId },
      include: {
        learner: {
          include: {
            grade: true,
            school: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  // ── Parent: submit link request ────────────────────────────────────────

  async submitLinkRequest(parentId: string, data: {
    schoolId: string;
    firstName: string;
    lastName: string;
    learnerNumber: string;
    relationship: string;
  }) {
    // Check free tier limit
    const existingLinks = await this.prisma.parentLink.count({
      where: { parentUserId: parentId },
    });
    const profile = await this.prisma.profile.findUnique({
      where: { id: parentId },
      select: { subscriptionTier: true },
    });
    if (profile?.subscriptionTier === 'free' && existingLinks >= 1) {
      throw new ForbiddenException('Free accounts can link 1 child. Upgrade to Premium for unlimited.');
    }

    return this.prisma.parentLinkRequest.create({
      data: {
        parentUserId: parentId,
        schoolId: data.schoolId,
        firstName: data.firstName,
        lastName: data.lastName,
        learnerNumber: data.learnerNumber,
        relationship: data.relationship,
      },
    });
  }

  // ── Parent: list own link requests ────────────────────────────────────

  async findLinkRequests(parentId: string) {
    return this.prisma.parentLinkRequest.findMany({
      where: { parentUserId: parentId },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── School staff: list pending requests ───────────────────────────────

  async findPendingRequests(schoolId: string, user: any) {
    this.assertSchoolManager(schoolId, user);
    return this.prisma.parentLinkRequest.findMany({
      where: { schoolId, status: LinkRequestStatus.pending },
      include: {
        // Include parent profile name
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── School staff: approve request ─────────────────────────────────────

  async approveRequest(requestId: string, reviewerId: string, user: any) {
    const request = await this.prisma.parentLinkRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    this.assertSchoolManager(request.schoolId, user);

    // Find learner by number in this school
    const learner = await this.prisma.learner.findFirst({
      where: {
        schoolId: request.schoolId,
        learnerNumber: request.learnerNumber,
        firstName: { equals: request.firstName, mode: 'insensitive' },
        lastName: { equals: request.lastName, mode: 'insensitive' },
      },
    });
    if (!learner) {
      throw new BadRequestException(
        'No learner found matching that name and learner number at this school.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.parentLinkRequest.update({
        where: { id: requestId },
        data: {
          status: LinkRequestStatus.approved,
          learnerId: learner.id,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.parentLink.upsert({
        where: {
          parentUserId_learnerId: {
            parentUserId: request.parentUserId,
            learnerId: learner.id,
          },
        },
        create: {
          parentUserId: request.parentUserId,
          learnerId: learner.id,
          relationship: request.relationship,
          isPrimary: true,
        },
        update: {},
      }),
    ]);

    return { message: 'Request approved' };
  }

  // ── School staff: reject request ──────────────────────────────────────

  async rejectRequest(requestId: string, reviewerId: string, reason: string | undefined, user: any) {
    const request = await this.prisma.parentLinkRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    this.assertSchoolManager(request.schoolId, user);

    await this.prisma.parentLinkRequest.update({
      where: { id: requestId },
      data: {
        status: LinkRequestStatus.rejected,
        rejectionReason: reason || null,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    return { message: 'Request rejected' };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private assertSchoolStaff(schoolId: string, user: any) {
    const staffRoles = [AppRole.teacher, AppRole.principal, AppRole.school_admin, AppRole.super_admin];
    const ok = user.roles.some(
      (r: any) => staffRoles.includes(r.role) && (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('Access denied');
  }

  private assertSchoolManager(schoolId: string, user: any) {
    const managerRoles = [AppRole.principal, AppRole.school_admin, AppRole.super_admin];
    const ok = user.roles.some(
      (r: any) => managerRoles.includes(r.role) && (r.schoolId === schoolId || r.role === AppRole.super_admin),
    );
    if (!ok) throw new ForbiddenException('Only principals and school admins can manage requests');
  }
}
