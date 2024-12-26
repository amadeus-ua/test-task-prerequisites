// types.ts

export interface Profile {
    id: string;
    name: string;
    avatar: string;
  }
  
  export interface BaseMessage {
    id: string;
    dialogId: string;
    senderId: string;
    createdAt: number;
    type: MessageType;
    delivered: boolean;
  }
  
  export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video'
  }
  
  export interface TextMessage extends BaseMessage {
    type: MessageType.TEXT;
    content: string;
  }
  
  export interface ImageMessage extends BaseMessage {
    type: MessageType.IMAGE;
    imageUrl: string;
    caption?: string;
  }
  
  export interface VideoMessage extends BaseMessage {
    type: MessageType.VIDEO;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
  }
  
  export type Message = TextMessage | ImageMessage | VideoMessage;
  
  export interface Dialog {
    id: string;
    participantIds: [string, string];
    lastMessage: Message;
    updatedAt: number;
  }
  
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    offset: number;
    hasMore: boolean;
  }
  
  // API Interfaces
  export interface GetMessagesParams {
    dialogId: string;
    offset?: number;
    limit?: number;
  }
  
  export interface GetDialogsParams {
    offset?: number;
    limit?: number;
  }
  
  export interface DialogFilter {
    participantId?: string;
  }
  
  // WebSocket Events
  export interface WebSocketMessage {
    type: 'NEW_MESSAGE';
    payload: Message;
  }
  
  // Environment configuration
  export interface Config {
    PORT: number;
    DIALOGS_COUNT: number;
    MESSAGE_INTERVAL: number;
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;
    MESSAGE_TYPE_WEIGHTS: {
      [MessageType.TEXT]: number;
      [MessageType.IMAGE]: number;
      [MessageType.VIDEO]: number;
    };
    DELIVERY_SUCCESS_RATE: number;
  }