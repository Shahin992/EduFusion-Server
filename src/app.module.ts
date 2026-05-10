import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutesModule } from './modules/institutes/institutes.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { LandingModule } from './modules/landing/landing.module';
import { UploadModule } from './modules/upload/upload.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ExamsModule } from './modules/exams/exams.module';
import { MarksModule } from './modules/marks/marks.module';
import { AiLabModule } from './modules/ai-lab/ai-lab.module';
import { ResultsModule } from './modules/results/results.module';
import { FeesModule } from './modules/fees/fees.module';
import { SalariesModule } from './modules/salaries/salaries.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...configService.get('database.options'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log(`====> Connected to DB: ${connection.name}`);
          });
          connection.on('error', (err) => {
            console.error(`====> DB Connection Error: ${err}`);
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    InstitutesModule,
    AcademicsModule,
    LandingModule,
    UploadModule,
    StudentsModule,
    TeachersModule,
    ExamsModule,
    MarksModule,
    AiLabModule,
    ResultsModule,
    FeesModule,
    SalariesModule,
    AnalyticsModule,
    SuperAdminModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
