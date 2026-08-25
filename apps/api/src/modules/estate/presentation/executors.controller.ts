import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import type { ExecutorDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ExecutorService } from '../application/executor.service';
import { CreateExecutorDto } from './dto/estate.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('executors')
@UseGuards(JwtAuthGuard)
export class ExecutorsController {
  constructor(private readonly executors: ExecutorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExecutorDto): Promise<ExecutorDto> {
    return this.executors.add(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ExecutorDto[]> {
    return this.executors.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.executors.remove(user.userId, id);
  }
}
