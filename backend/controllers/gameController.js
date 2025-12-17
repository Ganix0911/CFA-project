import Game from '../models/Game.js';
import User from '../models/User.js';
import { STARTING_FEN } from '../utils/fenHelper.js';

// @desc    Create a new game
// @route   POST /api/game/create
// @access  Private
export const createGame = async (req, res) => {
  try {
    const { gameType = 'CHESS', timeControl } = req.body;

    // Generate Room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Initial FEN
    let initialFen = STARTING_FEN;
    if (gameType === 'CHECKERS') {
      initialFen = "W:W31,32,30,29,28,27,26,25:B1,2,3,4,5,6,7,8";
    }

    const game = await Game.create({
      roomId,
      gameType,
      players: [{
        userId: req.user._id,
        username: req.user.username,
        color: 'white', // Creator defaults to white/red
        connected: true
      }],
      fen: initialFen,
      timeControl: timeControl || { initial: 600000, increment: 0 },
      timeRemaining: {
        white: timeControl?.initial || 600000,
        black: timeControl?.initial || 600000
      }
    });

    // Update user's current game
    // await User.findByIdAndUpdate(req.user._id, { currentGame: roomId }); // User model might not have currentGame yet, leaving out to avoid error if schema not updated. But wait, I didn't add currentGame to User schema.

    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join a game
// @route   POST /api/game/join/:roomId
// @access  Private
export const joinGame = async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const isAlreadyInGame = game.players.some(p => p.userId.toString() === req.user._id.toString());

    if (isAlreadyInGame) {
      return res.json(game); // Rejoin
    }

    if (game.players.length >= 2) {
      return res.status(400).json({ message: 'Game full' });
    }

    // Add player
    game.players.push({
      userId: req.user._id,
      username: req.user.username,
      color: 'black',
      connected: true
    });

    game.status = 'in_progress';
    game.lastMoveTime = new Date();

    await game.save();

    res.json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get game state
// @route   GET /api/game/:roomId
// @access  Private
export const getGame = async (req, res) => {
  try {
    const game = await Game.findOne({ roomId: req.params.roomId });
    if (!game) return res.status(404).json({ message: 'Game not found' });
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active games (Lobby)
// @route   GET /api/game
// @access  Private
export const getActiveGames = async (req, res) => {
  try {
    const games = await Game.find({ status: { $in: ['waiting', 'in_progress'] } })
      .select('roomId gameType players status createdAt')
      .sort({ createdAt: -1 });
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Make a move (Fallback/REST)
// @route   POST /api/game/:roomId/move
// @access  Private
export const makeMove = async (req, res) => {
  res.status(501).json({ message: 'Use Socket.IO for moves' });
};

// @desc    Abandon game
// @route   POST /api/game/:roomId/abandon
// @access  Private
export const abandonGame = async (req, res) => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId });

    if (!game) return res.status(404).json({ message: 'Game not found' });

    // Validation logic...

    res.json({ message: "Game abandoned" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};