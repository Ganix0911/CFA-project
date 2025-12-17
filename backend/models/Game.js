import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  players: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    color: {
      type: String,
      enum: ['white', 'black'],
      required: true
    },
    connected: {
      type: Boolean,
      default: true
    }
  }],
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Starting position
  },
  currentTurn: {
    type: String,
    enum: ['white', 'black'],
    default: 'white'
  },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'abandoned'],
    default: 'waiting'
  },
  gameType: {
    type: String,
    enum: ['CHESS', 'CHECKERS'],
    default: 'CHESS'
  },
  winner: {
    type: String,
    enum: ['white', 'black', 'draw'],
    default: null
  },
  gameResult: {
    type: String,
    enum: ['checkmate', 'stalemate', 'draw', 'resignation', 'timeout', 'abandoned'],
    default: null
  },
  moves: [{
    from: String,
    to: String,
    piece: String,
    captured: String,
    promotion: String,
    san: String, // Standard Algebraic Notation
    fen: String, // Board state after move
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  timeControl: {
    initial: {
      type: Number,
      default: 600000 // 10 minutes in milliseconds
    },
    increment: {
      type: Number,
      default: 0
    }
  },
  timeRemaining: {
    white: {
      type: Number,
      default: 600000
    },
    black: {
      type: Number,
      default: 600000
    }
  },
  lastMoveTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
gameSchema.index({ status: 1 });
gameSchema.index({ 'players.userId': 1 });
gameSchema.index({ createdAt: -1 });

// Virtual for getting current player
gameSchema.virtual('currentPlayer').get(function () {
  return this.players.find(player => player.color === this.currentTurn);
});

// Method to get opponent
gameSchema.methods.getOpponent = function (userId) {
  return this.players.find(player => player.userId !== userId);
};

// Method to get player by userId
gameSchema.methods.getPlayer = function (userId) {
  return this.players.find(player => player.userId === userId);
};

// Method to switch turns
gameSchema.methods.switchTurn = function () {
  this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
};

export default mongoose.model('Game', gameSchema);