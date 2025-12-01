import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Request, Response } from 'express';
import { IS_PRODUCTION } from '../../config/env.loader';

type RequestWithIds = Request & { id?: string; requestId?: string };

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithIds>();
    const res = ctx.getResponse<Response>();

    const { method, url } = req;

    // Tratamos de obtener algún requestId si existe
    const requestId = req.id ?? req.requestId ?? (req.headers['x-request-id'] as string | undefined);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, string | string[]>;
        message = r.message ?? r.error ?? JSON.stringify(r);
      }
    }

    let clientMessage: string | string[] = message;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR && IS_PRODUCTION) {
      clientMessage = 'Internal server error';
    }

    const logPayload: Record<string, unknown> = {
      status,
      method,
      url,
      requestId,
    };

    if (exception instanceof Error) {
      logPayload.name = exception.name;
      logPayload.message = exception.message;
      logPayload.stack = exception.stack;
    } else {
      logPayload.exception = exception;
    }

    this.logger.error(logPayload, 'Unhandled exception');

    res.status(status).json({
      statusCode: status,
      message: clientMessage,
      path: url,
      method,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
