const express = require("express");
const { calculateScore, getTotalScore, updateFomoScore } = require("../controllers/scoreController.js");
const dataService = require("../Services/dataService");

const router = express.Router();

// Use GET request & dynamic parameters
router.get("/get-score/:privyId/:username/:address", calculateScore);

router.post("/get-score", calculateScore);

router.get("/total-score/:privyId", getTotalScore);

// Update FOMOscore route
router.post("/update-fomo-score", async (req, res) => {
    try {
        const { privyId, fomoScore } = req.body;
        
        if (!privyId || fomoScore === undefined) {
            return res.status(400).json({ error: "Both privyId and fomoScore are required" });
        }
        
        const result = await updateFomoScore(privyId, fomoScore);
        return res.json({ 
            success: true, 
            message: "FOMOscore updated successfully",
            fomoScore: result.fomoScore,
            totalScore: result.totalScore
        });
    } catch (error) {
        console.error("Error updating FOMOscore:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

// Get score breakdown
router.get("/breakdown/:privyId", async (req, res) => {
    try {
        const { privyId } = req.params;
        
        if (!privyId) {
            return res.status(400).json({ error: "Privy ID is required" });
        }
        
        try {
            const user = await dataService.findUser(privyId);
            
            if (!user) {
                return res.json({
                    twitterScore: 0,
                    walletScore: 0,
                    fomoScore: 0
                });
            }
            
            // If it's a Mongoose document
            if (user.toJSON) {
                const userData = user.toJSON();
                return res.json({
                    twitterScore: userData.twitterScore || 0,
                    walletScore: userData.walletScore || 0,
                    fomoScore: userData.fomoScore || 0
                });
            }
            
            // For in-memory store
            const walletScore = user.wallets.reduce((acc, curr) => acc + curr.score, 0);
            
            return res.json({
                twitterScore: user.twitterScore || 0,
                walletScore: walletScore || 0,
                fomoScore: user.fomoScore || 0
            });
        } catch (dataError) {
            console.error("Error retrieving user data:", dataError);
            
            // Provide a fallback response rather than an error
            return res.json({
                twitterScore: 0,
                walletScore: 0,
                fomoScore: 0,
                message: "Error retrieving data, showing default values"
            });
        }
    } catch (error) {
        console.error("Error in score breakdown endpoint:", error);
        return res.status(500).json({ 
            error: "Server error",
            message: "An unexpected error occurred while retrieving score breakdown"
        });
    }
});

module.exports = router;


