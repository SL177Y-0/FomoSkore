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
    
    // Get the redirectUrl from query parameters - this is where we'll send the user back to
    // If not provided, use the FRONTEND_URL from env
    const redirectUrl = req.query.redirectUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    
    console.log("Auth callback received:", req.query);
    console.log("Will redirect to:", redirectUrl);
    
    // First, check if we have a token directly from Verida (this is the correct flow)
    if (req.query.token) {
      try {
        // Try parsing the token as JSON
        tokenData = typeof req.query.token === 'string' 
          ? JSON.parse(req.query.token) 
          : req.query.token;
        
        console.log("Parsed token data:", JSON.stringify(tokenData));
        
        // Extract auth token from the token structure
        if (tokenData.token) {
          authToken = tokenData.token._id || tokenData.token;
          console.log("Extracted auth token:", authToken?.substring(0, 10) + '...');
        } else if (tokenData._id) {
          // Alternative format
          authToken = tokenData._id;
          console.log("Extracted auth token from alternative format:", authToken?.substring(0, 10) + '...');
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
    
    // If we still don't have an auth token, check if it's in the redirectUrl parameter
    if (!authToken && redirectUrl.includes('auth_token=')) {
      try {
        // Parse the redirectUrl to extract auth_token
        const redirectUrlObj = new URL(redirectUrl);
        const redirectParams = new URLSearchParams(redirectUrlObj.search);
        const extractedAuthToken = redirectParams.get('auth_token');
        
        if (extractedAuthToken) {
          authToken = extractedAuthToken;
          console.log("Extracted auth_token from redirectUrl:", authToken?.substring(0, 10) + '...');
        }
      } catch (error) {
        console.error("Error extracting auth_token from redirectUrl:", error);
      }
    }
    
    // If we still don't have an auth token, check request body
    if (!authToken) {
      authToken = req.body?.auth_token || req.body?.token;
      if (authToken) {
        console.log("Found auth token in request body:", authToken?.substring(0, 10) + '...');
      }
    }
    
    // If we still don't have an auth token after all attempts, redirect to error
    if (!authToken) {
      console.error("No auth token found in the callback");
      return res.redirect(`${redirectUrl}?error=missing_token&message=No+auth+token+found+in+the+callback`);
    }
    
    // We have the auth token, now get the DID from the Verida API
    try {
      console.log("Attempting to retrieve DID using auth token");
      did = await veridaService.getUserDID(authToken);
      console.log("Retrieved DID from auth token:", did);
    } catch (error) {
      console.error("Error retrieving DID from auth token:", error);
      // Continue without a DID, the frontend will handle this
      did = "pending-from-token";
    }
    
    // Construct the redirect URL preserving the original URL path and query params 
    let finalRedirectUrl;
    
    try {
      // Parse the redirect URL to preserve its path structure
      const redirectUrlObj = new URL(redirectUrl);
      
      // Preserve the original path (which should include the dashboard path with Privy ID if present)
      const originalPath = redirectUrlObj.pathname;
      
      // Create a new URLSearchParams object to clean up the search params
      // We don't want to keep the existing auth_token in the redirectUrl
      const searchParams = new URLSearchParams();
      
      // Add our auth params
      searchParams.set('auth_token', authToken);
      if (did) {
        searchParams.set('did', did);
      }
      
      // Construct the final URL with original path and updated search params
      finalRedirectUrl = `${redirectUrlObj.origin}${originalPath}?${searchParams.toString()}`;
      console.log("Redirecting to frontend with preserved path:", finalRedirectUrl);
    } catch (error) {
      console.error("Error constructing redirect URL:", error);
      // Fallback to a simpler redirect URL 
      finalRedirectUrl = `${redirectUrl.split('?')[0]}?auth_token=${encodeURIComponent(authToken)}${did ? `&did=${encodeURIComponent(did)}` : ''}`;
      console.log("Fallback redirect URL:", finalRedirectUrl);
    }
    
    // Redirect to the frontend with the auth token
    return res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error("Error in auth callback:", error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?error=callback_error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
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