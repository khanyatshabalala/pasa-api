import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { AppRole } from '@prisma/client';

// We store hashed passwords in a separate auth table
// (In production this would be your own auth.users table)
// For now we piggyback on profiles + a passwords table

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    // Check email not already taken
    const existing = await (this.prisma as any).authUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('An account with this email already exists');

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const id = crypto.randomUUID();

    // Create auth record + profile in a transaction
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).authUser.create({
        data: { id, email: dto.email.toLowerCase(), passwordHash: hashed },
      });
      await tx.profile.create({
        data: { id, fullName: dto.fullName },
      });
      // Default role: parent
      await tx.userRole.create({
        data: { userId: id, role: AppRole.parent },
      });
    });

    return { message: 'Account created. Please verify your email before signing in.' };
  }

  async signIn(dto: SignInDto) {
    const authUser = await (this.prisma as any).authUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!authUser) throw new UnauthorizedException('Incorrect email or password');

    const valid = await bcrypt.compare(dto.password, authUser.passwordHash);
    if (!valid) throw new UnauthorizedException('Incorrect email or password');

    const roles = await this.prisma.userRole.findMany({
      where: { userId: authUser.id },
      select: { role: true, schoolId: true },
    });

    const profile = await this.prisma.profile.findUnique({
      where: { id: authUser.id },
      select: { fullName: true, subscriptionTier: true },
    });

    const token = this.jwt.sign({
      sub: authUser.id,
      email: authUser.email,
      roles: roles.map((r) => r.role),
    });

    return {
      accessToken: token,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: profile?.fullName,
        subscriptionTier: profile?.subscriptionTier,
        roles,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const authUser = await (this.prisma as any).authUser.findUnique({
      where: { id: userId },
    });
    if (!authUser) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, authUser.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await (this.prisma as any).authUser.update({
      where: { id: userId },
      data: { passwordHash: hashed },
    });

    return { message: 'Password updated successfully' };
  }

  async me(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: { roles: { select: { role: true, schoolId: true } } },
    });
    if (!profile) throw new UnauthorizedException();
    return profile;
  }
}
