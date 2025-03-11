const express = require('express');
const router = express.Router();
const veridaService = require('../services/veridaService');
const { updateVeridaScore } = require('../controllers/scoreController');

// Calculate FOMOscore based on Telegram data
router.post('/score', async (req, res) => {
  try {
    const { did, authToken, privyId } = req.body;
    
    console.log(`Processing score request for DID: ${did}, PrivyID: ${privyId || 'none'}`);
    
    if (!authToken) {
      return res.status(400).json({ error: 'Auth token is required' });
    }

    let userDid = did;
    // If no DID provided, try to fetch it using the auth token
    if (!did || did === 'pending-from-token' || did === 'unknown') {
      try {
        userDid = await veridaService.getUserDID(authToken);
        console.log("Retrieved DID from auth token:", userDid);
      } catch (error) {
        console.error("Error retrieving DID from auth token:", error.message);
        
        // In debug mode, use a fake DID
        if (process.env.VERIDA_DEBUG === 'true') {
          userDid = 'test-did-for-debugging';
          console.log("Using test DID in debug mode:", userDid);
        } else {
          return res.status(400).json({ 
            error: 'Could not determine DID from auth token', 
            message: error.message 
          });
        }
      }
    }

    try {
      // Try to get Telegram data from Verida vault
      const telegramData = await veridaService.getTelegramData(userDid, authToken);
      
      // Calculate FOMO score based on the data
      const score = calculateFOMOscore(telegramData);
      
      // Prepare the response data
      const responseData = {
        did: userDid,
        score: score,
        data: {
          telegram: {
            groups: telegramData.groups,
            messages: telegramData.messages,
            engagementRate: telegramData.engagementRate || 0
          },
          keywordMatches: telegramData.keywordMatches
        }
      };
      
      console.log(`Calculated score for ${userDid}: ${score}`);
      
      // If we have a privyId, store the data in MongoDB
      if (privyId) {
        try {
          await updateVeridaScore(privyId, userDid, {
            score: score,
            data: responseData.data,
            authToken: authToken
          });
          console.log(`Score stored for privyId: ${privyId}`);
        } catch (dbError) {
          console.error("Error storing score in database:", dbError);
          // Continue anyway since we can still return the score
        }
      }
      
      return res.json(responseData);
    } catch (error) {
      console.error("Error calculating score:", error.message);
      
      // In debug mode, return test data
      if (process.env.VERIDA_DEBUG === 'true') {
        console.log("Generating test data in debug mode");
        
        // Create test data structure
        const testData = {
          did: userDid || 'test-did',
          score: 8.5,
          data: {
            telegram: {
              groups: 15,
              messages: 350,
              engagementRate: 0.65
            },
            keywordMatches: {
              totalCount: 12,
              keywords: {
                cluster: 4,
                protocol: 5,
                ai: 3
              }
            }
          }
        };
        
        // Store the test data in MongoDB if we have a privyId
        if (privyId) {
          try {
            await updateVeridaScore(privyId, userDid || 'test-did', {
              score: testData.score,
              data: testData.data,
              authToken: authToken
            });
            console.log(`Test score stored for privyId: ${privyId}`);
          } catch (dbError) {
            console.error("Error storing test score in database:", dbError);
          }
        }
        
        return res.json(testData);
      }
      
      // Not in debug mode, return the error
      return res.status(500).json({ 
        error: 'Failed to calculate FOMOscore', 
        message: error.message 
      });
    }
  } catch (error) {
    console.error("Error processing score request:", error);
    return res.status(500).json({ 
      error: 'Server error processing request', 
      message: error.message 
    });
  }
});

// Helper: Calculate FOMOscore from Telegram data
function calculateFOMOscore(data) {
  const { groups = 0, messages = 0, engagementRate = 0, keywordMatches = {} } = data;
  
  // Base score calculation
  let score = 0;
  
  // Score based on group count
  if (groups >= 10) score += 3;
  else if (groups >= 5) score += 2;
  else if (groups >= 1) score += 1;
  
  // Score based on message count
  if (messages >= 1000) score += 3;
  else if (messages >= 100) score += 2;
  else if (messages >= 10) score += 1;
  
  // Score based on engagement
  if (engagementRate >= 0.5) score += 2; // High engagement (50%+)
  else if (engagementRate >= 0.2) score += 1; // Moderate engagement (20%+)
  
  // Keyword bonus (max 2 points)
  const keywordCount = Object.values(keywordMatches).reduce((sum, count) => sum + count, 0);
  if (keywordCount >= 10) score += 2;
  else if (keywordCount >= 3) score += 1;
  
  // Cap score at 10
  return Math.min(score, 10);
}

module.exports = router;