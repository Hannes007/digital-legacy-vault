import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { DocumentCategoryDto } from '@dlv/shared-types';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { DocumentService } from '../application/document.service';
import { CreateCategoryDto } from './dto/document-mutations.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';

@Controller('document-categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly documents: DocumentService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto): Promise<DocumentCategoryDto> {
    return this.documents.createCategory(user.userId, dto.name);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DocumentCategoryDto[]> {
    return this.documents.listCategories(user.userId);
  }
}
