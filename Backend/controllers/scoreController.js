const { getUserDetails } = require("./twitterController.js");
const { getWalletDetails } = require("./BlockchainController.js");
const Score = require("../models/Score");

// ✅ Function to Handle Score Updates (Twitter + Wallets + Verida)
async function calculateScore(req, res) {
    try {
        console.log("🔍 Request Received:", req.method === "POST" ? req.body : req.params);

        let { privyId, username, address, veridaDID } = req.params;

        // ✅ Handle POST request (req.body) if no params are provided
        if (req.method === "POST") {
            if (!privyId && req.body.privyId) privyId = req.body.privyId;
            if (!username && req.body.userId) username = req.body.userId;
            if (!address && req.body.walletAddress) address = req.body.walletAddress;
            if (!veridaDID && req.body.did) veridaDID = req.body.did;
        }

        // ✅ Ensure at least a Privy ID is provided
        if (!privyId) {
            return res.status(400).json({ error: "Provide a Privy ID" });
        }

        console.log(`📢 Fetching data for: PrivyID(${privyId}), Twitter(${username || "None"}), Wallet(${address || "None"}), Verida(${veridaDID || "None"})`);

        let userData = null;
        let walletData = {}; // ✅ Default to empty wallet data

        // ✅ If username is provided, update Twitter score
        if (username) {
            try {
                userData = await getUserDetails(username);
                await updateTwitterScore(privyId, username, userData);
            } catch (err) {
                console.error("❌ Error fetching Twitter user data:", err);
            }
        }

        // ✅ If wallet address is provided, update wallet score
        if (address) {
            try {
                walletData = await getWalletDetails(address);
                await updateWalletScore(privyId, address, walletData);
            } catch (err) {
                console.error("❌ Error fetching wallet data:", err);
            }
        }

        // ✅ Get updated total score
        const totalScore = await calculateTotalScore(privyId);

        // ✅ Return the final score data
        const userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            return res.status(404).json({ error: "User score not found" });
        }
        
        return res.status(200).json({
            privyId,
            username: userScore.username,
            twitterScore: userScore.twitterScore,
            walletScore: userScore.walletScore,
            veridaScore: userScore.veridaScore,
            totalScore: userScore.totalScore,
            wallets: userScore.wallets.map(w => ({
                address: w.walletAddress,
                score: w.score,
                tokenCount: w.tokenCount,
                balance: w.balance
            })),
            veridaData: userScore.veridaData ? {
                groups: userScore.veridaData.groups,
                messages: userScore.veridaData.messages,
                engagementRate: userScore.veridaData.engagementRate,
                keywords: userScore.veridaData.keywords
            } : null
        });
    } catch (error) {
        console.error("❌ Error calculating score:", error);
        return res.status(500).json({ error: "Failed to calculate score" });
    }
}

// ✅ Update Twitter Score in MongoDB
async function updateTwitterScore(privyId, username, userData) {
    try {
        // Calculate Twitter score based on user data
        const twitterScore = generateTwitterScore(userData);
        
        // Find the user's score document or create a new one
        let userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            userScore = new Score({
                privyId,
                twitterScore,
                username,
                twitterUsername: username,
                twitterData: {
                    followers: userData.followers_count || 0,
                    following: userData.following_count || 0,
                    tweets: userData.statuses_count || 0,
                    lastUpdated: new Date()
                }
            });
        } else {
            userScore.twitterScore = twitterScore;
            userScore.username = username;
            userScore.twitterUsername = username;
            userScore.twitterData = {
                followers: userData.followers_count || 0,
                following: userData.following_count || 0,
                tweets: userData.statuses_count || 0,
                lastUpdated: new Date()
            };
        }
        
        await userScore.save();
        console.log(`✅ Updated Twitter score for ${privyId}: ${twitterScore}`);
        
        return twitterScore;
    } catch (error) {
        console.error("❌ Error updating Twitter score:", error);
        throw error;
    }
}

// ✅ Update Wallet Score in MongoDB
async function updateWalletScore(privyId, address, walletData) {
    try {
        // Calculate wallet score based on wallet data
        const walletScore = generateWalletScore(walletData);
        
        // Find the user's score document
        let userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            userScore = new Score({
                privyId,
                walletScore,
                wallets: [{
                    walletAddress: address,
                    score: walletScore,
                    tokenCount: walletData.tokenCount || 0,
                    balance: walletData.balance || '0',
                    lastUpdated: new Date()
                }]
            });
        } else {
            // Check if this wallet already exists for the user
            const existingWalletIndex = userScore.wallets.findIndex(w => 
                w.walletAddress.toLowerCase() === address.toLowerCase()
            );
            
            if (existingWalletIndex !== -1) {
                // Update existing wallet
                userScore.wallets[existingWalletIndex].score = walletScore;
                userScore.wallets[existingWalletIndex].tokenCount = walletData.tokenCount || 0;
                userScore.wallets[existingWalletIndex].balance = walletData.balance || '0';
                userScore.wallets[existingWalletIndex].lastUpdated = new Date();
            } else {
                // Add new wallet
                userScore.wallets.push({
                    walletAddress: address,
                    score: walletScore,
                    tokenCount: walletData.tokenCount || 0,
                    balance: walletData.balance || '0',
                    lastUpdated: new Date()
                });
            }
            
            // Calculate average wallet score from all wallets
            const totalWalletScore = userScore.wallets.reduce((total, wallet) => total + wallet.score, 0);
            userScore.walletScore = userScore.wallets.length > 0 ? 
                Math.round(totalWalletScore / userScore.wallets.length) : 0;
        }
        
        await userScore.save();
        console.log(`✅ Updated wallet score for ${privyId}, wallet ${address}: ${walletScore}`);
        
        return walletScore;
    } catch (error) {
        console.error("❌ Error updating wallet score:", error);
        throw error;
    }
}

