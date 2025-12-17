import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        rating: { type: Number, default: 1200 },
        gamesPlayed: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to update stats
userSchema.methods.updateStats = function (result, opponentRating) {
    this.stats.gamesPlayed += 1;

    if (result === 'win') {
        this.stats.wins += 1;
        // Simple ELO-like adjustment (simplified)
        const ratingDiff = opponentRating - this.stats.rating;
        const gain = Math.max(10, Math.min(30, 20 + (ratingDiff * 0.05)));
        this.stats.rating += Math.round(gain);
    } else if (result === 'loss') {
        this.stats.losses += 1;
        const ratingDiff = this.stats.rating - opponentRating;
        const loss = Math.max(10, Math.min(30, 20 + (ratingDiff * 0.05)));
        this.stats.rating -= Math.round(loss);
    } else {
        this.stats.draws += 1;
        // Small connection for draw against stronger opponent
        if (opponentRating > this.stats.rating) {
            this.stats.rating += 2;
        } else {
            this.stats.rating -= 2;
        }
    }
};

export default mongoose.model('User', userSchema);
