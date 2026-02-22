import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
