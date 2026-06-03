import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CreatePersonDto, UpdatePersonDto } from './dto';
import { PeopleService } from './people.service';

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.peopleService.create(createPersonDto);
  }

  @Get()
  findAll(@Query('isActive') isActive?: string) {
    const parsed = isActive === undefined ? undefined : isActive === 'true';
    return this.peopleService.findAll(parsed);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePersonDto: UpdatePersonDto) {
    return this.peopleService.update(id, updatePersonDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.remove(id);
  }
}
