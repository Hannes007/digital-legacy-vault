import { Controller, Get } from '@nestjs/common';

/** Liveness/readiness for the workers Deployment (matches Helm probes). */
@Controller('health')
export class HealthController {
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { status: string } {
    return { status: 'ok' };
  }
}
