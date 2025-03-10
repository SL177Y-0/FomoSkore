const express = require('express');
const router = express.Router();
const veridaService = require('../Services/veridaService.js');

// Calculate FOMOscore based on Telegram data
router.post('/score', async (req, res) => {
  try {
    const { did, authToken } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ error: 'Auth token is required' });
    }

    let userDid = did;
    // If no DID provided, try to fetch it using the auth token
    if (!did || did === 'unknown') {
      try {
        userDid = await veridaService.getUserDID(authToken);
        console.log('Retrieved DID from auth token:', userDid);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Invalid DID', 
          message: 'Could not retrieve your Verida DID. Please try reconnecting with Verida.' 
        });
      }
    }

    console.log('Received score request for DID:', userDid);
    
    // Get Telegram data from Verida vault
    const telegramData = await veridaService.getTelegramData(userDid, authToken);
    
    // Calculate FOMOscore
    const fomoScore = calculateFOMOscore(telegramData);
    console.log('Calculated FOMO score:', fomoScore);
    
    return res.json({ 
      score: fomoScore,
      did: userDid,
      data: {
        groups: telegramData.groups,
        messages: telegramData.messages
      }
    });
  } catch (error) {
    console.error('Error calculating FOMOscore:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate FOMOscore', 
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to calculate FOMOscore
function calculateFOMOscore(data) {
  const { groups, messages } = data;
  // Simple formula: groups * 1 + messages * 0.1
  return Math.round((groups * 1 + messages * 0.1) * 10) / 10;
}

module.exports = router;