import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { SKIP_RESPONSE_WRAPPER_KEY } from '../decorators/skip-response-wrapper.decorator';

type RequestWithIds = Request & { id?: string; requestId?: string };

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipWrapper = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAPPER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipWrapper) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const req = ctx.getRequest<RequestWithIds>();
    const res = ctx.getResponse<Response>();

    const { method, url } = req;

    const requestId = req.id ?? req.requestId ?? (req.headers['x-request-id'] as string | undefined);

    return next.handle().pipe(
      map((data: unknown) => ({
        statusCode: res.statusCode,
        data,
        path: url,
        method,
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
