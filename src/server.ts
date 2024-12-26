// server.ts
import { WebSocket, WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import {
  Profile,
  Dialog,
  Message,
  MessageType,
  GetMessagesParams,
  GetDialogsParams,
  DialogFilter,
  WebSocketMessage,
  Config,
} from './types';

const config: Config = {
  PORT: parseInt(process.env.PORT || '3000'),
  DIALOGS_COUNT: parseInt(process.env.DIALOGS_COUNT || '10'),
  MESSAGE_INTERVAL: 1000, // 1 second
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  MESSAGE_TYPE_WEIGHTS: {
    [MessageType.TEXT]: 0.7,
    [MessageType.IMAGE]: 0.2,
    [MessageType.VIDEO]: 0.1,
  },
  DELIVERY_SUCCESS_RATE: 0.7, // 70% chance of successful delivery
};

class ChatService {
  private profiles: Map<string, Profile> = new Map();
  private dialogs: Map<string, Dialog> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private wsClients: Set<WebSocket> = new Set();

  constructor() {
    this.initializeData();
    this.startMessageGeneration();
  }

  private initializeData(): void {
    // Generate profiles
    const profilesNeeded = Math.ceil(config.DIALOGS_COUNT * 1.5);
    const profiles: Profile[] = Array.from({ length: profilesNeeded }, () => ({
      id: uuidv4(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
    }));

    profiles.forEach(profile => this.profiles.set(profile.id, profile));

    // Generate dialogs
    for (let i = 0; i < config.DIALOGS_COUNT; i++) {
      const availableProfiles = Array.from(this.profiles.values());
      const participant1 = availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
      const participant2 = availableProfiles.filter(p => p.id !== participant1.id)[
        Math.floor(Math.random() * (availableProfiles.length - 1))
      ];

      const dialogId = uuidv4();
      const initialMessage = this.generateRandomMessage(dialogId, participant1.id);
      const now = Date.now();

      this.dialogs.set(dialogId, {
        id: dialogId,
        participantIds: [participant1.id, participant2.id],
        lastMessage: initialMessage,
        updatedAt: now,
      });

      this.messages.set(dialogId, [initialMessage]);
    }
  }

  private generateRandomMessage(dialogId: string, senderId: string): Message {
    const random = Math.random();
    let cumulative = 0;
    let type = MessageType.TEXT;

    for (const [messageType, weight] of Object.entries(config.MESSAGE_TYPE_WEIGHTS)) {
      cumulative += weight;
      if (random <= cumulative) {
        type = messageType as MessageType;
        break;
      }
    }

    const baseMessage = {
      id: uuidv4(),
      dialogId,
      senderId,
      createdAt: Date.now(),
      type,
      delivered: Math.random() < config.DELIVERY_SUCCESS_RATE,
    };

    switch (type) {
      case MessageType.TEXT:
        return {
          ...baseMessage,
          type: MessageType.TEXT,
          content: faker.lorem.sentence(),
        };
      case MessageType.IMAGE:
        return {
          ...baseMessage,
          type: MessageType.IMAGE,
          imageUrl: faker.image.url(),
          caption: Math.random() > 0.5 ? faker.lorem.sentence() : undefined,
        };
      case MessageType.VIDEO:
        return {
          ...baseMessage,
          type: MessageType.VIDEO,
          videoUrl: `http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4`,
          thumbnailUrl: faker.image.url(),
          duration: Math.floor(Math.random() * 300), // 0-300 seconds
        };
    }
  }

  private startMessageGeneration(): void {
    setInterval(() => {
      this.dialogs.forEach((dialog, dialogId) => {
        const senderId = dialog.participantIds[Math.floor(Math.random() * 2)];
        const newMessage = this.generateRandomMessage(dialogId, senderId);

        // Update dialog's last message and timestamp
        dialog.lastMessage = newMessage;
        dialog.updatedAt = newMessage.createdAt;

        // Add to messages
        const dialogMessages = this.messages.get(dialogId) || [];
        dialogMessages.push(newMessage);
        this.messages.set(dialogId, dialogMessages);

        // Broadcast to WebSocket clients
        const wsMessage: WebSocketMessage = {
          type: 'NEW_MESSAGE',
          payload: newMessage,
        };
        this.broadcast(wsMessage);
      });
    }, config.MESSAGE_INTERVAL);
  }

  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // WebSocket handling
  public handleWebSocket(ws: WebSocket): void {
    this.wsClients.add(ws);

    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  // HTTP endpoints
  public getProfile(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  public getMessages({ dialogId, offset = 0, limit = config.DEFAULT_PAGE_SIZE }: GetMessagesParams) {
    const dialogMessages = this.messages.get(dialogId) || [];
    const actualLimit = Math.min(limit, config.MAX_PAGE_SIZE);
    const total = dialogMessages.length;

    // Sort messages by createdAt in descending order
    const sortedMessages = [...dialogMessages].sort((a, b) => b.createdAt - a.createdAt);

    return {
      items: sortedMessages.slice(offset, offset + actualLimit),
      total,
      offset,
      hasMore: offset + actualLimit < total,
    };
  }

  public getDialogs({ offset = 0, limit = config.DEFAULT_PAGE_SIZE }: GetDialogsParams, filter?: DialogFilter) {
    let dialogs = Array.from(this.dialogs.values());

    if (filter?.participantId) {
      dialogs = dialogs.filter(dialog => dialog.participantIds.includes(filter.participantId!));
    }

    // Sort dialogs by updatedAt in descending order
    dialogs.sort((a, b) => b.updatedAt - a.updatedAt);

    const actualLimit = Math.min(limit, config.MAX_PAGE_SIZE);
    const total = dialogs.length;

    return {
      items: dialogs.slice(offset, offset + actualLimit),
      total,
      offset,
      hasMore: offset + actualLimit < total,
    };
  }
}

// Server setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const chatService = new ChatService();

app.use(express.json());

// HTTP endpoints
app.get('/api/profiles/:id', (req, res) => {
  const profile = chatService.getProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
});

app.get('/api/dialogs/:dialogId/messages', (req, res) => {
  const { offset, limit } = req.query;
  const messages = chatService.getMessages({
    dialogId: req.params.dialogId,
    offset: offset ? parseInt(offset as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  res.json(messages);
});

app.get('/api/dialogs', (req, res) => {
  const { offset, limit, participantId } = req.query;
  const dialogs = chatService.getDialogs(
    {
      offset: offset ? parseInt(offset as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    },
    { participantId: participantId as string }
  );
  res.json(dialogs);
});

// WebSocket handling
wss.on('connection', (ws) => {
  chatService.handleWebSocket(ws);
});

server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});