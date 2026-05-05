import { Controller, Get, Param } from '@nestjs/common';

import { GlossaryService } from './glossary.service';

@Controller('glossary')
export class GlossaryController {
  constructor(private readonly glossary: GlossaryService) {}

  @Get()
  list() {
    return this.glossary.list();
  }

  @Get(':term')
  findByTerm(@Param('term') term: string) {
    return this.glossary.findByTerm(term);
  }
}
