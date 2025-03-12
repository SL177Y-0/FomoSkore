const express = require('express');
const router = express.Router();
const veridaService = require('../services/veridaService');

// Login endpoint to redirect to Verida auth
router.get('/login', (req, res) => {
  try {
    const { redirectUrl } = req.query;
    
    if (!redirectUrl) {
      return res.status(400).json({ error: 'Redirect URL is required' });
    }
    
    // Construct the Verida auth URL with appropriate scopes
    const scopes = [
      'api:ds-query',
      'api:search-universal',
      'ds:social-email',
      'api:search-ds',
      'api:search-chat-threads',
      'ds:r:social-chat-group',
      'ds:r:social-chat-message'
    ].join('&scopes=');
    
    // Encode the callback URL (this should point to your backend)
    const callbackUrl = encodeURIComponent(`${process.env.API_BASE_URL}/VeridaAuth/callback?redirectUrl=${encodeURIComponent(redirectUrl)}`);
    
    // Construct the Verida auth URL
    const veridaAuthUrl = `https://app.verida.ai/auth?scopes=${scopes}&redirectUrl=${callbackUrl}&appDID=${process.env.VERIDA_APP_DID || 'did:vda:mainnet:0x87AE6A302aBf187298FC1Fa02A48cFD9EAd2818D'}`;
    
    // Redirect to Verida auth
    res.redirect(veridaAuthUrl);
  } catch (error) {
    console.error('Error redirecting to Verida auth:', error);
    res.status(500).json({ error: 'Failed to redirect to Verida auth' });
  }
});

// Callback endpoint for Verida auth
router.get('/callback', async (req, res) => {
  try {
    const { token, redirectUrl } = req.query;
    
    if (!token || !redirectUrl) {
      return res.status(400).json({ error: 'Token and redirect URL are required' });
    }
    
    // Parse the token to extract DID and auth token
    let tokenData;
    try {
      tokenData = JSON.parse(token);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid token format' });
    }
    
    const did = tokenData.token.did;
    const authToken = tokenData.token._id;
    
    // Redirect back to the frontend with the DID and auth token
    res.redirect(`${redirectUrl}?did=${encodeURIComponent(did)}&authToken=${encodeURIComponent(authToken)}`);
  } catch (error) {
    console.error('Error processing Verida callback:', error);
    res.redirect(`${req.query.redirectUrl || '/'}?error=auth_failed&message=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
});

// Get DID from auth token endpoint
router.post('/getDID', async (req, res) => {
  try {
    const { authToken } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ error: 'Auth token is required' });
    }
    
    console.log("Attempting to get DID from auth token:", authToken.substring(0, 10) + '...');
    
    // Use the veridaService to get the DID from the auth token
    const did = await veridaService.getUserDID(authToken);
    
    if (!did || did === 'unknown') {
      if (process.env.VERIDA_DEBUG === 'true') {
        console.log("Debug mode enabled, returning default DID");
        return res.json({ 
          did: process.env.VERIDA_DEFAULT_DID || 'did:vda:testnet:0x123456789',
          note: 'Using default DID in debug mode'
        });
      }
      
      return res.status(400).json({ error: 'Could not determine DID from auth token' });
    }
    
    console.log("Successfully retrieved DID:", did);
    return res.json({ did });
  } catch (error) {
    console.error('Error retrieving DID:', error);
    
    if (process.env.VERIDA_DEBUG === 'true') {
      console.log("Debug mode enabled, returning default DID despite error");
      return res.json({ 
        did: process.env.VERIDA_DEFAULT_DID || 'did:vda:testnet:0x123456789',
        debug: true
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to retrieve DID', 
      message: error.message || 'An unknown error occurred' 
    });
  }
});

module.exports = router;

