import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { MediaProcessingProcessor } from './media-processing.processor';
import { RiskScoringService } from '../moderation/risk-scoring.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'media-processing' },
      { name: 'risk-scoring' },
    ),
  ],
  controllers: [ListingsController],
  providers: [ListingsService, MediaProcessingProcessor, RiskScoringService],
  exports: [ListingsService],
})
export class ListingsModule {}
