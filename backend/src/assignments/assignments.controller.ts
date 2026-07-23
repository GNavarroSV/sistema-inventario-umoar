import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentDto,
  CreateTransferDto,
  MarkAssignmentReturnedDto,
  UpdateAssignmentDto,
} from './dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /** Transferencia con soporte de cantidades parciales */
  @Post('transfer')
  createTransfer(@Body() dto: CreateTransferDto) {
    return this.assignmentsService.createTransfer(dto);
  }

  /** Distribución actual de un activo (quién tiene cuántas unidades) */
  @Get('distribution/:assetId')
  getDistribution(@Param('assetId', ParseIntPipe) assetId: number) {
    return this.assignmentsService.getAssetDistribution(assetId);
  }

  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('asset') asset?: string,
    @Query('person') person?: string,
    @Query('quantity') quantity?: string,
    @Query('dueDate') dueDate?: string,
    @Query('document') document?: string,
  ) {
    return this.assignmentsService.findAll({ skip, take, status, type, asset, person, quantity, dueDate, document });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAssignmentDto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, updateAssignmentDto);
  }

  @Patch(':id/return')
  markReturned(@Param('id', ParseIntPipe) id: number, @Body() dto: MarkAssignmentReturnedDto) {
    return this.assignmentsService.markReturned(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assignmentsService.remove(id);
  }
}
