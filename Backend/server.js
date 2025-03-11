const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const Moralis = require("moralis").default;
const scoreRoutes = require('./routes/scoreRoutes.js');
const blockchainRoutes = require("./routes/blockchainRoutes");
const twitterRoutes = require("./routes/twitterRoutes");
const VeridaApiRoutes = require("./routes/VeridaApiRoute.js");
const VeridaAuthRoutes = require('./routes/VeridaAuthRoute.js');
const veridaService = require('./services/veridaService');
const connectDB = require('./db.js');

// Load .env variables
dotenv.config();

// Initialize express app
const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use("/api/twitter", twitterRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/verida', VeridaApiRoutes);
app.use('/api/verida-auth', VeridaAuthRoutes);

// Direct auth callback handler (from Verida working implementation)
app.get('/auth/callback', async (req, res) => {
  try {
    // Initialize variables
    let tokenData = null;
    let did = null;
    let authToken = null;
    
    // Get the redirectUrl from the query parameters - this is where we'll send the user back to
    const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    
    console.log("Auth callback received:", req.query);
    console.log("Will redirect to:", redirectUrl);
    
    // Check if we have a token parameter
    if (req.query.token) {
      try {
        // Try parsing the token as JSON
        tokenData = typeof req.query.token === 'string' 
          ? JSON.parse(req.query.token) 
          : req.query.token;
        
        console.log("Parsed token data:", JSON.stringify(tokenData));
        
        // Extract DID and auth token from the token structure
        if (tokenData.token) {
          did = tokenData.token.did;
          authToken = tokenData.token._id || tokenData.token;
          console.log("Extracted from token object - DID:", did, "Auth Token:", authToken?.substring(0, 10) + '...');
        } else if (tokenData.did && tokenData._id) {
          // Alternative format
          did = tokenData.did;
          authToken = tokenData._id;
          console.log("Extracted from alternative format - DID:", did, "Auth Token:", authToken?.substring(0, 10) + '...');
        }
      } catch (error) {
        console.error("Error parsing token:", error);
        // The token might be the actual auth token
        authToken = req.query.token;
        console.log("Using token directly as auth token:", authToken?.substring(0, 10) + '...');
      }
    }
    
    // If we don't have an auth token yet, look for auth_token parameter
    if (!authToken && req.query.auth_token) {
      authToken = req.query.auth_token;
      console.log("Using auth_token parameter:", authToken?.substring(0, 10) + '...');
    }
    
    // If we still don't have an auth token, check request body
    if (!authToken) {
      authToken = req.body?.auth_token || req.body?.token;
      if (authToken) {
        console.log("Found auth token in request body:", authToken?.substring(0, 10) + '...');
      }
    }
    
    // If we still don't have an auth token, redirect to error
    if (!authToken) {
      console.error("No auth token found in the callback");
      const redirectWithError = `${redirectUrl}?error=missing_token&message=No+auth+token+found+in+the+callback`;
      return res.redirect(redirectWithError);
    }
    
    // If we have an auth token but no DID, try to get the DID from the auth token
    if (!did) {
      try {
        console.log("No DID found, attempting to retrieve it using the auth token");
        did = await veridaService.getUserDID(authToken);
        console.log("Retrieved DID from auth token:", did);
      } catch (error) {
        console.error("Error retrieving DID from auth token:", error);
        // Continue with a temporary DID, the frontend will handle this
        did = "pending-from-token";
      }
    }
    
    // Redirect to the frontend with the DID and auth token
    const finalRedirectUrl = `${redirectUrl}?did=${encodeURIComponent(did || 'pending-from-token')}&auth_token=${encodeURIComponent(authToken)}`;
    
    console.log("Redirecting to frontend:", finalRedirectUrl);
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error("Error in auth callback:", error);
    const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectWithError = `${redirectUrl}?error=${encodeURIComponent(error.name || 'unknown')}&message=${encodeURIComponent(error.message || 'Unknown error')}`;
    res.redirect(redirectWithError);
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({ message: "FOMOskoree Backend is running", version: "1.0" });
});

// Database connection
try {
  connectDB();
  console.log("✅ Database connection setup completed. MongoDB " + 
    (process.env.USE_LOCAL_DEV_MODE === 'true' ? "in local development mode" : "in production mode"));
} catch (err) {
  console.log("⚠️ Database connection issue:", err.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Initialize Moralis
const startMoralis = async () => {
  if (process.env.MORALIS_API_KEY && process.env.MORALIS_API_KEY !== 'your_moralis_api_key') {
    try {
      await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });
      console.log("✅ Moralis initialized");
    } catch (error) {
      console.error("⚠️ Moralis initialization error:", error.message);
    }
  } else {
    console.log("⚠️ Moralis API key not set or using default value");
  }
};

startMoralis();