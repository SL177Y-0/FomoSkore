const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const Moralis = require("moralis").default;
const scoreRoutes = require('./routes/scoreRoutes.js')
const blockchainRoutes = require("./routes/blockchainRoutes");
const twitterRoutes = require("./routes/twitterRoutes");
const VeridaApiRoutes= require("./routes/VeridaApiRoute.js");
const VeridaAuthRoutes= require('./routes/VeridaAuthRoute.js')
const fomoScoreRoutes = require('./routes/fomoScoreRoutes');
const veridaService = require('./Services/veridaService');
const { connectDB } = require('./db');

dotenv.config(); // Load .env variables

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/twitter", twitterRoutes);

// Load blockchain routes
app.use("/api", blockchainRoutes);

app.use('/VeridaApi', VeridaApiRoutes);
app.use('/VeridaAuth',VeridaAuthRoutes)

// FOMOscore routes
app.use('/api/fomoscore', fomoScoreRoutes);

// Verida auth callback route
app.get('/auth/callback', async (req, res) => {
  try {
    console.log('Auth callback received with data:', req.query);
    console.log('Auth callback full URL:', req.originalUrl);
    
    // Initialize variables
    let tokenData = null;
    let did = null;
    let authToken = null;
    
    // Check if we have a token parameter
    if (req.query.token) {
      try {
        // Try parsing the token as JSON
        tokenData = typeof req.query.token === 'string' 
          ? JSON.parse(req.query.token) 
          : req.query.token;
          
        console.log('Parsed token data:', tokenData);
        
        // Extract DID & Auth Token
        if (tokenData.token) {
          did = tokenData.token.did;
          authToken = tokenData.token._id || tokenData.token;
          console.log('Extracted from token object - DID:', did, 'Auth Token:', authToken);
        } else if (tokenData.did && tokenData._id) {
          // Alternative format
          did = tokenData.did;
          authToken = tokenData._id;
          console.log('Extracted from alternative format - DID:', did, 'Auth Token:', authToken);
        }
      } catch (error) {
        console.error('Error parsing token data:', error.message);
        // The token might be the actual auth token
        authToken = req.query.token;
        console.log('Using token directly as auth token:', authToken);
      }
    }
    
    // If we don't have an auth token yet, look for auth_token parameter
    if (!authToken) {
      authToken = req.query.auth_token || req.body.auth_token;
      console.log('Using auth_token from parameters:', authToken);
    }
    
    // If we still don't have an auth token, redirect to Verida's authentication
    if (!authToken) {
      // If no token, redirect to Verida's token generator with our frontend as the callback
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const returnUrl = `${frontendUrl}?source=verida_callback`;
      
      console.log('No token found, redirecting to Verida token generator with return URL:', returnUrl);
      
      const tokenGeneratorUrl = `https://app.verida.ai/auth?scopes=api%3Ads-query&scopes=api%3Asearch-universal&scopes=ds%3Asocial-email&scopes=api%3Asearch-chat-threads&scopes=api%3Asearch-ds&scopes=ds%3Ar%3Asocial-chat-group&scopes=ds%3Ar%3Asocial-chat-message&redirectUrl=${encodedURIComponent(returnUrl)}&appDID=did%3Avda%3Amainnet%3A0xd9EEeE7aEbF2e035cb442223f8401C4E04a1Ed5B`;
      
      return res.redirect(tokenGeneratorUrl);
    }
    
    // If we have an auth token but no DID, try to fetch it
    if (authToken && !did) {
      try {
        console.log('Attempting to fetch DID using auth token');
        did = await veridaService.getUserDID(authToken);
        console.log('Successfully retrieved DID:', did);
      } catch (didError) {
        console.error('Error fetching DID:', didError.message);
        // If we can't get the DID, use the default
        did = process.env.DEFAULT_DID || 'unknown';
        console.log('Using default or unknown DID:', did);
      }
    }
    
    console.log('Final values - DID:', did, 'Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
    
    // Redirect to frontend with the token information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/dashboard?did=${encodeURIComponent(did || 'unknown')}&authToken=${encodeURIComponent(authToken)}`;
    
    console.log('Redirecting to frontend with token data:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    
    // Redirect to frontend with error information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?error=auth_error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running fine." });
});

// API Score routes
app.use("/api/score", scoreRoutes); 

// Initialize services and start server
const startServer = async () => {
  try {
    // Try to connect to MongoDB but continue even if it fails
    await connectDB();
    
    // Start Moralis
    if (process.env.MORALIS_API_KEY) {
      await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });
      console.log('✅ Moralis initialized successfully');
    } else {
      console.warn('⚠️ No Moralis API key provided, skipping Moralis initialization');
    }
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
};

startServer();