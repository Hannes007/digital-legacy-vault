import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type {
  DocumentDto,
  DocumentSearchResult,
  DocumentVersionDto,
  TimelineEntryDto,
  UploadInitResponse,
} from '@dlv/shared-types';
import type { DocumentStatus } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { DocumentService } from '../application/document.service';
import { SearchService } from '../application/search.service';
import { TimelineService } from '../application/timeline.service';
import { UploadService } from '../application/upload.service';
import { AddTagDto, SetCategoryDto } from './dto/document-mutations.dto';
import { UploadCompleteDto, UploadInitDto } from './dto/upload.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

/** Vault documents (`/api/v1/documents`). All routes bearer-authenticated. */
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly uploads: UploadService,
    private readonly documents: DocumentService,
    private readonly search: SearchService,
    private readonly timeline: TimelineService,
  ) {}

  @Post('uploads')
  @HttpCode(HttpStatus.CREATED)
  initUpload(@CurrentUser() user: AuthUser, @Body() dto: UploadInitDto): Promise<UploadInitResponse> {
    return this.uploads.initUpload(user.userId, dto);
  }

  @Post('uploads/complete')
  completeUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadCompleteDto,
  ): Promise<{ documentId: string; status: DocumentStatus }> {
    return this.uploads.completeUpload(user.userId, dto);
  }

  // Declared before ':id' so the literal path wins.
  @Get('search')
  searchDocuments(
    @CurrentUser() user: AuthUser,
    @Query('q') q = '',
    @Query('limit') limit = '20',
  ): Promise<DocumentSearchResult[]> {
    return this.search.search(user.userId, q, Number(limit) || 20);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentDto[]> {
    return this.documents.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<DocumentDto> {
    return this.documents.get(user.userId, id);
  }

  @Get(':id/versions')
  versions(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<DocumentVersionDto[]> {
    return this.documents.listVersions(user.userId, id);
  }

  @Get(':id/timeline')
  timelineOf(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<TimelineEntryDto[]> {
    return this.timeline.getTimeline(user.userId, id);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addTag(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddTagDto,
  ): Promise<void> {
    await this.documents.addTag(user.userId, id, dto.label);
  }

  @Patch(':id/category')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetCategoryDto,
  ): Promise<void> {
    await this.documents.setCategory(user.userId, id, dto.categoryId);
  }
}