// ✅ Update Verida Score in MongoDB
async function updateVeridaScore(privyId, did, veridaData) {
    try {
        // Calculate score based on Verida data
        const veridaScore = veridaData.score || 0;
        
        // Find the user's score document
        let userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            userScore = new Score({
                privyId,
                veridaScore,
                veridaDID: did,
                veridaData: {
                    authToken: veridaData.authToken,
                    tokenExpiry: veridaData.tokenExpiry || new Date(Date.now() + 86400000), // 24 hours from now
                    groups: veridaData.data?.telegram?.groups || 0,
                    messages: veridaData.data?.telegram?.messages || 0,
                    engagementRate: veridaData.data?.telegram?.engagementRate || 0,
                    keywords: veridaData.data?.keywords || [],
                    lastUpdated: new Date()
                }
            });
        } else {
            userScore.veridaScore = veridaScore;
            userScore.veridaDID = did;
            userScore.veridaData = {
                authToken: veridaData.authToken || userScore.veridaData?.authToken,
                tokenExpiry: veridaData.tokenExpiry || userScore.veridaData?.tokenExpiry,
                groups: veridaData.data?.telegram?.groups || 0,
                messages: veridaData.data?.telegram?.messages || 0,
                engagementRate: veridaData.data?.telegram?.engagementRate || 0,
                keywords: veridaData.data?.keywords || [],
                lastUpdated: new Date()
            };
        }
        
        await userScore.save();
        console.log(`✅ Updated Verida score for ${privyId}, DID ${did}: ${veridaScore}`);
        
        return veridaScore;
    } catch (error) {
        console.error("❌ Error updating Verida score:", error);
        throw error;
    }
}

// ✅ Calculate Total Score (Twitter + Wallets + Verida)
async function calculateTotalScore(privyId) {
    try {
        const userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            throw new Error(`No score data found for user: ${privyId}`);
        }
        
        // Calculate the total score from the three components
        const twitterWeight = userScore.twitterScore > 0 ? 1 : 0;
        const walletWeight = userScore.walletScore > 0 ? 1 : 0;
        const veridaWeight = userScore.veridaScore > 0 ? 1 : 0;
        
        const totalWeight = twitterWeight + walletWeight + veridaWeight;
        
        let total = 0;
        
        if (totalWeight > 0) {
            // Calculate weighted average
            total = Math.round(
                ((userScore.twitterScore * twitterWeight) +
                (userScore.walletScore * walletWeight) +
                (userScore.veridaScore * veridaWeight)) / totalWeight * 10
            );
        }
        
        // Update the total score
        userScore.totalScore = total;
        await userScore.save();
        
        console.log(`✅ Calculated total score for ${privyId}: ${total}`);
        
        return total;
    } catch (error) {
        console.error("❌ Error calculating total score:", error);
        throw error;
    }
}

// ✅ Get Total Score API Endpoint
async function getTotalScore(req, res) {
    try {
        const { privyId } = req.params;
        
        if (!privyId) {
            return res.status(400).json({ error: "Privy ID is required" });
        }
        
        const userScore = await Score.findOne({ privyId });
        
        if (!userScore) {
            return res.status(404).json({ error: "User score not found" });
        }
        
        return res.status(200).json({
            privyId,
            username: userScore.username,
            twitterScore: userScore.twitterScore,
            walletScore: userScore.walletScore,
            veridaScore: userScore.veridaScore,
            totalScore: userScore.totalScore,
            wallets: userScore.wallets.map(w => ({
                address: w.walletAddress,
                score: w.score
            })),
            veridaDID: userScore.veridaDID
        });
    } catch (error) {
        console.error("❌ Error getting total score:", error);
        return res.status(500).json({ error: "Failed to get total score" });
    }
}

// Helper function to generate Twitter score
function generateTwitterScore(userData) {
    if (!userData) return 0;
    
    let score = 0;
    
    // Base points for having an account
    score += 1;
    
    // Points for followers
    const followers = userData.followers_count || 0;
    if (followers > 1000) score += 3;
    else if (followers > 100) score += 2;
    else if (followers > 10) score += 1;
    
    // Points for tweets
    const tweets = userData.statuses_count || 0;
    if (tweets > 1000) score += 3;
    else if (tweets > 100) score += 2;
    else if (tweets > 10) score += 1;
    
    // Verified account bonus
    if (userData.verified) score += 2;
    
    // Cap the score at 10
    return Math.min(score, 10);
}

// Helper function to generate Wallet score
function generateWalletScore(walletData) {
    if (!walletData) return 0;
    
    let score = 0;
    
    // Base points for having a connected wallet
    score += 2;
    
    // Points for token count
    const tokenCount = walletData.tokenCount || 0;
    if (tokenCount > 10) score += 3;
    else if (tokenCount > 5) score += 2;
    else if (tokenCount > 0) score += 1;
    
    // Points for transaction volume
    const txCount = walletData.txCount || 0;
    if (txCount > 100) score += 3;
    else if (txCount > 10) score += 2;
    else if (txCount > 0) score += 1;
    
    // Points for NFTs
    const nftCount = walletData.nftCount || 0;
    if (nftCount > 5) score += 2;
    else if (nftCount > 0) score += 1;
    
    // Cap the score at 10
    return Math.min(score, 10);
}

module.exports = {
    calculateScore,
    getTotalScore,
    updateTwitterScore,
    updateWalletScore,
    updateVeridaScore
};
