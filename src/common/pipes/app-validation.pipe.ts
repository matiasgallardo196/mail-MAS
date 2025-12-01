import { Injectable, ValidationPipe } from '@nestjs/common';
import { IS_PRODUCTION } from '../../config/env.loader';

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      forbidNonWhitelisted: IS_PRODUCTION,
      disableErrorMessages: IS_PRODUCTION,
    });
  }
}
