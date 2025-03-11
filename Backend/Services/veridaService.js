const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Get the Verida network from environment variables
const VERIDA_NETWORK = process.env.VERIDA_NETWORK || 'testnet';

// Define the CORRECT API endpoint based on the sandbox example
const VERIDA_API_BASE_URL = "https://api.verida.ai";

// The correct encoded schemas from the sandbox example
const GROUP_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvZ3JvdXAvdjAuMS4wL3NjaGVtYS5qc29u';
const MESSAGE_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvbWVzc2FnZS92MC4xLjAvc2NoZW1hLmpzb24%3D';

// Keywords to check for "Engage Bonus"
const ENGAGE_KEYWORDS = ['cluster', 'protocol', 'ai'];

// Fallback DID for development purposes when Verida API doesn't return a valid DID
// Use your own DID here for testing if you want to see a specific identity
const FALLBACK_DID = process.env.DEFAULT_DID || 'did:vda:testnet:0x123456789'; 

// Helper function to check for keywords in text content
function checkForKeywords(text, keywordMatches) {
  if (!text) return;
  
  const normalizedText = text.toLowerCase();
  
  ENGAGE_KEYWORDS.forEach(keyword => {
    // Match whole words, case insensitive
    let searchPos = 0;
    const lowerKeyword = keyword.toLowerCase();
    
    while (true) {
      const foundPos = normalizedText.indexOf(lowerKeyword, searchPos);
      if (foundPos === -1) break;
      
      // Check if it's a whole word or hashtag match
      const isWordStart = foundPos === 0 || 
        !normalizedText[foundPos-1].match(/[a-z0-9]/) || 
        normalizedText[foundPos-1] === '#';
        
      const isWordEnd = foundPos + lowerKeyword.length >= normalizedText.length || 
        !normalizedText[foundPos + lowerKeyword.length].match(/[a-z0-9]/);
      
      if (isWordStart && isWordEnd) {
        keywordMatches.keywords[keyword]++;
        keywordMatches.totalCount++;
        break; // Count each keyword only once per text
      }
      
      searchPos = foundPos + 1;
    }
  });
}

