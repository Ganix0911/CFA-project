# TableTopLive Backend API Documentation

## Overview

The TableTopLive backend provides both REST API endpoints and Socket.IO real-time communication for managing multiplayer chess games.

## Base URL
```
http://localhost:3001
```

## Authentication

Currently, the API uses simple user identification via `userId` and `username`. In production, implement proper JWT authentication.

---

## REST API Endpoints

### Health Check

#### GET /health
Check server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

---

### Game Management

#### POST /api/game/create
Create a new game room.

**Request Body:**
```json
{
  "userId": "user123",
  "username": "Alice",
  "timeControl": {
    "initial": 600000,
    "increment": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "roomId": "ABC123",
    "status": "waiting",
    "players": [
      {
        "userId": "user123",
        "username": "Alice",
        "color": "white",
        "connected": true
      }
    ],
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "currentTurn": "white",
    "timeControl": {
      "initial": 600000,
      "increment": 0
    },
    "timeRemaining": {
      "white": 600000,
      "black": 600000
    }
  }
}
```

#### POST /api/game/join/:roomId
Join an existing game room.

**Parameters:**
- `roomId` (string): The room ID to join

**Request Body:**
```json
{
  "userId": "user456",
  "username": "Bob"
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "roomId": "ABC123",
    "status": "in_progress",
    "players": [
      {
        "userId": "user123",
        "username": "Alice",
        "color": "white",
        "connected": true
      },
      {
        "userId": "user456",
        "username": "Bob",
        "color": "black",
        "connected": true
      }
    ],
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "currentTurn": "white",
    "timeControl": {
      "initial": 600000,
      "increment": 0
    },
    "timeRemaining": {
      "white": 600000,
      "black": 600000
    }
  }
}
```

#### GET /api/game/:roomId
Get game details.

**Parameters:**
- `roomId` (string): The room ID

