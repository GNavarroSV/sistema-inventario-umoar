import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, CreateAssetStockMovementDto, DiscardAssetDto, UpdateAssetDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { AssetStatus } from '@prisma/client';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('status') status?: AssetStatus,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('responsible') responsible?: string,
    @Query('location') location?: string,
    @Query('quantity') quantity?: string,
    @Query('unitValue') unitValue?: string,
  ) {
    return this.assetsService.findAll({ skip, take, status, code, name, responsible, location, quantity, unitValue });
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get('history/:id')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.getHistory(id);
  }

  @Get(':id/stock-movements')
  getStockMovements(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.getStockMovements(id);
  }

  @Post(':id/stock-movements')
  createStockMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAssetStockMovementDto,
    @Req() request: { user?: { id?: number } },
  ) {
    return this.assetsService.createStockMovement(id, dto, request.user?.id);
  }

  @Post(':id/discard')
  discard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiscardAssetDto,
    @Req() request: { user?: { id?: number } },
  ) {
    return this.assetsService.discard(id, dto.disposalDate, request.user?.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: AssetStatus; reason?: string },
  ) {
    return this.assetsService.updateStatus(id, body.status, body.reason);
  }

}
