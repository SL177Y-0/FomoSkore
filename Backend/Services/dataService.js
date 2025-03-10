const { isMongoConnected } = require('../db');
const memoryStore = require('./memoryStore');
const Score = require('../models/Score');

/**
 * Hybrid data service that can use either MongoDB or in-memory storage
 * Automatically switches to in-memory when MongoDB is unavailable
 */
const dataService = {
  /**
   * Find a user by privyId
   */
  findUser: async (privyId) => {
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        const user = await Score.findOne({ privyId });
        return user;
      } catch (error) {
        console.error('MongoDB query error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.findUser(privyId);
  },
  
  /**
   * Create or update a user
   */
  saveUser: async (userData) => {
    const { privyId } = userData;
    
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        let user = await Score.findOne({ privyId });
        
        if (!user) {
          user = new Score(userData);
        } else {
          // Update existing user properties
          Object.assign(user, userData);
        }
        
        await user.save();
        
        // Sync with memory store for consistency
        memoryStore.saveUser(userData);
        
        return user;
      } catch (error) {
        console.error('MongoDB save error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.saveUser(userData);
  },
  
  /**
   * Update the user's Twitter score
   */
  updateTwitterScore: async (privyId, twitterScore) => {
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        let user = await Score.findOne({ privyId });
        
        if (!user) {
          user = new Score({
            privyId,
            twitterScore,
            fomoScore: 0,
            wallets: []
          });
        } else {
          user.twitterScore = twitterScore;
        }
        
        await user.save();
        
        // Sync with memory store
        memoryStore.updateTwitterScore(privyId, twitterScore);
        
        return user;
      } catch (error) {
        console.error('MongoDB Twitter score update error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.updateTwitterScore(privyId, twitterScore);
  },
  
  /**
   * Update the user's wallet score
   */
  updateWalletScore: async (privyId, address, score, details = {}) => {
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        let user = await Score.findOne({ privyId });
        
        if (!user) {
          user = new Score({
            privyId,
            twitterScore: 0,
            fomoScore: 0,
            wallets: [{ address, score, details }]
          });
        } else {
          // Find existing wallet or add new one
          const walletIndex = user.wallets.findIndex(w => w.address === address);
          
          if (walletIndex >= 0) {
            user.wallets[walletIndex].score = score;
            user.wallets[walletIndex].details = details;
          } else {
            user.wallets.push({ address, score, details });
          }
        }
        
        await user.save();
        
        // Sync with memory store
        memoryStore.updateWalletScore(privyId, address, score, details);
        
        return user;
      } catch (error) {
        console.error('MongoDB wallet score update error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.updateWalletScore(privyId, address, score, details);
  },
  
  /**
   * Update the user's FOMO score
   */
  updateFomoScore: async (privyId, fomoScore) => {
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        let user = await Score.findOne({ privyId });
        
        if (!user) {
          user = new Score({
            privyId,
            twitterScore: 0,
            fomoScore,
            wallets: []
          });
        } else {
          user.fomoScore = fomoScore;
          // Recalculate total score
          user.calculateTotalScore();
        }
        
        await user.save();
        
        // Sync with memory store
        memoryStore.updateFomoScore(privyId, fomoScore);
        
        return user;
      } catch (error) {
        console.error('MongoDB FOMO score update error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.updateFomoScore(privyId, fomoScore);
  },
  
  /**
   * Get all users (for debugging)
   */
  getAllUsers: async () => {
    // Try MongoDB first if connected
    if (isMongoConnected()) {
      try {
        const users = await Score.find({});
        return users;
      } catch (error) {
        console.error('MongoDB query error, falling back to memory store:', error.message);
        // Fall back to memory store on error
      }
    }
    
    // Use memory store as fallback
    return memoryStore.getAllUsers();
  }
};

module.exports = dataService; 