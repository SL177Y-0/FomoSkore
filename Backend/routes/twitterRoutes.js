const express = require("express");
const twitterController = require("../controllers/twitterController");
const { updateTwitterScore } = require("../controllers/scoreController");

const router = express.Router();

// Route to get Twitter user details
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const userData = await twitterController.getUserDetails(username);
    res.json(userData);
  } catch (error) {
    console.error("❌ Error fetching Twitter user:", error);
    res.status(500).json({ error: error.message || "Failed to fetch Twitter user data" });
  }
});

// Route to store Twitter user data in MongoDB
router.post("/store", async (req, res) => {
  try {
    const { privyId, username } = req.body;
    
    if (!privyId || !username) {
      return res.status(400).json({ error: "privyId and username are required" });
    }
    
    // Fetch Twitter data
    const userData = await twitterController.getUserDetails(username);
    
    // Store in MongoDB
    const score = await updateTwitterScore(privyId, username, userData);
    
    res.json({
      success: true,
      score,
      username,
      privyId
    });
  } catch (error) {
    console.error("❌ Error storing Twitter user:", error);
    res.status(500).json({ error: error.message || "Failed to store Twitter user data" });
  }
});

module.exports = router;
