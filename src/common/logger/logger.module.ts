import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { FULL_LOGS, IS_PRODUCTION, LOGGER_LEVEL } from '../../config/env.loader';
import type { Request, Response } from 'express';

const VALID_LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
type LogLevel = (typeof VALID_LOG_LEVELS)[number];

function resolveLoggerLevel(): LogLevel {
  if (LOGGER_LEVEL && VALID_LOG_LEVELS.includes(LOGGER_LEVEL as LogLevel)) {
    return LOGGER_LEVEL as LogLevel;
  }
  return IS_PRODUCTION ? 'info' : 'debug';
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: resolveLoggerLevel(),

        transport: !IS_PRODUCTION
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,

        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: FULL_LOGS
          ? undefined
          : {
              req(req: Request) {
                return {
                  method: req.method,
                  url: req.url,
                };
              },
              res(res: Response) {
                return {
                  statusCode: res.statusCode,
                };
              },
            },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
