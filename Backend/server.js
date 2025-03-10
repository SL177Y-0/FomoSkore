const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const Moralis = require("moralis").default;
const scoreRoutes = require('./routes/scoreRoutes.js');
const blockchainRoutes = require("./routes/blockchainRoutes");
const twitterRoutes = require("./routes/twitterRoutes");
const VeridaApiRoutes = require("./routes/VeridaApiRoute.js");
const VeridaAuthRoutes = require('./routes/VeridaAuthRoute.js');
const fomoScoreRoutes = require('./routes/fomoScoreRoutes');
const veridaService = require('./Services/veridaService');
const { connectDB } = require('./db');

dotenv.config(); // Load .env variables

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to clean DID (remove context parameter)
function cleanDID(did) {
  if (typeof did === 'string') {
    return did.split('?')[0];
  }
  return did;
}

// API Routes
app.use("/api/twitter", twitterRoutes);

// Load blockchain routes
app.use("/api", blockchainRoutes);

app.use('/VeridaApi', VeridaApiRoutes);
app.use('/VeridaAuth', VeridaAuthRoutes);

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
    let authToken = req.query.auth_token || req.query.token;
    
    // Parse token if it exists
    if (authToken) {
      try {
        // Check if it's already a JSON string
        if (typeof authToken === 'string' && (authToken.startsWith('{') || authToken.includes('"token"'))) {
          tokenData = JSON.parse(authToken);
          console.log('Parsed token JSON data');
          
          // Extract DID from token structure
          if (tokenData.token && tokenData.token.did) {
            did = tokenData.token.did;
            authToken = tokenData.token._id;
            console.log('Extracted DID from token:', did);
            console.log('Extracted auth token ID from token:', authToken);
          }
        }
      } catch (error) {
        console.log('Token is not in JSON format, using as-is');
      }
    }
    
    // If we have a token but no DID yet, try to get it from Verida service
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
    
    // Clean the DID to remove context parameters
    did = cleanDID(did);
    
    console.log('Final values - DID:', did, 'Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
    
    // Create a proper token object structure for the frontend
    const tokenObject = JSON.stringify({
      token: {
        did: did || 'unknown',
        _id: authToken,
        servers: ["https://api.verida.ai"]
      }
    });
    
    // Redirect to frontend with the token information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/dashboard?did=${encodeURIComponent(did || 'unknown')}&authToken=${encodeURIComponent(tokenObject)}`;
    
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
