import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [ScheduleModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