**Response:**
```json
{
  "success": true,
  "game": {
    "roomId": "ABC123",
    "status": "in_progress",
    "players": [...],
    "fen": "current_position_fen",
    "currentTurn": "white",
    "moves": [
      {
        "from": "e2",
        "to": "e4",
        "fen": "resulting_fen",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ],
    "winner": null,
    "gameResult": null,
    "createdAt": "2024-01-01T11:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### GET /api/game/
Get list of active games.

**Query Parameters:**
- `status` (string): Filter by game status (default: "waiting")
- `limit` (number): Number of games to return (default: 10)
- `page` (number): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "games": [
    {
      "roomId": "ABC123",
      "status": "waiting",
      "players": [...],
      "createdAt": "2024-01-01T11:00:00.000Z",
      "timeControl": {
        "initial": 600000,
        "increment": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### POST /api/game/:roomId/move
Make a move (prefer Socket.IO for real-time games).

**Parameters:**
- `roomId` (string): The room ID

**Request Body:**
```json
{
  "userId": "user123",
  "move": "e2e4"
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "roomId": "ABC123",
    "status": "in_progress",
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "currentTurn": "black",
    "winner": null,
    "gameResult": null,
    "lastMove": {
      "from": "e2",
      "to": "e4",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### POST /api/game/:roomId/abandon
Abandon/forfeit a game.

**Parameters:**
- `roomId` (string): The room ID

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "roomId": "ABC123",
    "status": "completed",
    "winner": "black",
    "gameResult": "resignation"
  }
}
```

---

## Socket.IO Events

### Connection & Authentication

#### Client → Server: `authenticate`
Authenticate user with the server.

**Data:**
```json
{
  "userId": "user123",
  "username": "Alice"
}
```

#### Server → Client: `authenticated`
Confirm successful authentication.

**Data:**
```json
{
  "userId": "user123",
  "username": "Alice"
}
```

### Room Management

#### Client → Server: `createRoom`
Create a new game room.

**Data:**
```json
{
  "timeControl": {
    "initial": 600000,
    "increment": 0
  }
}
```

#### Server → Client: `roomCreated`
Confirm room creation.

**Data:**
```json
{
  "roomId": "ABC123",
  "game": { /* game object */ }
}
```

#### Client → Server: `joinRoom`
Join an existing room.

**Data:**
```json
{
  "roomId": "ABC123"
}
```

#### Server → Client: `roomJoined`
Confirm room join.

**Data:**
```json
{
  "roomId": "ABC123",
  "game": { /* game object */ },
  "reconnected": false
}
```

#### Server → Client: `playerJoined`
Notify all players when someone joins.

**Data:**
```json
{
  "roomId": "ABC123",
  "game": { /* updated game object */ },
  "newPlayer": {
    "userId": "user456",
    "username": "Bob",
    "color": "black"
  }
}
```

### Game Actions

#### Client → Server: `makeMove`
Submit a chess move.

**Data:**
```json
{
  "move": "e2e4",
  "timeRemaining": 580000
}
```

#### Server → Client: `boardUpdate`
Broadcast move to all players.

**Data:**
```json
{
  "roomId": "ABC123",
  "move": {
    "from": "e2",
    "to": "e4",
    "promotion": null,
    "player": "white",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "currentTurn": "black",
  "timeRemaining": {
    "white": 580000,
    "black": 600000
  }
}
```

#### Server → Client: `invalidMove`
Notify player of invalid move.

**Data:**
```json
{
  "message": "Illegal move",
  "move": "e2e5",
  "fen": "current_position_fen"
}
```

#### Client → Server: `resign`
Resign from the game.

**Data:** (none)

#### Server → Client: `gameOver`
Notify all players of game end.

**Data:**
```json
{
  "winner": "white",
  "result": "checkmate",
  "finalFen": "final_position_fen",
  "resignedPlayer": null
}
```

### Draw Handling

#### Client → Server: `offerDraw`
Offer a draw to opponent.

**Data:** (none)

#### Server → Client: `drawOffered`
Notify opponent of draw offer.

**Data:**
```json
{
  "fromPlayer": "user123",
  "username": "Alice"
}
```

#### Client → Server: `acceptDraw`
Accept a draw offer.

**Data:** (none)

### Connection Events

#### Server → Client: `playerDisconnected`
Notify when a player disconnects.

**Data:**
```json
{
  "userId": "user123",
  "username": "Alice"
}
```

#### Server → Client: `playerReconnected`
Notify when a player reconnects.

**Data:**
```json
{
  "userId": "user123",
  "username": "Alice"
}
```

### Error Handling

#### Server → Client: `error`
General error notification.

**Data:**
```json
{
  "message": "Error description"
}
```

---

## Move Notation

Moves use UCI (Universal Chess Interface) notation:
- Normal move: `e2e4`
- Castling: `e1g1` (kingside), `e1c1` (queenside)
- Promotion: `e7e8q` (promote to queen)
- En passant: `e5d6` (capture notation)

---

## Game States

### Status Values
- `waiting` - Room created, waiting for second player
- `in_progress` - Game is active
- `completed` - Game finished
- `abandoned` - Game abandoned due to disconnection

### Game Results
- `checkmate` - Game won by checkmate
- `stalemate` - Game drawn by stalemate
- `draw` - Game drawn by agreement
- `resignation` - Game won by resignation
- `timeout` - Game won by time forfeit
- `abandoned` - Game abandoned

### Winner Values
- `white` - White player won
- `black` - Black player won
- `draw` - Game was drawn

---

## Error Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Error Messages
- "userId and username are required"
- "Game not found"
- "Game is full"
- "Not your turn"
- "Invalid move format"
- "Illegal move"
- "Game is not in progress"
- "Player not in game"

---

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: `X-RateLimit-*` headers included in responses

---

## WebSocket Connection

Connect to Socket.IO server:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

// Authenticate
socket.emit('authenticate', {
  userId: 'user123',
  username: 'Alice'
});

// Listen for authentication
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});
```

---

## Example Client Integration

```javascript
// Create and join a game
socket.emit('createRoom', {
  timeControl: { initial: 600000, increment: 0 }
});

socket.on('roomCreated', (data) => {
  console.log('Room created:', data.roomId);
});

// Make a move
socket.emit('makeMove', {
  move: 'e2e4',
  timeRemaining: 580000
});

// Listen for board updates
socket.on('boardUpdate', (data) => {
  console.log('Move made:', data.move);
  console.log('New position:', data.fen);
  console.log('Next turn:', data.currentTurn);
});
```