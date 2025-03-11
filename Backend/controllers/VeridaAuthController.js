/**
 * Auth callback controller:
 * Handles Verida token parsing, DID extraction, and redirects.
 */
const authCallback = async (req, res) => {
  try {
    console.log("Auth callback received with data:", req.query);
    console.log("Auth callback full URL:", req.originalUrl);

    let did = req.query.did;
    let authToken = req.query.auth_token || req.query.token; 
    let tokenData = null;

    // ✅ STEP 1: Check for `token` and parse it if available
    if (req.query.token) {
      try {
        // 🔹 Ensure `req.query.token` is parsed correctly
        tokenData = typeof req.query.token === "string"
          ? JSON.parse(req.query.token)
          : req.query.token;

        console.log("Parsed token data:", tokenData);

        // ✅ Extract DID & Auth Token
        if (tokenData.token) {
          did = tokenData.token.did;
          authToken = tokenData.token._id;
          console.log("Extracted from token object - DID:", did, "Auth Token:", authToken);
        }
      } catch (error) {
        console.error("❌ Error parsing token data:", error.message);
        return res.status(400).json({ error: "Invalid token format from Verida." });
      }
    }

    // ✅ STEP 2: If no auth token found, check other params
    if (!authToken) {
      authToken = req.query.auth_token || req.body.auth_token;
      console.log("Using auth_token from parameters:", authToken);
    }

    // ✅ STEP 3: Redirect user to Verida auth page if no token found
    if (!authToken) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const returnUrl = `${frontendUrl}?source=verida_callback`;

      console.log("No token found, redirecting to Verida token generator...");

      // Construct Verida token generator URL
      const tokenGeneratorUrl = `https://app.verida.ai/auth?scopes=api%3Ads-query&scopes=api%3Asearch-universal&scopes=ds%3Asocial-email&scopes=api%3Asearch-ds&scopes=api%3Asearch-chat-threads&scopes=ds%3Ar%3Asocial-chat-group&scopes=ds%3Ar%3Asocial-chat-message&redirectUrl=${encodeURIComponent(returnUrl)}&appDID=did%3Avda%3Amainnet%3A0x87AE6A302aBf187298FC1Fa02A48cFD9EAd2818D`;

      return res.redirect(tokenGeneratorUrl);
    }

    // ✅ STEP 4: If no DID found, use the default from environment variables
    if (!did) {
      did = process.env.DEFAULT_DID || "unknown";
      console.log("Using default DID:", did);
    }

    console.log("Final DID:", did);
    console.log("Final AuthToken:", authToken);

    // ✅ STEP 5: Redirect to frontend with DID & authToken
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/dashboard?did=${encodeURIComponent(did)}&authToken=${encodeURIComponent(authToken)}`;

    console.log("Redirecting to frontend with token data:", redirectUrl);
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("❌ Error in auth callback:", error);
    res.status(500).send("Error processing authentication callback");
  }
};

module.exports = {
  authCallback,
};
