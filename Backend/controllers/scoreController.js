const { getUserDetails } = require("./twitterController.js");
const { getWalletDetails } = require("./BlockchainController.js");
const dataService = require("../Services/dataService");

// Function to Handle Score Update
async function calculateScore(req, res) {
    try {
        console.log("🔍 Request Received:", req.method === "POST" ? req.body : req.params);

        let { privyId, username, address } = req.params;

        // Handle POST request (req.body)
        if (req.method === "POST") {
            if (!privyId && req.body.privyId) privyId = req.body.privyId;
            if (!username && req.body.userId) username = req.body.userId;
            if (!address && req.body.walletAddress) address = req.body.walletAddress;
        }

        // Ensure Privy ID is provided
        if (!privyId) {
            return res.status(400).json({ error: "Provide a Privy ID" });
        }

        console.log(`📢 Fetching data for: PrivyID(${privyId}), Twitter(${username || "None"}), Wallet(${address || "None"})`);

        let userData = null;
        let walletData = {}; // Default to empty wallet data

        // If username is provided, update Twitter score
        if (username) {
            try {
                userData = await getUserDetails(username);
                await updateTwitterScore(privyId, userData);
            } catch (err) {
                console.error("❌ Error fetching Twitter user data:", err);
            }
        }

        // If wallet address is provided, update wallet score
        if (address) {
            try {
                walletData = await getWalletDetails(address);
                await updateWalletScore(privyId, address, walletData);
            } catch (err) {
                console.error("❌ Error fetching wallet data:", err);
            }
        }

        // Get updated total score
        const totalScore = await calculateTotalScore(privyId);

        console.log(`✅ Updated score for ${privyId}: ${totalScore}`);
        return res.json({ totalScore });

    } catch (error) {
        console.error("❌ Error calculating score:", error);
        return res.status(500).json({ error: "Server Error" });
    }
}

// ✅ Function to Update Twitter Score
async function updateTwitterScore(privyId, userData) {
    try {
        const score = generateTwitterScore(userData);
        console.log(`📊 Calculated Twitter score for ${privyId}: ${score}`);
        
        // Use data service to update
        const result = await dataService.updateTwitterScore(privyId, score);
        
        return result;
    } catch (error) {
        console.error("❌ Error updating Twitter score:", error);
        throw error;
    }
}

//  Function to Update Wallet Score
async function updateWalletScore(privyId, address, walletData) {
    try {
        const score = generateWalletScore(walletData);
        console.log(`💰 Calculated Wallet score for ${address}: ${score}`);
        
        // Use data service to update
        const result = await dataService.updateWalletScore(privyId, address, score, walletData);
        
        return result;
    } catch (error) {
        console.error("❌ Error updating wallet score:", error);
        throw error;
    }
}

// Function to Calculate Total Score (Twitter + Wallets + Verida/FOMOscore)
async function calculateTotalScore(privyId) {
    const user = await dataService.findUser(privyId);
    
    if (!user) return 0;
    
    // If it's a Mongoose document, use the method
    if (typeof user.calculateTotalScore === 'function') {
        return user.calculateTotalScore();
    }
    
    // Otherwise use the totalScore property
    return user.totalScore;
}

// Update the FOMOscore for a user
async function updateFomoScore(privyId, fomoScore) {
    try {
        // Use data service to update
        const result = await dataService.updateFomoScore(privyId, fomoScore);
        return result;
    } catch (error) {
        console.error("❌ Error updating FOMOscore:", error);
        throw error;
    }
}

async function getTotalScore(req, res) {
    try {
        const { privyId } = req.params;

        if (!privyId) {
            return res.status(400).json({ error: "Privy ID is required" });
        }

        console.log(`📢 Fetching total score for PrivyID: ${privyId}`);

        const user = await dataService.findUser(privyId);

        if (!user) {
            console.log(`⚠️ No score found for PrivyID: ${privyId}`);
            return res.json({ totalScore: 0 });
        }

        console.log(`✅ Total Score for ${privyId}: ${user.totalScore}`);
        return res.json({ totalScore: user.totalScore });

    } catch (error) {
        console.error("❌ Error fetching total score:", error);
        return res.status(500).json({ error: "Server Error" });
    }
}

// Generate Twitter Score Based on User Data
function generateTwitterScore(userData) {
    let score = 0;

    if (userData) {
        const user = userData?.data?.user?.result || {};
        const public_metrics = user?.legacy?.public_metrics || {};

        if (public_metrics) {
            const followers = public_metrics.followers_count || 0;
            const following = public_metrics.following_count || 0;
            const tweets = public_metrics.tweet_count || 0;

            // ✅ Calculate score based on user metrics
            score = Math.min(100, 10 + Math.floor(followers / 10) + Math.floor(following / 20) + Math.floor(tweets / 30));
        }
    }

    return score;
}

// Generate Wallet Score Based on Wallet Data
function generateWalletScore(walletData) {
    // Placeholder for wallet score calculation
    // You can implement more complex calculations based on wallet data
    
    // For now, just check if it has properties and assign a basic score
    const hasData = Object.keys(walletData).length > 0;
    return hasData ? 35 : 10;
}

// Export all the controller functions
module.exports = { calculateScore, getTotalScore, updateFomoScore };
