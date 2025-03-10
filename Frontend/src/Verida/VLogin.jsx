import { useEffect, useState } from "react";
import PropTypes from "prop-types";

function VLogin({ setUser }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    console.log("Full URL Parameters:", location.search); // 🔍 Debugging
  
    const did = searchParams.get("did");
    const authToken = searchParams.get("authToken");
    const tokenParam = searchParams.get("token");
    const errorParam = searchParams.get("error");
    const errorMessage = searchParams.get("message");
  
    console.log("AuthToken from URL:", authToken ? `${authToken.substring(0, 20)}...` : 'None'); // 🔍 Debugging
  
    if (errorParam) {
      console.error("Authentication error:", errorParam, errorMessage);
      setError(errorMessage || "Failed to authenticate with Verida. Please try again.");
      return;
    }
  
    if (tokenParam) {
      try {
        const tokenData = JSON.parse(tokenParam);
        console.log("Authentication successful from token data:", tokenData);
        setUser({
          did: tokenData.token?.did || 'unknown',
          authToken: tokenData.token?._id || tokenData,
          tokenData: tokenData.token,
        });
        return;
      } catch (err) {
        console.error("Error parsing token data:", err);
      }
    }
  
    if (did && authToken) {
      try {
        // Try to parse the token if it's a JSON string
        let parsedToken = authToken;
        let tokenData = null;
        
        if (typeof authToken === 'string' && 
           (authToken.startsWith('{') || authToken.includes('"token"'))) {
          try {
            tokenData = JSON.parse(authToken);
            parsedToken = tokenData.token?._id || authToken;
            console.log("Parsed token data:", tokenData);
          } catch (parseErr) {
            console.error("Error parsing authToken:", parseErr);
          }
        }
        
        console.log("Authentication successful from URL params:", { 
          did, 
          authToken: parsedToken.substring(0, 10) + '...',
          hasTokenData: !!tokenData
        });
        
        setUser({ 
          did, 
          authToken: parsedToken,
          tokenData: tokenData?.token
        });
      } catch (err) {
        console.error("Error setting user data:", err);
        // Fallback to the raw values
        setUser({ did, authToken });
      }
    }
  }, [setUser]);
  

  const connectWithVerida = () => {
    // Use the backend auth callback which will redirect back to frontend
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const callbackUrl = `${backendUrl}/auth/callback`;
    
    // We can also directly use the Verida auth URL
  
    const authUrl = `https://app.verida.ai/auth?scopes=api%3Ads-query&scopes=api%3Asearch-universal&scopes=ds%3Asocial-email&scopes=api%3Asearch-chat-threads&scopes=api%3Asearch-ds&scopes=ds%3Ar%3Asocial-chat-group&scopes=ds%3Ar%3Asocial-chat-message&redirectUrl=${encodeURIComponent(callbackUrl)}&appDID=did%3Avda%3Amainnet%3A0xd9EEeE7aEbF2e035cb442223f8401C4E04a1Ed5B`;

    console.log("Redirecting to Verida auth:", authUrl);
    window.location.href = authUrl;
  };

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center border border-gray-700">
      <h1 className="text-3xl font-bold text-green-400 mb-4">FOMOscore</h1>
      <p className="text-gray-300 mb-6">Calculate your Fear of Missing Out score based on your Telegram activity</p>

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center justify-center w-full transition"
        onClick={connectWithVerida}
      >
        {/* You can add Verida logo here if available */}
        Connect with Verida
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}
      
      <p className="text-gray-500 text-xs mt-6">
        Verida securely stores your data and gives you control over who can access it.
      </p>
    </div>
  );
}

VLogin.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default VLogin;