import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatService } from './chat.service';
import type { JwtPayload } from '../../common/guards/auth.guard';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    roles: string[];
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Authenticate the client via JWT in handshake auth or query params.
   * Join the user to their personal room for targeted event delivery.
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn('WebSocket connection rejected: no token provided');
        client.disconnect();
        return;
      }

      const publicKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
      if (!publicKey) {
        this.logger.error('JWT_PUBLIC_KEY not configured for WebSocket auth');
        client.disconnect();
        return;
      }

      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        clockTolerance: 30,
      }) as JwtPayload;

      if (!payload.sub) {
        client.disconnect();
        return;
      }

      // Attach user data to the socket
      client.data = {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
      };

      // Join user's personal room for direct messaging
      await client.join(`user:${payload.sub}`);

      this.logger.log(`WebSocket connected: userId=${payload.sub}`);
    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.data?.userId) {
      this.logger.log(`WebSocket disconnected: userId=${client.data.userId}`);
    }
  }

  /**
   * Send a message in real-time. Validates participation and broadcasts to room.
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; messageType?: string },
  ): Promise<{ event: string; data: Record<string, unknown> }> {
    if (!client.data?.userId) {
      throw new WsException('Not authenticated');
    }

    try {
      const result = await this.chatService.sendMessage(
        client.data.userId,
        data.conversationId,
        {
          content: data.content,
          messageType: (data.messageType as 'text' | 'offer') ?? 'text',
        },
      );

      // Broadcast to the conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('newMessage', {
          conversationId: data.conversationId,
          message: result.message,
          safetyWarning: result.safetyWarning,
        });

      return {
        event: 'messageSent',
        data: { message: result.message, safetyWarning: result.safetyWarning },
      };
    } catch (error) {
      throw new WsException((error as Error).message);
    }
  }

  /**
   * Broadcast a typing indicator to the conversation room.
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): Promise<void> {
    if (!client.data?.userId) {
      throw new WsException('Not authenticated');
    }

    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      conversationId: data.conversationId,
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Join a specific conversation room. Validates the user is a participant.
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ event: string; data: { joined: boolean } }> {
    if (!client.data?.userId) {
      throw new WsException('Not authenticated');
    }

    // Validate participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: { buyerId: true, sellerId: true },
    });

    if (!conversation) {
      throw new WsException('Conversation not found');
    }

    if (
      conversation.buyerId !== client.data.userId &&
      conversation.sellerId !== client.data.userId
    ) {
      throw new WsException('Not a participant in this conversation');
    }

    await client.join(`conversation:${data.conversationId}`);

    return { event: 'conversationJoined', data: { joined: true } };
  }

  /**
   * Mark messages as read and notify the sender.
   */
  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    if (!client.data?.userId) {
      throw new WsException('Not authenticated');
    }

    try {
      await this.chatService.markAsRead(client.data.userId, data.conversationId);

      // Notify other participants that messages have been read
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('messagesRead', {
          conversationId: data.conversationId,
          userId: client.data.userId,
          readAt: new Date().toISOString(),
        });
    } catch (error) {
      throw new WsException((error as Error).message);
    }
  }
}
