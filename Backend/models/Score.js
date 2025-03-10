const mongoose = require('mongoose');

/**
 * Wallet schema for storing wallet scores and details
 */
const WalletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    index: true
  },
  score: {
    type: Number,
    default: 0
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Main score schema for storing user scores across different platforms
 */
const ScoreSchema = new mongoose.Schema({
  privyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  twitterScore: {
    type: Number,
    default: 0
  },
  fomoScore: {
    type: Number,
    default: 0
  },
  wallets: [WalletSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Pre-save middleware to update timestamps and calculate total score
 */
ScoreSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total score before saving
  this.calculateTotalScore();
  
  next();
});

/**
 * Method to calculate total score from all sources
 */
ScoreSchema.methods.calculateTotalScore = function() {
  // Calculate wallet total
  const walletTotal = this.wallets.reduce((acc, wallet) => acc + wallet.score, 0);
  
  // Calculate total score from all sources
  // FOMOscore is on a scale of 1-10, so multiply by 10 to make it comparable
  this.totalScore = this.twitterScore + walletTotal + (this.fomoScore * 10);
  
  return this.totalScore;
};

/**
 * Add method to convert to plain object with calculated fields
 */
ScoreSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Calculate wallet score total
  obj.walletScore = obj.wallets.reduce((acc, wallet) => acc + wallet.score, 0);
  
  return obj;
};

// Create and export the model
module.exports = mongoose.model('Score', ScoreSchema); 