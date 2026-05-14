import { Module } from '@nestjs/common';
import { ExamTimetablesController } from './exam-timetables.controller';
import { ExamTimetablesService } from './exam-timetables.service';

@Module({
  controllers: [ExamTimetablesController],
  providers: [ExamTimetablesService],
})
export class ExamTimetablesModule {}
