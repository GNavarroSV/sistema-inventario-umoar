import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

@Controller('cost-centers')
@UseGuards(JwtAuthGuard)
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  create(@Body() createCostCenterDto: CreateCostCenterDto) {
    return this.costCentersService.create(createCostCenterDto);
  }

  @Get()
  findAll(@Query('isActive') isActive?: string) {
    const parsed = isActive === undefined ? undefined : isActive === 'true';
    return this.costCentersService.findAll(parsed);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCostCenterDto: UpdateCostCenterDto) {
    return this.costCentersService.update(id, updateCostCenterDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.costCentersService.remove(id);
  }
}
