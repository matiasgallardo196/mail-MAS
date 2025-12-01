import { Controller, Get } from '@nestjs/common';
import { SkipResponseWrapper } from '../../common/decorators/skip-response-wrapper.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @SkipResponseWrapper()
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
