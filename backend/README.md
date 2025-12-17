# TableTopLive Backend

A robust, server-authoritative backend for a real-time multiplayer chess platform built with Node.js, Express.js, MongoDB, Socket.IO, and Stockfish chess engine.

## 🏗️ Architecture

### Server-Authoritative Design
- **Single Source of Truth**: Server maintains all game state
- **Move Validation**: All moves validated by Stockfish engine
- **Anti-Cheat**: Turn order and legal moves enforced server-side
- **Real-time Sync**: Instant state synchronization via Socket.IO

### Chess Engine Integration
- **Stockfish Integration**: Industry-standard chess engine for move validation
- **FEN Notation**: Board state managed using Forsyth-Edwards Notation
- **Game State Detection**: Automatic detection of check, checkmate, stalemate, and draws
- **Server-Only**: Chess engine runs exclusively on backend for security

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 4.4+
- Stockfish chess engine

### Installation

1. **Install Stockfish**
   ```bash
   # macOS
   brew install stockfish
   
   # Ubuntu/Debian
   sudo apt-get install stockfish
   
   # Or download from: https://stockfishchess.org/download/
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Run the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📁 Project Structure

```
backend/
├── server.js              # Main server entry point
├── config/
│   └── db.js              # MongoDB connection
├── engines/
│   └── stockfish.js       # Stockfish chess engine wrapper
├── socket/
│   └── gameSocket.js      # Socket.IO game event handlers
├── controllers/
│   └── gameController.js  # REST API controllers
├── models/
│   ├── Game.js           # Game data model
│   └── Player.js         # Player data model
├── routes/
│   └── gameRoutes.js     # REST API routes
└── utils/
    └── fenHelper.js      # FEN notation utilities
```

## 🔄 Real-Time Flow

### Socket.IO Events

**Client → Server:**
- `authenticate` - User login/identification
- `createRoom` - Create new game room
- `joinRoom` - Join existing game room
- `makeMove` - Submit chess move
- `resign` - Forfeit the game
- `offerDraw` - Propose draw
- `acceptDraw` - Accept draw offer

**Server → Client:**
- `authenticated` - Confirm user authentication
- `roomCreated` - Room creation confirmation
- `roomJoined` - Room join confirmation
- `playerJoined` - New player joined room
- `boardUpdate` - Game state update after move
- `invalidMove` - Move rejection with reason
- `gameOver` - Game completion notification
- `playerDisconnected` - Player connection lost
- `drawOffered` - Draw proposal received

### Move Validation Process

1. **Client Request**: Player submits move via Socket.IO
2. **Authentication**: Verify player identity and room membership
3. **Turn Validation**: Confirm it's the player's turn
4. **Move Format**: Validate move notation (e.g., "e2e4")
5. **Stockfish Validation**: Engine confirms move legality
6. **State Update**: Update FEN, switch turns, record move
7. **End Game Check**: Detect checkmate, stalemate, draws
8. **Broadcast**: Send updated state to all room participants

## 🗄️ Database Schema

### Game Collection
```javascript
{
  roomId: "ABC123",
  players: [
    { userId: "user1", username: "Alice", color: "white", connected: true },
    { userId: "user2", username: "Bob", color: "black", connected: true }
  ],
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  currentTurn: "white",
  status: "in_progress", // waiting | in_progress | completed | abandoned
  winner: null, // "white" | "black" | "draw"
  gameResult: null, // "checkmate" | "stalemate" | "draw" | "resignation"
  moves: [
    {
      from: "e2", to: "e4", 
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      timestamp: "2024-01-01T12:00:00Z"
    }
  ],
  timeControl: { initial: 600000, increment: 0 },
  timeRemaining: { white: 600000, black: 600000 }
}
```

### Player Collection
```javascript
{
  userId: "user1",
  username: "Alice",
  stats: {
    wins: 15, losses: 8, draws: 2,
    rating: 1350, gamesPlayed: 25
  },
  currentGame: "ABC123",
  isOnline: true,
  lastSeen: "2024-01-01T12:00:00Z"
}
```

## 🛡️ Security Features

- **Server Authority**: All game logic runs server-side
- **Move Validation**: Stockfish prevents illegal moves
- **Turn Enforcement**: Strict turn order validation
- **Rate Limiting**: API request throttling
- **Input Sanitization**: Malicious input prevention
- **CORS Protection**: Cross-origin request filtering

## 🔧 API Endpoints

### REST API
- `POST /api/game/create` - Create new game
- `POST /api/game/join/:roomId` - Join game room
- `GET /api/game/:roomId` - Get game details
- `GET /api/game/` - List active games
- `POST /api/game/:roomId/move` - Make move (prefer Socket.IO)
- `POST /api/game/:roomId/abandon` - Abandon game

### Health Check
- `GET /health` - Server health status

## ⚙️ Configuration

### Environment Variables
```bash
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tabletoplive
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
STOCKFISH_PATH=/usr/local/bin/stockfish
```

### Time Controls
- **Blitz**: 3-5 minutes per player
- **Rapid**: 10-15 minutes per player  
- **Classical**: 30+ minutes per player
- **Increment**: Optional time bonus per move

## 🧪 Error Handling

The backend gracefully handles:
- **Player Disconnections**: Maintain game state, allow reconnection
- **Engine Failures**: Automatic Stockfish restart
- **Invalid FEN States**: Position validation and recovery
- **Network Issues**: Connection retry logic
- **Database Errors**: Graceful degradation

## 📊 Performance

- **Concurrent Games**: Supports hundreds of simultaneous games
- **Move Latency**: <100ms move validation and broadcast
- **Memory Usage**: Efficient game state management
- **Database Indexing**: Optimized queries for game lookup

## 🔍 Monitoring

- **Health Endpoint**: `/health` for uptime monitoring
- **Console Logging**: Structured game event logging
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Move processing times

## 🚀 Deployment

### Production Checklist
- [ ] MongoDB Atlas or production database
- [ ] Environment variables configured
- [ ] Stockfish installed on server
- [ ] HTTPS/WSS for secure connections
- [ ] Load balancer for scaling
- [ ] Process manager (PM2)
- [ ] Log aggregation
- [ ] Monitoring setup

### Docker Deployment
```dockerfile
FROM node:18-alpine
RUN apk add --no-cache stockfish
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**TableTopLive Backend** - Built for competitive, real-time chess gaming 🏆