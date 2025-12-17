import Game from '../models/Game.js';
import Player from '../models/Player.js';
import { getStockfishEngine } from '../engines/stockfish.js';
import { STARTING_FEN, isValidFEN, getActivePlayer, parseMove } from '../utils/fenHelper.js';

/**
 * Initialize Socket.IO game handlers
 */
export const initializeGameSocket = (io) => {
  // Store active connections
  const activeConnections = new Map();
  const roomConnections = new Map();

  io.on('connection', async (socket) => {
    console.log(`🔌 Client connected: ${socket.user.username} (${socket.id})`);

    // Store user info from middleware
    // socket.userId and socket.username are already set by protectSocket middleware
    activeConnections.set(socket.userId, socket.id);

    // Update player online status
    await Player.findOneAndUpdate(
      { userId: socket.userId },
      {
        userId: socket.userId,
        username: socket.username,
        isOnline: true,
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    );

    socket.emit('authenticated', { userId: socket.userId, username: socket.username });


    // Handle creating a new game room
    socket.on('createRoom', async (data) => {
      try {
        // Auth check handled by middleware

        const { timeControl, gameType = 'CHESS' } = data; // Default to CHESS

        // Check if player already has an active game
        const existingGame = await Game.findOne({
          'players.userId': socket.userId,
          status: { $in: ['waiting', 'in_progress'] }
        });

        if (existingGame) {
          socket.emit('error', {
            message: 'Already have an active game',
            roomId: existingGame.roomId
          });
          return;
        }

        // Create new game (similar to REST API but through socket)
        const roomId = generateRoomId();

        let initialFen = STARTING_FEN;
        if (gameType === 'CHECKERS') {
          // Standard Checkers FEN (White moves first usually, but in this app White=Red)
          // W:White pieces, B:Black pieces. 32 squares used.
          // W:31,32,30,29,28,27,26,25:B:1,2,3,4,5,6,7,8 (Basic setup)
          // However, our Frontend parser might need specific format.
          // Let's use a placeholder if frontend logic is not FEN aware for checkers yet.
          // BUT, to persist, we need SOMETHING.
          initialFen = "W:W31,32,30,29,28,27,26,25:B1,2,3,4,5,6,7,8";
        }

        const game = new Game({
          roomId,
          gameType,
          players: [{
            userId: socket.userId,
            username: socket.username,
            color: 'white', // In checkers, White is usually Red/First.
            connected: true
          }],
          fen: initialFen,
          currentTurn: 'white',
          status: 'waiting',
          timeControl: {
            initial: timeControl?.initial || 600000,
            increment: timeControl?.increment || 0
          },
          timeRemaining: {
            white: timeControl?.initial || 600000,
            black: timeControl?.initial || 600000
          }
        });

        await game.save();

        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Track room connections
        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId).add(socket.userId);

        // Update player's current game
        await Player.findOneAndUpdate(
          { userId: socket.userId },
          { currentGame: roomId }
        );

        socket.emit('roomCreated', {
          roomId,
          game: formatGameForClient(game)
        });

        console.log(`🎮 Room created: ${roomId} (${gameType}) by ${socket.username}`);

      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });


    // Handle joining a game room
    socket.on('joinRoom', async (data) => {
      try {
        // Auth check handled by middleware

        const { roomId } = data;

        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if player is already in the game
        const existingPlayer = game.players.find(p => p.userId === socket.userId);

        if (existingPlayer) {
          // Reconnecting player
          existingPlayer.connected = true;
          socket.join(roomId);
          socket.currentRoom = roomId;

          if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
          }
          roomConnections.get(roomId).add(socket.userId);

          socket.emit('roomJoined', {
            roomId,
            game: formatGameForClient(game),
            reconnected: true
          });

          // Notify other players of reconnection
          socket.to(roomId).emit('playerReconnected', {
            userId: socket.userId,
            username: socket.username
          });

        } else {
          // New player joining
          if (game.players.length >= 2) {
            socket.emit('error', { message: 'Room is full' });
            return;
          }

          if (game.status !== 'waiting') {
            socket.emit('error', { message: 'Game is not accepting new players' });
            return;
          }

          // Add player to game
          game.players.push({
            userId: socket.userId,
            username: socket.username,
            color: 'black',
            connected: true
          });

          // Start the game
          game.status = 'in_progress';
          game.lastMoveTime = new Date();

          await game.save();

          // Join socket room
          socket.join(roomId);
          socket.currentRoom = roomId;

          if (!roomConnections.has(roomId)) {
            roomConnections.set(roomId, new Set());
          }
          roomConnections.get(roomId).add(socket.userId);

          // Update player's current game
          await Player.findOneAndUpdate(
            { userId: socket.userId },
            { currentGame: roomId }
          );

          // Notify all players
          io.to(roomId).emit('playerJoined', {
            roomId,
            game: formatGameForClient(game),
            newPlayer: {
              userId: socket.userId,
              username: socket.username,
              color: 'black'
            }
          });
        }

        console.log(`👥 ${socket.username} joined room: ${roomId}`);

      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle making a move
    socket.on('makeMove', async (data) => {
      try {
        if (!socket.userId || !socket.currentRoom) {
          socket.emit('error', { message: 'Not in a game room' });
          return;
        }

        const { move, timeRemaining } = data;
        const roomId = socket.currentRoom;

        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Validate player and turn
        const player = game.getPlayer(socket.userId);
        if (!player) {
          socket.emit('error', { message: 'Player not in game' });
          return;
        }

        if (game.status !== 'in_progress') {
          socket.emit('error', { message: 'Game is not in progress' });
          return;
        }

        if (player.color !== game.currentTurn) {
          socket.emit('invalidMove', {
            message: 'Not your turn',
            currentTurn: game.currentTurn
          });
          return;
        }

        // --- CHECKERS LOGIC BRANCH ---
        if (game.gameType === 'CHECKERS') {
          const { from, to } = data; // use explicit from/to from payload

          if (!from || !to) {
            // Fallback if frontend old?
            // Just return error or try to parse
            socket.emit('error', { message: 'Invalid Checkers move data' });
            return;
          }

          // Update FEN
          const newFen = updateCheckersFen(game.fen, from, to);
          game.fen = newFen;

          // Switch turns
          game.switchTurn();
          game.lastMoveTime = new Date();

          await game.save();

          // Broadcast
          const moveUpdate = {
            roomId,
            move: {
              from: from,
              to: to,
              player: player.color,
              timestamp: new Date(),
              raw: move
            },
            fen: game.fen,
            currentTurn: game.currentTurn,
            timeRemaining: game.timeRemaining
          };

          io.to(roomId).emit('boardUpdate', moveUpdate);
          return;
        }

        // --- CHESS LOGIC (Review Existing) ---

        // Validate move format
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
          socket.emit('invalidMove', { message: 'Invalid move format' });
          return;
        }

        // Validate move with Stockfish
        const stockfish = getStockfishEngine();
        const isValidMove = await stockfish.validateMove(game.fen, move);

        if (!isValidMove) {
          socket.emit('invalidMove', {
            message: 'Illegal move',
            move,
            fen: game.fen
          });
          return;
        }

        // Make the move
        const newFen = await stockfish.makeMove(game.fen, move);
        const moveData = parseMove(move);

        // Update time remaining
        if (timeRemaining) {
          game.timeRemaining[player.color] = timeRemaining;
        }

        // Add increment
        if (game.timeControl.increment > 0) {
          game.timeRemaining[player.color] += game.timeControl.increment;
        }

        // Update game state
        game.fen = newFen;
        game.moves.push({
          from: moveData.from,
          to: moveData.to,
          promotion: moveData.promotion,
          fen: newFen,
          timestamp: new Date()
        });

        // Switch turns
        const previousTurn = game.currentTurn;
        game.switchTurn();
        game.lastMoveTime = new Date();

        // Check for game ending conditions
        const isCheckmate = await stockfish.isCheckmate(newFen);
        const isStalemate = await stockfish.isStalemate(newFen);

        let gameEnded = false;
        if (isCheckmate) {
          game.status = 'completed';
          game.winner = player.color;
          game.gameResult = 'checkmate';
          gameEnded = true;
        } else if (isStalemate) {
          game.status = 'completed';
          game.winner = 'draw';
          game.gameResult = 'stalemate';
          gameEnded = true;
        }

        await game.save();

        // Broadcast move to all players in room
        const moveUpdate = {
          roomId,
          move: {
            from: moveData.from,
            to: moveData.to,
            promotion: moveData.promotion,
            player: player.color,
            timestamp: new Date()
          },
          fen: newFen,
          currentTurn: game.currentTurn,
          timeRemaining: game.timeRemaining
        };

        io.to(roomId).emit('boardUpdate', moveUpdate);

        // Handle game end
        if (gameEnded) {
          io.to(roomId).emit('gameOver', {
            winner: game.winner,
            result: game.gameResult,
            finalFen: newFen
          });

          // Update player stats
          await updatePlayerStats(game);

          // Clear current game for players
          await Player.updateMany(
            { userId: { $in: game.players.map(p => p.userId) } },
            { currentGame: null }
          );

          console.log(`🏁 Game ended in room ${roomId}: ${game.gameResult}`);
        }

        console.log(`♟️  Move made in room ${roomId}: ${move} by ${socket.username}`);

      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    // Handle game resignation
    socket.on('resign', async () => {
      try {
        if (!socket.userId || !socket.currentRoom) {
          socket.emit('error', { message: 'Not in a game room' });
          return;
        }

        const roomId = socket.currentRoom;
        const game = await Game.findOne({ roomId });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player = game.getPlayer(socket.userId);
        if (!player) {
          socket.emit('error', { message: 'Player not in game' });
          return;
        }

        if (game.status !== 'in_progress') {
          socket.emit('error', { message: 'Game is not in progress' });
          return;
        }

        // Set game as resigned
        game.status = 'completed';
        game.gameResult = 'resignation';

        if (game.players.length === 2) {
          const opponent = game.getOpponent(socket.userId);
          game.winner = opponent.color;
        }

        await game.save();

        // Notify all players
        io.to(roomId).emit('gameOver', {
          winner: game.winner,
          result: 'resignation',
          resignedPlayer: player.color
        });

        // Update player stats
        await updatePlayerStats(game);

        // Clear current game for players
        await Player.updateMany(
          { userId: { $in: game.players.map(p => p.userId) } },
          { currentGame: null }
        );

        console.log(`🏳️  ${socket.username} resigned in room ${roomId}`);

      } catch (error) {
        console.error('Error handling resignation:', error);
        socket.emit('error', { message: 'Failed to resign' });
      }
    });

    // Handle draw offers
    socket.on('offerDraw', async () => {
      try {
        if (!socket.userId || !socket.currentRoom) {
          socket.emit('error', { message: 'Not in a game room' });
          return;
        }

        const roomId = socket.currentRoom;
        socket.to(roomId).emit('drawOffered', {
          fromPlayer: socket.userId,
          username: socket.username
        });

        console.log(`🤝 Draw offered by ${socket.username} in room ${roomId}`);

      } catch (error) {
        console.error('Error offering draw:', error);
        socket.emit('error', { message: 'Failed to offer draw' });
      }
    });

    // Handle draw acceptance
    socket.on('acceptDraw', async () => {
      try {
        if (!socket.userId || !socket.currentRoom) {
          socket.emit('error', { message: 'Not in a game room' });
          return;
        }

        const roomId = socket.currentRoom;
        const game = await Game.findOne({ roomId });

        if (!game || game.status !== 'in_progress') {
          socket.emit('error', { message: 'Invalid game state' });
          return;
        }

        // Set game as draw
        game.status = 'completed';
        game.winner = 'draw';
        game.gameResult = 'draw';

        await game.save();

        // Notify all players
        io.to(roomId).emit('gameOver', {
          winner: 'draw',
          result: 'draw'
        });

        // Update player stats
        await updatePlayerStats(game);

        console.log(`🤝 Draw accepted in room ${roomId}`);

      } catch (error) {
        console.error('Error accepting draw:', error);
        socket.emit('error', { message: 'Failed to accept draw' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          // Update player offline status
          await Player.findOneAndUpdate(
            { userId: socket.userId },
            {
              isOnline: false,
              lastSeen: new Date()
            }
          );

          // Remove from active connections
          activeConnections.delete(socket.userId);

          // Handle room disconnection
          if (socket.currentRoom) {
            const roomConnections = roomConnections.get(socket.currentRoom);
            if (roomConnections) {
              roomConnections.delete(socket.userId);
            }

            // Notify other players in room
            socket.to(socket.currentRoom).emit('playerDisconnected', {
              userId: socket.userId,
              username: socket.username
            });

            // Update game player connection status
            await Game.findOneAndUpdate(
              {
                roomId: socket.currentRoom,
                'players.userId': socket.userId
              },
              {
                $set: { 'players.$.connected': false }
              }
            );
          }

          console.log(`🔌 Client disconnected: ${socket.username} (${socket.id})`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function formatGameForClient(game) {
  return {
    roomId: game.roomId,
    gameType: game.gameType,
    status: game.status,
    players: game.players,
    fen: game.fen,
    currentTurn: game.currentTurn,
    timeControl: game.timeControl,
    timeRemaining: game.timeRemaining,
    moves: game.moves,
    winner: game.winner,
    gameResult: game.gameResult,
    createdAt: game.createdAt
  };
}

async function updatePlayerStats(game) {
  try {
    for (const gamePlayer of game.players) {
      const player = await Player.findOne({ userId: gamePlayer.userId });
      if (player) {
        let result;
        if (game.winner === 'draw') {
          result = 'draw';
        } else if (game.winner === gamePlayer.color) {
          result = 'win';
        } else {
          result = 'loss';
        }

        // Get opponent rating for ELO calculation
        const opponent = game.players.find(p => p.userId !== gamePlayer.userId);
        const opponentPlayer = opponent ? await Player.findOne({ userId: opponent.userId }) : null;
        const opponentRating = opponentPlayer ? opponentPlayer.stats.rating : 1200;

        player.updateStats(result, opponentRating);
        await player.save();
      }
    }
  } catch (error) {
    console.error('Error updating player stats:', error);
  }
}

function updateCheckersFen(fen, from, to) {
  // FEN: "W:W31,32...:B1,2..."
  // 1. Convert from/to (row, col) to Checkers notation (1-32)
  // Formula from `parseCheckersFenToBoard` inverted:
  // row 0-7, col 0-7
  // If row is Even (0, 2..), occupied cols are 1,3,5,7. 
  // If row is Odd (1, 3..), occupied cols are 0,2,4,6.

  const toIndex = (r, c) => {
    // Validation: Must be on a dark square?
    // Checkers uses dark squares.
    // Even row: odd col. Odd row: even col.
    // i.e. (r % 2 == 0 && c % 2 != 0) || (r % 2 != 0 && c % 2 == 0)
    // This is equivalent to (r + c) % 2 == 1 (Dark Square condition)
    if ((r + c) % 2 === 0) return -1; // Invalid square for checkers piece

    // Calculate number 1-32.
    // Each row has 4 valid squares.
    // number = (r * 4) + (posInRow) + 1
    // posInRow: 
    // If row even: col is 1,3,5,7 -> indices 0,1,2,3 -> floor(col/2)
    // If row odd: col is 0,2,4,6 -> indices 0,1,2,3 -> floor(col/2)
    // Wait. 
    // Row 0: 1 (c1), 2 (c3), 3 (c5), 4 (c7). 
    // c1=1 -> 1/2 = 0.5 -> 0?  (1-1)/2? No.
    // floor(1/2) = 0. +1 = 1.
    // floor(3/2) = 1. +1 = 2.
    // floor(5/2) = 2. +1 = 3.
    // floor(7/2) = 3. +1 = 4.
    // So posInRow = floor(c/2) + 1 ?? No.

    const posInRow = Math.floor(c / 2);
    return (r * 4) + posInRow + 1;
  };

  const fromIdx = toIndex(from.row, from.col);
  const toIdx = toIndex(to.row, to.col);

  if (fromIdx === -1 || toIdx === -1) return fen; // Invalid squares

  // 2. Parse FEN
  const parts = fen.split(':');
  let turn = parts[0];
  let whiteStr = parts.find(p => p.startsWith('W') && p.length > 1) || 'W';
  let blackStr = parts.find(p => p.startsWith('B')) || 'B';

  // Parse positions
  let whitePos = whiteStr.length > 1 ? whiteStr.substring(1).split(',').map(Number) : [];
  let blackPos = blackStr.length > 1 ? blackStr.substring(1).split(',').map(Number) : [];

  // 3. Move Logic
  // Find which list has `fromIdx`
  let movingColor = '';

  if (whitePos.includes(fromIdx)) {
    movingColor = 'W';
    whitePos = whitePos.filter(p => p !== fromIdx);
    whitePos.push(toIdx);
    // Clean sort?
    whitePos.sort((a, b) => a - b);
  } else if (blackPos.includes(fromIdx)) {
    movingColor = 'B';
    blackPos = blackPos.filter(p => p !== fromIdx);
    blackPos.push(toIdx);
    blackPos.sort((a, b) => a - b);
  } else {
    // Piece not found at source?
    return fen;
  }

  // 4. Capture Logic (Simple diagonal jump)
  // e.g. from 18 to 27?
  // Row diff is abs(to.row - from.row).
  // If == 2, it's a capture.
  const rowDiff = Math.abs(to.row - from.row);
  if (rowDiff === 2) {
    const midRow = (from.row + to.row) / 2;
    const midCol = (from.col + to.col) / 2;
    const midIdx = toIndex(midRow, midCol);

    // Remove midIdx from OPPONENT
    if (movingColor === 'W') {
      blackPos = blackPos.filter(p => p !== midIdx);
    } else {
      whitePos = whitePos.filter(p => p !== midIdx);
    }
  }

  // 5. Reconstruct FEN
  // Turn should flip (handled by switchTurn but FEN usually stores turn too)
  // Our FEN format: "W:W...:B..." -> The 'W' at start is Turn.
  // We should flip it.
  const newTurn = turn === 'W' ? 'B' : 'W';

  const newWhiteStr = 'W' + whitePos.join(',');
  const newBlackStr = 'B' + blackPos.join(',');

  return `${newTurn}:${newWhiteStr}:${newBlackStr}`;
}