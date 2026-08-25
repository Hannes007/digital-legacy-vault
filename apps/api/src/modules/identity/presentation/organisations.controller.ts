import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';


import { extractRequestContext } from '../../../common/http/request-context';
import {
  OrganisationService,
  type OrgMemberDto,
  type OrganisationDto,
} from '../application/organisation.service';

import { CurrentUser } from './current-user.decorator';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Action } from '../../authorization/ability.factory';
import { CheckPolicies } from '../../authorization/check-policies.decorator';
import { PoliciesGuard } from '../../authorization/policies.guard';

import type { AuthUser } from './authenticated-request';
import type { Request } from 'express';

/**
 * Organisation management (`/api/v1/organisations`). Every route is
 * bearer-authenticated; membership/admin checks live in the service.
 */
@Controller('organisations')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OrganisationsController {
  constructor(private readonly orgs: OrganisationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPolicies((ability) => ability.can(Action.Create, 'Organisation'))
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrganisationDto,
    @Req() req: Request,
  ): Promise<OrganisationDto> {
    return this.orgs.create(user.userId, dto, extractRequestContext(req).ipMasked);
  }

  @Get()
  async listMine(@CurrentUser() user: AuthUser): Promise<OrganisationDto[]> {
    return this.orgs.listMine(user.userId);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<OrganisationDto> {
    return this.orgs.get(user.userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationDto,
    @Req() req: Request,
  ): Promise<OrganisationDto> {
    return this.orgs.update(user.userId, id, dto, extractRequestContext(req).ipMasked);
  }

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: Request,
  ): Promise<OrgMemberDto> {
    return this.orgs.invite(
      user.userId,
      id,
      { email: dto.email, role: dto.role ?? 'MEMBER' },
      extractRequestContext(req).ipMasked,
    );
  }

  @Post(':id/invitations/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.orgs.acceptInvite(user.userId, id, extractRequestContext(req).ipMasked);
  }

  @Get(':id/members')
  async listMembers(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<OrgMemberDto[]> {
    return this.orgs.listMembers(user.userId, id);
  }

  @Patch(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMemberRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.orgs.changeMemberRole(
      user.userId,
      id,
      targetUserId,
      dto.role,
      extractRequestContext(req).ipMasked,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.orgs.removeMember(user.userId, id, targetUserId, extractRequestContext(req).ipMasked);
  }
}
