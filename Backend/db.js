const mongoose = require('mongoose');
const memoryStore = require('./Services/memoryStore');

// Track DB connection status
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

// Configure mongoose
mongoose.set('strictQuery', false);

// Connection options
const options = {
  serverSelectionTimeoutMS: 5000, // Shorter timeout for faster fallback
  heartbeatFrequencyMS: 30000,
  retryWrites: true,
  maxPoolSize: 10
};

/**
 * Connect to MongoDB with retry and fallback logic
 */
const connectDB = async (forceRetry = false) => {
  // Skip if already connected unless forcing retry
  if (isConnected && !forceRetry) {
    console.log('✅ Already connected to MongoDB');
    return true;
  }
  
  // Reset connection attempts on force retry
  if (forceRetry) {
    connectionAttempts = 0;
  }
  
  // Don't retry if we've already tried too many times
  if (connectionAttempts >= MAX_RETRIES) {
    console.log('⚠️ Max MongoDB connection attempts reached. Using in-memory storage.');
    return false;
  }
  
  try {
    // Get MongoDB URI from environment variables
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;
    
    // Ensure we have a connection URI
    if (!MONGODB_URI) {
      console.warn('⚠️ No MongoDB URI provided in environment variables. Using in-memory storage.');
      return false;
    }
    
    // Attempt to connect
    connectionAttempts++;
    console.log(`🔄 MongoDB connection attempt ${connectionAttempts}/${MAX_RETRIES}...`);
    
    const conn = await mongoose.connect(MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (${connectionAttempts}/${MAX_RETRIES}):`, error.message);
    
    // If this was our last attempt, log that we're falling back to in-memory storage
    if (connectionAttempts >= MAX_RETRIES) {
      console.log('⚠️ Falling back to in-memory storage. Data will not persist between restarts.');
    } else {
      // Wait before retrying
      console.log(`🔄 Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectDB(); // Retry
    }
    
    return false;
  }
};

/**
 * Check if MongoDB is connected
 */
const isMongoConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  if (!isConnected) return;
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error.message);
  }
};

module.exports = {
  connectDB,
  isMongoConnected,
  disconnectDB
}; 