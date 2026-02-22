export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
  SAFETY_WARNING = 'safety_warning',
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  /** Denormalized for display */
  listingTitle?: string;
  listingThumbnail?: string | null;
  otherUser?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage?: Message | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  readAt: string | null;
  createdAt: string;
}

export interface SendMessagePayload {
  content: string;
  type?: MessageType;
}

export interface StartConversationPayload {
  listingId: string;
  initialMessage: string;
}
