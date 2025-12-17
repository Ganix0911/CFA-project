import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true
  },
  stats: {
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 1200
    },
    gamesPlayed: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    timeControl: {
      type: String,
      enum: ['blitz', 'rapid', 'classical'],
      default: 'rapid'
    },
    autoQueen: {
      type: Boolean,
      default: true
    },
    showCoordinates: {
      type: Boolean,
      default: true
    }
  },
  currentGame: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for win rate
playerSchema.virtual('winRate').get(function() {
  const totalGames = this.stats.wins + this.stats.losses + this.stats.draws;
  return totalGames > 0 ? (this.stats.wins / totalGames * 100).toFixed(1) : 0;
});

// Method to update stats after game
playerSchema.methods.updateStats = function(result, opponentRating = 1200) {
  this.stats.gamesPlayed += 1;
  
  switch(result) {
    case 'win':
      this.stats.wins += 1;
      this.stats.rating += this.calculateRatingChange(opponentRating, 1);
      break;
    case 'loss':
      this.stats.losses += 1;
      this.stats.rating += this.calculateRatingChange(opponentRating, 0);
      break;
    case 'draw':
      this.stats.draws += 1;
      this.stats.rating += this.calculateRatingChange(opponentRating, 0.5);
      break;
  }
  
  // Ensure rating doesn't go below 100
  this.stats.rating = Math.max(100, this.stats.rating);
};

// Simple ELO rating calculation
playerSchema.methods.calculateRatingChange = function(opponentRating, score) {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - this.stats.rating) / 400));
  return Math.round(K * (score - expectedScore));
};

// Method to set online status
playerSchema.methods.setOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
};

export default mongoose.model('Player', playerSchema);