// Verida service for querying vault data
const veridaService = {
  // Get user DID using the auth token
  getUserDID: async (authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to fetch user DID');
      }
      
      // Parse token if it's a JSON structure (Verida sometimes returns this format)
      let tokenObj = authToken;
      if (typeof authToken === 'string' && authToken.startsWith('{')) {
        try {
          tokenObj = JSON.parse(authToken);
        } catch (e) {
          // Not JSON, keep as-is
        }
      }
      
      // Extract DID from token object if present
      if (tokenObj.token?.did) {
        return tokenObj.token.did;
      }

      // Additional logic to check alternative token formats
      if (typeof tokenObj === 'object') {
        if (tokenObj.did) return tokenObj.did;
        if (tokenObj.user?.did) return tokenObj.user.did;
        if (tokenObj.data?.did) return tokenObj.data.did;
      }

      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Directly call Verida API endpoints that are known to return user information
      const endpoints = [
        '/user/welcome',
        '/v1/profile',
        '/v1/user/info',
        '/v1/user/profile'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios({
            method: 'GET',
            url: `${VERIDA_API_BASE_URL}${endpoint}`,
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 5000,
            validateStatus: status => status < 500 // Accept any status < 500 to inspect the response
          });
          
          // Check if we got a successful JSON response
          if (response.status === 200 && typeof response.data === 'object') {
            // Check various potential DID locations
            if (response.data?.did) return response.data.did;
            if (response.data?.user?.did) return response.data.user.did;
            if (response.data?.data?.did) return response.data.data.did;
            if (response.data?.user?.address) {
              return `did:vda:${VERIDA_NETWORK}:${response.data.user.address}`;
            }
            
            // Try to extract DID from any properly formatted DID string
            const responseStr = JSON.stringify(response.data);
            const didMatch = responseStr.match(/did:vda:[a-zA-Z0-9:]+/);
            if (didMatch) return didMatch[0];
          }
        } catch (error) {
          // Continue trying other endpoints
        }
      }
      
      // As a last resort, use the default DID
      if (process.env.VERIDA_DEBUG === 'true') {
        // In debug mode, use a fake DID so we can continue testing
        return FALLBACK_DID;
      }
      
      return 'unknown';
    } catch (error) {
      if (process.env.VERIDA_DEBUG === 'true') {
        return FALLBACK_DID;
      }
      return 'unknown';
    }
  },

  // Get Telegram data (groups and messages) from Verida vault
  getTelegramData: async (did, authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      // For accurate data query, make sure we have a valid DID
      if (did === 'pending-from-token' || !did || did === 'unknown') {
        did = await veridaService.getUserDID(authToken);
      }
      
      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      let groups = 0;
      let messages = 0;
      let keywordMatches = {
        totalCount: 0,
        keywords: ENGAGE_KEYWORDS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {})
      };
      
      try {
        // First try direct count API
        const [groupsCountResponse, messagesCountResponse] = await Promise.all([
          axios({
            method: 'POST',
            url: `${VERIDA_API_BASE_URL}/api/rest/v1/ds/count/${GROUP_SCHEMA_ENCODED}`,
            data: {},
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            timeout: 10000
          }),
          axios({
            method: 'POST',
            url: `${VERIDA_API_BASE_URL}/api/rest/v1/ds/count/${MESSAGE_SCHEMA_ENCODED}`,
            data: {},
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            timeout: 10000
          })
        ]);
        
        groups = groupsCountResponse.data?.count || 0;
        messages = messagesCountResponse.data?.count || 0;
      } catch (countError) {
        // Fall back to query API
        try {
          const [groupsResponse, messagesResponse] = await Promise.all([
            axios({
              method: 'POST',
              url: `${VERIDA_API_BASE_URL}/api/rest/v1/ds/query/${GROUP_SCHEMA_ENCODED}`,
              data: {
                options: {
                  sort: [{ _id: "desc" }],
                  limit: 100
                }
              },
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              timeout: 10000
            }),
            axios({
              method: 'POST',
              url: `${VERIDA_API_BASE_URL}/api/rest/v1/ds/query/${MESSAGE_SCHEMA_ENCODED}`,
              data: {
                options: {
                  sort: [{ _id: "desc" }],
                  limit: 100
                }
              },
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              timeout: 10000
            })
          ]);
          
          const groupItems = groupsResponse.data?.results || groupsResponse.data?.items || [];
          const messageItems = messagesResponse.data?.results || messagesResponse.data?.items || [];
          
          groups = groupItems.length;
          messages = messageItems.length;
          
          // Check for keywords in content
          [...groupItems, ...messageItems].forEach(item => {
            const textContent = [
              item.name,
              item.description,
              item.subject,
              item.message,
              item.text,
              item.content,
              typeof item.data === 'object' ? Object.values(item.data).filter(v => typeof v === 'string').join(' ') : item.data
            ].filter(Boolean).join(' ');
            
            if (textContent) {
              checkForKeywords(textContent, keywordMatches);
            }
          });
        } catch (queryError) {
          // Last resort: try universal search
          try {
            const searchResponse = await axios({
              method: 'GET',
              url: `${VERIDA_API_BASE_URL}/api/rest/v1/search/universal?keywords=telegram`,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              timeout: 10000
            });
            
            if (searchResponse.data?.items) {
              const telegramItems = searchResponse.data.items.filter(item => 
                item.schema?.includes('chat/group') || 
                item.schema?.includes('chat/message') || 
                item.name?.toLowerCase().includes('telegram')
              );
              
              groups = telegramItems.filter(item => item.schema?.includes('chat/group')).length;
              messages = telegramItems.filter(item => item.schema?.includes('chat/message')).length;
            }
          } catch (searchError) {
            // Failed to get data from all methods
          }
        }
      }
      
      // If we're in debug mode and have no real data, generate fake data for testing
      if (process.env.VERIDA_DEBUG === 'true' && groups === 0 && messages === 0) {
        groups = 4;  // Fake data for testing
        messages = 15;
      }
      
      return {
        groups,
        messages,
        keywordMatches,
        did: did
      };
    } catch (error) {
      // In debug mode, return fake data
      if (process.env.VERIDA_DEBUG === 'true') {
        return {
          groups: 4,
          messages: 15,
          keywordMatches: { totalCount: 0, keywords: ENGAGE_KEYWORDS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}) },
          did: did || FALLBACK_DID
        };
      }
      
      return {
        groups: 0,
        messages: 0,
        keywordMatches: { totalCount: 0, keywords: ENGAGE_KEYWORDS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}) },
        did: did || 'unknown'
      };
    }
  }
};

module.exports = veridaService;