import { Injectable } from '@nestjs/common';

import { PLAN_CATALOG } from '../domain/plan-catalog';

import { toPlanDto } from './billing.mapper';

import type { PlanDto } from '@dlv/shared-types';

/** Exposes the public plan catalogue (Phase 6). */
@Injectable()
export class PlanService {
  list(): PlanDto[] {
    return PLAN_CATALOG.map(toPlanDto);
  }
}
