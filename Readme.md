# Chat Service

A WebSocket-based chat service that simulates multiple dialogs between users. This service generates mock conversations and provides both WebSocket and HTTP endpoints for accessing the chat data.

## Prerequisites

- Node.js >= 18.0.0
- Yarn package manager
- Docker (optional)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat-service
```

2. Install dependencies:
```bash
yarn install
```

## Running the Service

### Development Mode

```bash
yarn dev
```

### Production Mode

```bash
yarn build
yarn start
```

### Using Docker

Using docker-compose:
```bash
docker-compose up
```

Or using Docker directly:
```bash
yarn docker:build
yarn docker:run
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `DIALOGS_COUNT`: Number of dialogs to generate (default: 10)

## API Endpoints

### WebSocket

Connect to `ws://localhost:3000` to receive real-time messages.

Message format:
```typescript
{
  type: 'NEW_MESSAGE',
  payload: {
    id: string;
    dialogId: string;
    senderId: string;
    createdAt: number;
    type: 'text' | 'image' | 'video';
    content?: string;        // for text messages
    imageUrl?: string;       // for image messages
    videoUrl?: string;       // for video messages
    thumbnailUrl?: string;   // for video messages
    duration?: number;       // for video messages
  }
}
```

### HTTP

#### Get Profile
```
GET /api/profiles/:id
```

Response:
```json
{
  "id": "string",
  "name": "string",
  "avatar": "string"
}
```

#### Get Dialogs
```
GET /api/dialogs
```

Query Parameters:
- `offset` (optional): Number of items to skip
- `limit` (optional): Number of items to return (default: 10, max: 50)
- `participantId` (optional): Filter dialogs by participant

Response:
```json
{
  "items": [
    {
      "id": "string",
      "participantIds": ["string", "string"],
      "lastMessage": {
        // Message object
      },
      "updatedAt": number
    }
  ],
  "total": number,
  "offset": number,
  "hasMore": boolean
}
```

#### Get Messages
```
GET /api/dialogs/:dialogId/messages
```

Query Parameters:
- `offset` (optional): Number of items to skip
- `limit` (optional): Number of items to return (default: 10, max: 50)

Response:
```json
{
  "items": [
    // Array of message objects
  ],
  "total": number,
  "offset": number,
  "hasMore": boolean
}
```

## Directory Structure

```
.
├── src/
│   ├── types.ts    # Type definitions
│   └── server.ts   # Server implementation
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── .gitignore
```

## Development

1. Run in development mode:
```bash
yarn dev
```

## Note

This service is designed as part of a technical assessment. The implementation includes:
- Basic WebSocket and HTTP endpoints
- Message generation simulation
- Message delivery status
- Real-time updates