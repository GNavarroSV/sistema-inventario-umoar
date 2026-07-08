import { Module } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [PrismaModule, AssetsModule],
  providers: [ImportsService],
  controllers: [ImportsController],
})
export class ImportsModule {}
