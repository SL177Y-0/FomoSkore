/**
 * Simple in-memory data store to replace MongoDB
 */

// In-memory data store
const users = new Map();

/**
 * User score data structure
 */
class UserScore {
  constructor(privyId) {
    this.privyId = privyId;
    this.twitterScore = 0;
    this.wallets = [];
    this.fomoScore = 0;
    this.totalScore = 0;
    this.updatedAt = new Date();
  }

  save() {
    this.updatedAt = new Date();
    // Recalculate total score
    this.calculateTotal();
    // Store in memory
    users.set(this.privyId, this);
    return this;
  }

  calculateTotal() {
    // Calculate wallet total
    const walletTotal = this.wallets.reduce((acc, curr) => acc + curr.score, 0);
    // Calculate total score from all sources
    this.totalScore = this.twitterScore + walletTotal + (this.fomoScore * 10);
    return this.totalScore;
  }
}

/**
 * Memory store service
 */
const memoryStore = {
  /**
   * Find a user by privyId
   */
  findUser: (privyId) => {
    return users.get(privyId) || null;
  },

  /**
   * Create or update a user
   */
  saveUser: (userData) => {
    const { privyId } = userData;
    
    // Get existing user or create new one
    let user = users.get(privyId);
    if (!user) {
      user = new UserScore(privyId);
    }
    
    // Update user properties
    Object.assign(user, userData);
    
    // Save user
    return user.save();
  },
  
  /**
   * Update the user's Twitter score
   */
  updateTwitterScore: (privyId, twitterScore) => {
    let user = users.get(privyId);
    if (!user) {
      user = new UserScore(privyId);
    }
    
    user.twitterScore = twitterScore;
    return user.save();
  },
  
  /**
   * Update the user's wallet score
   */
  updateWalletScore: (privyId, address, score, details = {}) => {
    let user = users.get(privyId);
    if (!user) {
      user = new UserScore(privyId);
    }
    
    // Find existing wallet or add new one
    const walletIndex = user.wallets.findIndex(w => w.address === address);
    if (walletIndex >= 0) {
      user.wallets[walletIndex].score = score;
      user.wallets[walletIndex].details = details;
    } else {
      user.wallets.push({ address, score, details });
    }
    
    return user.save();
  },
  
  /**
   * Update the user's FOMO score
   */
  updateFomoScore: (privyId, fomoScore) => {
    let user = users.get(privyId);
    if (!user) {
      user = new UserScore(privyId);
    }
    
    user.fomoScore = fomoScore;
    return user.save();
  },
  
  /**
   * Get all users (for debugging)
   */
  getAllUsers: () => {
    return Array.from(users.values());
  }
};

module.exports = memoryStore; 