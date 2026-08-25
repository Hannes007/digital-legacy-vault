import { EmergencyScope } from '@dlv/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { ClientRelationshipService } from '../application/client-relationship.service';
import { OrgAdminService } from '../application/org-admin.service';

import {
  CreateClientRelationshipDto,
  RespondClientRelationshipDto,
  UpdateResidencyDto,
} from './dto/organisation.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { ClientRelationshipDto, OrgUsageDto, ResidencyDto } from '@dlv/shared-types';

/** Organisation workspace API (Phase 8): client relationships, usage, residency. */
@Controller()
@UseGuards(JwtAuthGuard)
export class OrganisationWorkspaceController {
  constructor(
    private readonly relationships: ClientRelationshipService,
    private readonly admin: OrgAdminService,
  ) {}

  // --- org side ---------------------------------------------------------------
  @Post('organisations/:orgId/clients')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestClientAccess(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() body: CreateClientRelationshipDto,
  ): Promise<{ status: string }> {
    await this.relationships.request(
      orgId,
      user.userId,
      body.clientEmail,
      body.scope ?? EmergencyScope.FULL,
      body.categoryIds ?? [],
    );
    // Identical response whether or not the client account exists (no enumeration).
    return { status: 'requested' };
  }

  @Get('organisations/:orgId/clients')
  listOrgClients(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<ClientRelationshipDto[]> {
    return this.relationships.listForOrg(orgId, user.userId);
  }

  @Delete('organisations/:orgId/clients/:relationshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeFromOrg(
    @CurrentUser() user: AuthUser,
    @Param('relationshipId', ParseUUIDPipe) relationshipId: string,
  ): Promise<void> {
    await this.relationships.revoke(relationshipId, user.userId);
  }

  @Get('organisations/:orgId/usage')
  usage(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<OrgUsageDto> {
    return this.admin.usage(orgId, user.userId);
  }

  @Get('organisations/:orgId/residency')
  residency(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<ResidencyDto> {
    return this.admin.residency(orgId, user.userId);
  }

  @Put('organisations/:orgId/residency')
  updateResidency(
    @CurrentUser() user: AuthUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() body: UpdateResidencyDto,
  ): Promise<ResidencyDto> {
    return this.admin.updateResidency(orgId, user.userId, body.dataRegion);
  }

  // --- client side --------------------------------------------------------------
  @Get('me/professional-access')
  myProfessionalAccess(@CurrentUser() user: AuthUser): Promise<ClientRelationshipDto[]> {
    return this.relationships.listForClient(user.userId);
  }

  @Post('me/professional-access/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RespondClientRelationshipDto,
  ): Promise<void> {
    await this.relationships.respond(id, user.userId, true, body.scope, body.categoryIds);
  }

  @Post('me/professional-access/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  async decline(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.relationships.respond(id, user.userId, false);
  }

  @Delete('me/professional-access/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeMine(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.relationships.revoke(id, user.userId);
  }
}
