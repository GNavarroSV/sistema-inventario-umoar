import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Header,
  Param,
  Get,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get('assets/stock/template')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="movimientos-stock.csv"')
  async stockTemplate() {
    return `\uFEFF${await this.importsService.getStockTemplate()}`;
  }

  @Post('assets/dry-run')
  @UseInterceptors(FileInterceptor('file'))
  async dryRun(
    @UploadedFile() file: any,
    @Body('strategy') strategy?: string,
    @Body('notes') notes?: string,
    @Req() req?: any,
  ) {
    return this.importsService.dryRun(file, strategy as any, notes, req?.user?.id ? Number(req.user.id) : undefined);
  }

  @Post('assets/execute/:batchId')
  async execute(@Param('batchId') batchId: string) {
    return this.importsService.execute(Number(batchId));
  }

  @Post('assets/stock/dry-run')
  @UseInterceptors(FileInterceptor('file'))
  async stockDryRun(
    @UploadedFile() file: any,
    @Req() req?: any,
  ) {
    return this.importsService.stockDryRun(
      file,
      req?.user?.id ? Number(req.user.id) : undefined,
    );
  }

  @Get('assets/batch/:batchId')
  async getBatch(@Param('batchId') batchId: string) {
    return this.importsService.getBatch(Number(batchId));
  }
}
