const mongoose = require("mongoose");
require('dotenv').config();

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        
        // Check if we're using a local development mode that doesn't require MongoDB
        const useLocalDevMode = process.env.USE_LOCAL_DEV_MODE === 'true';
        
        if (useLocalDevMode) {
            console.log("✅ Running in local development mode without MongoDB");
            return;
        }
        
        // Try to connect to MongoDB
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        console.log("⚠️ Running without database connection. Some features may not work properly.");
        // Don't exit the process, allow the app to run without MongoDB
        // process.exit(1);
    }
};

module.exports = connectDB;
