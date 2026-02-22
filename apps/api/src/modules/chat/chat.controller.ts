import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

@ApiTags('Chat')
@Controller('conversations')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: "List user's conversations" })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  async getConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { conversations, total } = await this.chatService.getConversations(
      user.userId,
      query,
    );
    return {
      data: conversations,
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation with paginated messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation details with messages' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<{
    data: {
      conversation: Record<string, unknown>;
      messages: Record<string, unknown>[];
    };
    pagination: { total: number; page: number; limit: number };
  }> {
    const { conversation, messages, total } =
      await this.chatService.getConversation(user.userId, id, query);
    return {
      data: { conversation, messages },
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new conversation about a listing' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  @ApiResponse({ status: 400, description: 'Cannot message own listing' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiResponse({ status: 409, description: 'Conversation already exists' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const conversation = await this.chatService.createConversation(
      user.userId,
      dto,
    );
    return { data: conversation };
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Rate limited or link blocked' })
  @ApiResponse({ status: 403, description: 'Conversation is blocked or not a participant' })
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ): Promise<{ data: { message: Record<string, unknown>; safetyWarning: boolean } }> {
    const result = await this.chatService.sendMessage(user.userId, id, dto);
    return { data: result };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.chatService.markAsRead(user.userId, id);
    return { data: { message: 'Conversation marked as read' } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete conversation for current user' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation archived' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.chatService.softDeleteConversation(user.userId, id);
    return { data: { message: 'Conversation archived' } };
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block the other user in this conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  async blockUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.chatService.blockUser(user.userId, id);
    return { data: { message: 'User blocked' } };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report this conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  async reportConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason: string,
    @Body('description') description?: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const report = await this.chatService.reportConversation(
      user.userId,
      id,
      reason,
      description,
    );
    return { data: report };
  }
}
