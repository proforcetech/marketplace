import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RiskScoringService } from './risk-scoring.service';
import { RiskScoringProcessor } from './risk-scoring.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'risk-scoring' })],
  providers: [RiskScoringService, RiskScoringProcessor],
  exports: [RiskScoringService],
})
export class ModerationModule {}
