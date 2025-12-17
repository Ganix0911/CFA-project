/// <reference types="vite/client" />
import { io, Socket } from 'socket.io-client';
import { Player, Move, PlayerColor, BoardPiece } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const toAlgebraic = (row: number, col: number): string => {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
};

const fromAlgebraic = (square: string): { row: number, col: number } => {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square[1]);
  return { row, col };
};

// Helper: Parse FEN to BoardPiece[][]
// FEN example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
const parseFenToBoard = (fen: string): (BoardPiece | null)[][] => {
  const board: (BoardPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  const [position] = fen.split(' ');
  const rows = position.split('/');

  rows.forEach((rowStr, rowIndex) => {
    let colIndex = 0;
    for (const char of rowStr) {
      if (/\d/.test(char)) {
        colIndex += parseInt(char);
      } else {
        const isWhite = char === char.toUpperCase();
        const type = char.toLowerCase();
        let pieceType: any = 'PAWN';

        // Map char to PieceType
        switch (type) {
          case 'p': pieceType = 'PAWN'; break;
          case 'r': pieceType = 'ROOK'; break;
          case 'n': pieceType = 'KNIGHT'; break;
          case 'b': pieceType = 'BISHOP'; break;
          case 'q': pieceType = 'QUEEN'; break;
          case 'k': pieceType = 'KING'; break;
        }

        board[rowIndex][colIndex] = {
          id: `${rowIndex}-${colIndex}-${char}`, // Simple ID
          color: isWhite ? PlayerColor.RED : PlayerColor.BLUE, // Frontend uses RED/BLUE, Chess uses White/Black. Map White->Red, Black->Blue? 
          // WAIT! In GameSocket.js we see `color: 'white'` or `'black'`.
          // In socketService.ts I mapped White->Red, Black->Blue in player mapping.
          // Let's stick to that convention: White(Upper) = RED, Black(Lower) = BLUE?
          // Standard chess: White at bottom (row 7), Black at top (row 0).
          // Frontend: Row 0 is often top.
          // Let's assume standard: White(RED) starts at bottom (Rows 6-7), Black(BLUE) at top (Rows 0-1).
          // FEN row 0 is Rank 8 (Black pieces). So Row 0 -> Black -> BLUE.

          position: { row: rowIndex, col: colIndex },
          type: pieceType
        };
        colIndex++;
      }
    }
  });

  return board;
};

class SocketService {
  public socket: Socket | null = null;
  private listeners: Record<string, Function[]> = {};
  private userId: string = 'user-' + Math.random().toString(36).substr(2, 9);
  private username: string = 'Guest';
  private isAuthenticated = false;
  private currentGameType: string = 'CHESS';

  constructor() {
    this.socket = io(API_URL, {
      autoConnect: false, // Wait for manual connect call
      reconnection: true,
    });
    this.setupSocketListeners();
  }

  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.socket?.emit('authenticate', { userId: this.userId, username: this.username });
    });

    this.socket.on('authenticated', (data) => {
      console.log('Authenticated as', data);
      this.isAuthenticated = true;
      this.emitLocal('connected', true);
    });

    // Helper: Parse Checkers FEN (Custom format W:W<pos>:B<pos>)
    const parseCheckersFenToBoard = (fen: string): (BoardPiece | null)[][] => {
      const board: (BoardPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

      if (!fen || !fen.startsWith('W:')) {
        // Fallback or empty board
        return board;
      }

      // Format: W:W31,32...:B1,2...
      // Split logic needs valid check
      const parts = fen.split(':');
      // parts[0] = "W" (Turn? - check format in backend) -> logic was "W:W...:B..." so parts[0]=W (Turn), parts[1]=W positions, parts[2]=B positions.

      // Backend string: "W:W31,32,30,29,28,27,26,25:B1,2,3,4,5,6,7,8"
      // Wait, backend logic for split:
      // "W:W...:B...".split(':') => ["W", "W31,32...", "B1,2..."]? No.
      // Backend hardcoded: "W:W31,32,30,29,28,27,26,25:B1,2,3,4,5,6,7,8"
      // Let's rely on simple parsing.

      const whitePart = parts.find(p => p.startsWith('W') && p.length > 1); // W31,32...
      const blackPart = parts.find(p => p.startsWith('B')); // B1,2...

      const placePieces = (posStr: string | undefined, color: PlayerColor) => {
        if (!posStr) return;
        // Remove leading W or B
        const nums = posStr.substring(1).split(',').map(n => parseInt(n)).filter(n => !isNaN(n));

        nums.forEach(n => {
          // Convert 1-32 to (row, col)
          // Standard Checkers Mapping (English Draughts)
          // 1-4 on Row 0 (Black side)
          // Row 0: . 1 . 2 . 3 . 4  (Cols 1,3,5,7) - 0-indexed: 1,3,5,7
          // Row 1: 5 . 6 . 7 . 8 .  (Cols 0,2,4,6)
          // Row 2: . 9 . 10 . 11 . 12

          const row = Math.floor((n - 1) / 4);
          const rowEven = row % 2 === 0;
          // If row even (0, 2), pieces at 1,3,5,7
          // If row odd (1, 3), pieces at 0,2,4,6
          // Within the row, item index is (n-1) % 4.
          const posInRow = (n - 1) % 4;

          let col;
          if (rowEven) {
            col = (posInRow * 2) + 1;
          } else {
            col = (posInRow * 2);
          }

          if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            board[row][col] = {
              id: `${row}-${col}`,
              color,
              position: { row, col },
              type: 'MAN' // Default
            };
          }
        });
      };

      placePieces(whitePart, PlayerColor.RED); // White -> RED
      placePieces(blackPart, PlayerColor.BLUE); // Black -> BLUE

      return board;
    };

    // Helper: Determine correct parser
    const parseBoard = (fen: string, gameType: string) => {
      if (gameType === 'CHECKERS') {
        return parseCheckersFenToBoard(fen);
      }
      return parseFenToBoard(fen);
    };

    this.socket.on('roomCreated', (data) => {
      const gameType = data.game.gameType || 'CHESS';
      this.currentGameType = gameType; // Store valid game type

      const players = data.game.players.map((p: any) => ({
        id: p.userId,
        name: p.username,
        color: p.color === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
        isReady: true,
        avatar: `https://picsum.photos/seed/${p.username}/64/64`,
        stats: { wins: 0, losses: 0, gamesPlayed: 0 }
      }));

      this.emitLocal('room_update', {
        players,
        gameState: {
          roomId: data.roomId,
          gameType: gameType,
          status: data.game.status === 'waiting' ? 'WAITING' : 'PLAYING',
          turn: data.game.currentTurn === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
          board: parseBoard(data.game.fen, gameType),
          fen: data.game.fen
        }
      });
    });

    this.socket.on('playerJoined', (data) => {
      const gameType = data.game.gameType || 'CHESS';
      this.currentGameType = gameType;

      const players = data.game.players.map((p: any) => ({
        id: p.userId,
        name: p.username,
        color: p.color === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
        isReady: true,
        avatar: `https://picsum.photos/seed/${p.username}/64/64`,
        stats: { wins: 0, losses: 0, gamesPlayed: 0 }
      }));

      this.emitLocal('room_update', {
        players,
        gameState: {
          roomId: data.roomId,
          gameType: gameType,
          status: data.game.status === 'waiting' ? 'WAITING' : 'PLAYING',
          turn: data.game.currentTurn === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
          board: parseBoard(data.game.fen, gameType),
          fen: data.game.fen
        }
      });

      if (data.game.status === 'in_progress') {
        this.emitLocal('game_start', {
          roomId: data.roomId,
          gameType: gameType,
          status: 'PLAYING',
          turn: data.game.currentTurn === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
          board: parseBoard(data.game.fen, gameType),
          fen: data.game.fen
        });
      }
    });

    this.socket.on('boardUpdate', (data) => {
      // Use stored gameType
      const gameType = this.currentGameType || 'CHESS';

      let lastMove: any = { from: { row: 0, col: 0 }, to: { row: 0, col: 0 }, pieceId: '' };

      if (gameType === 'CHESS' && data.move && typeof data.move.move === 'string') {
        // Parse algebraic "e2e4"
        lastMove = {
          from: fromAlgebraic(data.move.move.substring(0, 2)),
          to: fromAlgebraic(data.move.move.substring(2, 4)),
          pieceId: ''
        };
      } else if (gameType === 'CHECKERS' && data.move) {
        // Checkers moves come raw or in different format
        // For now, if we don't have algebraic, use placeholders or raw data
        // If data.move.from is an object, use it directly?
        if (data.move.from && data.move.to) {
          lastMove = {
            from: data.move.from,
            to: data.move.to,
            pieceId: ''
          };
        }
      }

      this.emitLocal('game_update', {
        roomId: data.roomId,
        gameType: gameType,
        status: 'PLAYING',
        turn: data.currentTurn === 'white' ? PlayerColor.RED : PlayerColor.BLUE,
        board: parseBoard(data.fen, gameType),
        fen: data.fen,
        lastMove: lastMove
      });
    });

    this.socket.on('error', (err) => {
      console.error("Socket error:", err);
      this.emitLocal('error', err);
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  private emitLocal(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  async waitForAuth(): Promise<void> {
    if (this.isAuthenticated) return;

    // If socket is not connected, connect it
    if (!this.socket?.connected) {
      this.socket?.connect();
    }

    return new Promise((resolve) => {
      // Double check in case it happened async immediately
      if (this.isAuthenticated) {
        resolve();
        return;
      }

      const onAuth = () => {
        this.off('authenticated', onAuth); // Listen for 'authenticated' event specifically? 
        // Previously we listened to 'connected', but that might fire before auth?
        // In setupListeners: 'authenticated' sets this.isAuthenticated = true.
        // So we should wait for that or poll.
        this.off('error', onError);
        resolve();
      };

      const onError = () => {
        // handle error
      }

      // We actually listen to the internal flag change or the 'authenticated' event?
      // setupSocketListeners listens to 'authenticated'.
      // Let's hook into the emitting of 'connected' local event which happens after auth.

      const onConnectedLocal = () => {
        this.off('connected', onConnectedLocal); // This refers to local event
        clearTimeout(timeout);
        resolve();
      };

      // But `this.on` registers to `this.listeners`.
      // The local event is 'connected'.
      this.on('connected', onConnectedLocal);

      // Force re-auth attempt if connected but not auth?
      if (this.socket?.connected) {
        this.socket.emit('authenticate', { userId: this.userId, username: this.username });
      }

      const timeout = setTimeout(() => {
        if (!this.isAuthenticated) {
          this.off('connected', onConnectedLocal);
          console.warn("Auth timeout - resolving to prevent hang");
          resolve();
        }
      }, 2000);
    });
  }

  async createRoom(hostName: string, gameType: string): Promise<string> { // Changed GameType to string to match usage
    this.username = hostName;
    this.connect();

    // Ensure auth first
    await this.waitForAuth();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        resolve('');
        return;
      }

      const handleCreated = (data: any) => {
        this.socket?.off('roomCreated', handleCreated);
        this.socket?.off('error', handleError);
        resolve(data.roomId);
      };

      const handleError = (data: any) => {
        this.socket?.off('roomCreated', handleCreated);
        this.socket?.off('error', handleError);
        reject(data.message || 'Error creating room');
      };

      this.socket.on('roomCreated', handleCreated);
      this.socket.on('error', handleError);

      this.socket.emit('createRoom', {
        timeControl: { initial: 600000, increment: 0 },
        gameType: gameType // Send gameType to backend
      });
    });
  }

  async joinRoom(roomId: string, playerName: string): Promise<boolean> {
    this.username = playerName;
    this.connect();

    // Ensure auth first
    await this.waitForAuth();

    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      this.socket.emit('joinRoom', { roomId });

      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.once('roomJoined', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.socket.once('error', (_err: any) => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  startGame() {
    this.emitLocal('game_start', {
      gameType: 'CHESS', // Default to Chess as backend only supports it for now
      status: 'PLAYING'
    });
  }

  makeMove(move: Move) {
    if (!this.socket) return;

    // Convert Move to algebraic notation: e.g. "e2e4"
    const fromStr = toAlgebraic(move.from.row, move.from.col);
    const toStr = toAlgebraic(move.to.row, move.to.col);
    const moveStr = `${fromStr}${toStr}`;

    this.socket.emit('makeMove', {
      move: moveStr,
      from: move.from,
      to: move.to
    });
  }

  sendMessage(text: string, sender: Player) {
    // Current backend does not support chat messages explicitly in gameSocket.js
    // We can just emit local for now to show in UI, or implement backend support.

    this.emitLocal('chat_message', {
      id: Date.now().toString(),
      senderId: sender.id,
      senderName: sender.name,
      text: text,
      timestamp: Date.now(),
      type: 'CHAT'
    });
  }
  // Helper to create a secondary client for simulation
  private createSecondaryClient(name: string): Socket {
    const client = io(API_URL, {
      forceNew: true, // Crucial to force a new connection
      reconnection: false,
    });

    // Simulate auth
    const fakeId = 'sim-' + Math.random().toString(36).substr(2, 9);

    client.on('connect', () => {
      // We need to wait a small bit or just emit. 
      // Real client waits for connect event.
      client.emit('authenticate', { userId: fakeId, username: name });
    });

    return client;
  }

  // Simulate a remote player joining the room
  // This helps test multiplayer flow with a single browser window
  async simulateRemotePlayerJoin(roomId: string, name: string) {
    console.log(`Simulating remote player join: ${name} into ${roomId}`);
    const client = this.createSecondaryClient(name);

    client.on('authenticated', () => {
      client.emit('joinRoom', { roomId });
    });
  }

  // Add a "Bot" player (currently just a dummy connection to fill the slot)
  addBot(roomId: string) {
    this.simulateRemotePlayerJoin(roomId, "Bot - Stockfish (Level 1)");
  }
}

export const socketService = new SocketService();