const express = require("express");
const { getWalletDetails } = require("../controllers/BlockchainController");
const { updateWalletScore } = require("../controllers/scoreController");

const router = express.Router();

// Get wallet details without storing in database
router.get("/fetch-blockchain-data", getWalletDetails);

// Store wallet data in MongoDB
router.post("/store-wallet", async (req, res) => {
  try {
    const { privyId, walletAddress } = req.body;
    
    if (!privyId || !walletAddress) {
      return res.status(400).json({ error: "privyId and walletAddress are required" });
    }
    
    // Fetch wallet data
    const walletData = await getWalletDetails({ query: { address: walletAddress }}, { json: () => {} });
    
    // Store in MongoDB
    const score = await updateWalletScore(privyId, walletAddress, walletData);
    
    res.json({
      success: true,
      score,
      walletAddress,
      privyId
    });
  } catch (error) {
    console.error("❌ Error storing wallet data:", error);
    res.status(500).json({ error: error.message || "Failed to store wallet data" });
  }
});

module.exports = router;
