const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
    privyId: { type: String, required: true, unique: true },
    username: { type: String, default: null },
    
    // Twitter data
    twitterScore: { type: Number, default: 0 },
    twitterUsername: { type: String, default: null },
    twitterData: {
        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },
        tweets: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    },
    
    // Wallet data
    walletScore: { type: Number, default: 0 },
    wallets: [
        {
            walletAddress: { type: String, required: true },
            walletType: { type: String, enum: ['ethereum', 'solana', 'other'], default: 'ethereum' },
            score: { type: Number, required: true, default: 10 },
            tokenCount: { type: Number, default: 0 },
            balance: { type: String, default: '0' },
            lastUpdated: { type: Date, default: Date.now }
        }
    ],
    
    // Verida data
    veridaScore: { type: Number, default: 0 },
    veridaDID: { type: String, default: null },
    veridaData: {
        authToken: { type: String, default: null },
        tokenExpiry: { type: Date, default: null },
        groups: { type: Number, default: 0 },
        messages: { type: Number, default: 0 },
        engagementRate: { type: Number, default: 0 },
        keywords: [
            {
                name: { type: String },
                count: { type: Number, default: 1 }
            }
        ],
        lastUpdated: { type: Date, default: Date.now }
    },
    
    // Overall score
    totalScore: { type: Number, default: 0 },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true // Automatically manage createdAt and updatedAt
});

module.exports = mongoose.model("Score", ScoreSchema);
