import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/** Bootstrap the workers process (BullMQ consumers + health endpoint). */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();
  const port = Number(process.env.WORKERS_PORT ?? 4001);
  await app.listen(port);
  new Logger('Workers').log(`DLV workers listening on :${port}`);
}

void bootstrap();
