import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { LearnersModule } from './learners/learners.module';
import { StaffModule } from './staff/staff.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DisciplineModule } from './discipline/discipline.module';
import { ReportCardsModule } from './report-cards/report-cards.module';
import { CalendarModule } from './calendar/calendar.module';
import { ExamTimetablesModule } from './exam-timetables/exam-timetables.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SchoolsModule,
    LearnersModule,
    StaffModule,
    NotificationsModule,
    AttendanceModule,
    DisciplineModule,
    ReportCardsModule,
    CalendarModule,
    ExamTimetablesModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}
