import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppValidationPipe } from './common/pipes/app-validation.pipe';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RATE_LIMIT_TTL, RATE_LIMIT_LIMIT } from './config/env.loader';
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_TTL,
        limit: RATE_LIMIT_LIMIT,
      },
    ]),
    AppLoggerModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_PIPE,
      useClass: AppValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
