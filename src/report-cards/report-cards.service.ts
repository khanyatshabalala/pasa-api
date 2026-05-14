import {
  Injectable, ForbiddenException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '@prisma/client';
import {
  S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportCardsService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.bucket = config.get<string>('S3_BUCKET', 'pasa-report-cards');
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'af-south-1'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // ── School staff: upload report card ──────────────────────────────────
  async upload(
    schoolId: string,
    data: {
      learnerId: string;
      academicYear: number;
      term: number;
      fileName: string;
      fileBuffer: Buffer;
      mimeType: string;
      notes?: string;
    },
    user: any,
  ) {
    this.assertStaff(schoolId, user);

    if (data.mimeType !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (data.fileBuffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File must be under 10 MB');
    }

    // Verify learner belongs to school
    const learner = await this.prisma.learner.findFirst({
      where: { id: data.learnerId, schoolId },
    });
    if (!learner) throw new ForbiddenException('Learner does not belong to this school');

    const filePath = `${schoolId}/${data.learnerId}/${data.academicYear}_T${data.term}.pdf`;

    // Upload to S3
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: data.fileBuffer,
      ContentType: 'application/pdf',
    }));

    // Upsert DB record
    const record = await this.prisma.reportCard.upsert({
      where: { learnerId_academicYear_term: { learnerId: data.learnerId, academicYear: data.academicYear, term: data.term } },
      create: {
        learnerId: data.learnerId,
        schoolId,
        academicYear: data.academicYear,
        term: data.term,
        filePath,
        fileName: data.fileName,
        fileSize: data.fileBuffer.length,
        uploadedBy: user.id,
        notes: data.notes ?? null,
      },
      update: {
        filePath,
        fileName: data.fileName,
        fileSize: data.fileBuffer.length,
        uploadedBy: user.id,
        uploadedAt: new Date(),
        notes: data.notes ?? null,
      },
    });

    return record;
  }

  // ── School staff: list report cards for school ─────────────────────────
  async findBySchool(schoolId: string, user: any, filters: { year?: number; term?: number }) {
    this.assertStaff(schoolId, user);
    return this.prisma.reportCard.findMany({
      where: {
        schoolId,
        ...(filters.year && { academicYear: filters.year }),
        ...(filters.term && { term: filters.term }),
      },
      include: {
        learner: { select: { id: true, firstName: true, lastName: true, gradeId: true } },
      },
      orderBy: [{ uploadedAt: 'desc' }],
    });
  }

  // ── School staff: delete report card ──────────────────────────────────
  async delete(id: string, schoolId: string, user: any) {
    this.assertStaff(schoolId, user);
    const record = await this.prisma.reportCard.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Report card not found');
    if (record.schoolId !== schoolId) throw new ForbiddenException();

    // Delete from S3
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: record.filePath }));

    return this.prisma.reportCard.delete({ where: { id } });
  }

  // ── Parent: list report cards for linked children ──────────────────────
  async findForParent(parentId: string, filters: { year?: number; term?: number }) {
    const links = await this.prisma.parentLink.findMany({
      where: { parentUserId: parentId },
      select: { learnerId: true },
    });
    const ids = links.map((l) => l.learnerId);
    if (!ids.length) return [];

    return this.prisma.reportCard.findMany({
      where: {
        learnerId: { in: ids },
        ...(filters.year && { academicYear: filters.year }),
        ...(filters.term && { term: filters.term }),
      },
      include: {
        learner: {
          select: {
            id: true, firstName: true, lastName: true, gradeId: true,
            school: { select: { name: true } },
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { term: 'desc' }],
    });
  }

  // ── Parent: get signed download URL (60 second expiry) ────────────────
  async getSignedUrl(id: string, parentId: string) {
    const record = await this.prisma.reportCard.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Report card not found');

    // Verify parent is linked to this learner
    const link = await this.prisma.parentLink.findFirst({
      where: { parentUserId: parentId, learnerId: record.learnerId },
    });
    if (!link) throw new ForbiddenException('Access denied');

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: record.filePath }),
      { expiresIn: 60 },
    );

    return { url, fileName: record.fileName };
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
