import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { ReportsService, ReportFormat, ReportType } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string, @Query('assetId') assetId?: string) {
    return this.reportsService.dashboard({ from, to, assetId: assetId ? Number(assetId) : undefined });
  }

  @Get('export')
  async export(
    @Res() response: any,
    @Query('type') type: ReportType,
    @Query('format') format: ReportFormat,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assetId') assetId?: string,
  ) {
    const result = await this.reportsService.export({ type, format, from, to, assetId: assetId ? Number(assetId) : undefined });
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    response.send(result.buffer);
  }
}
