// Backend/Services/veridaService.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Primary Verida API endpoint is now .io
const PRIMARY_VERIDA_API_URL = "https://api.verida.ai";
// Fallback to legacy .ai domain for tokens that still reference it
const LEGACY_VERIDA_API_URL = "https://api.verida.io";

console.log(`Using Verida API primary endpoint: ${PRIMARY_VERIDA_API_URL} with fallback`);

// The correct encoded schemas
const GROUP_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvZ3JvdXAvdjAuMS4wL3NjaGVtYS5qc29u';
const MESSAGE_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvbWVzc2FnZS92MC4xLjAvc2NoZW1hLmpzb24%3D';

// Keywords to check for "Engage Bonus"
const ENGAGE_KEYWORDS = ['cluster', 'protocol', 'ai'];

// Helper function to try a request with fallback to alternate domain
async function tryVeridaRequest(endpoint, options) {
  // Try with primary domain first
  try {
    const primaryResponse = await axios({
      ...options,
      url: `${PRIMARY_VERIDA_API_URL}${endpoint}`
    });
    console.log(`Request succeeded with primary .io domain`);
    return primaryResponse;
  } catch (primaryError) {
    console.log(`Request failed with primary domain: ${primaryError.message}`);
    
    // Try with legacy domain as fallback
    try {
      console.log(`Trying fallback to legacy .ai domain...`);
      const legacyResponse = await axios({
        ...options,
        url: `${LEGACY_VERIDA_API_URL}${endpoint}`
      });
      console.log(`Request succeeded with legacy .ai domain`);
      return legacyResponse;
    } catch (legacyError) {
      console.error(`Request also failed with legacy domain: ${legacyError.message}`);
      throw legacyError; // Rethrow the last error
    }
  }
}

// Helper function to check for keywords in text content
function checkForKeywords(text, keywordMatches) {
  if (!text) return;
  
  const normalizedText = text.toLowerCase();
  
  ENGAGE_KEYWORDS.forEach(keyword => {
    let searchPos = 0;
    const lowerKeyword = keyword.toLowerCase();
    
    while (true) {
      const foundPos = normalizedText.indexOf(lowerKeyword, searchPos);
      if (foundPos === -1) break;
      
      const isWordStart = foundPos === 0 || 
        !normalizedText[foundPos-1].match(/[a-z0-9]/) || 
        normalizedText[foundPos-1] === '#';
        
      const isWordEnd = foundPos + lowerKeyword.length >= normalizedText.length || 
        !normalizedText[foundPos + lowerKeyword.length].match(/[a-z0-9]/);
      
      if (isWordStart && isWordEnd) {
        keywordMatches.keywords[keyword]++;
        keywordMatches.totalCount++;
        console.log(`Keyword match: '${keyword}' at position ${foundPos} in text: "${text.substring(Math.max(0, foundPos-10), Math.min(text.length, foundPos+keyword.length+10))}..."`);
        break;
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

      console.log('Fetching user DID with auth token:', authToken.substring(0, 10) + '...');
      
      // Parse token if it's a JSON structure
      let tokenObj = authToken;
      if (typeof authToken === 'string') {
        if (authToken.startsWith('{')) {
          try {
            tokenObj = JSON.parse(authToken);
            console.log('Successfully parsed token as JSON object');
            
            // Check if token contains server URLs and log them
            if (tokenObj.token && tokenObj.token.servers) {
              console.log('Token contains server URLs:', tokenObj.token.servers);
            }
          } catch (e) {
            console.log('Token is not in JSON format');
          }
        }
      }
      
      // Extract DID from token object if present
      if (tokenObj.token && tokenObj.token.did) {
        console.log('Extracted DID from token object:', tokenObj.token.did);
        return tokenObj.token.did;
      }

      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Try to get user profile info
      try {
        console.log('Attempting to fetch profile from Verida API with token');
        const profileResponse = await tryVeridaRequest('/api/profile', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (profileResponse.data?.did) {
          console.log('Retrieved DID from profile:', profileResponse.data.did);
          return profileResponse.data.did;
        }
      } catch (profileError) {
        console.warn('Profile lookup failed:', profileError.message);
      }

      // Try to get user info through alternative endpoint
      try {
        console.log('Attempting to fetch user info from Verida API');
        const userInfoResponse = await tryVeridaRequest('/api/user/info', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (userInfoResponse.data?.did) {
          console.log('Retrieved DID from user info:', userInfoResponse.data.did);
          return userInfoResponse.data.did;
        }
      } catch (userInfoError) {
        console.warn('User info lookup failed:', userInfoError.message);
      }
      
      // Try a test query to see if we can extract information
      try {
        console.log('Attempting test query to Verida API');
        const testResponse = await tryVeridaRequest(`/api/rest/v1/ds/query/${GROUP_SCHEMA_ENCODED}`, {
          method: 'POST',
          data: {
            options: {
              sort: [{ _id: "desc" }],
              limit: 1
            }
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        console.log(`Test query response status:`, testResponse.status);
        
        if (authToken.includes('did:')) {
          const didMatch = authToken.match(/did:[^:]+:[^:]+:[^&\s]+/);
          if (didMatch) {
            console.log('Extracted DID from token string:', didMatch[0]);
            return didMatch[0];
          }
        }
      } catch (apiError) {
        console.warn(`API test failed:`, apiError.message);
      }
      
      // As a last resort, use the default DID from .env
      if (process.env.DEFAULT_DID && process.env.DEFAULT_DID !== 'unknown') {
        console.log('Using DEFAULT_DID from environment:', process.env.DEFAULT_DID);
        return process.env.DEFAULT_DID;
      }
      
      console.log('Could not determine DID, using "unknown"');
      return 'unknown';
    } catch (error) {
      console.error('Error in getUserDID:', error.message);
      return 'unknown';
    }
  },

  // Get Telegram data (groups and messages) from Verida vault
  getTelegramData: async (did, authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      console.log('Querying Verida with:', { did, authToken: authToken.substring(0, 10) + '...' });
      
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      let groups = 0;
      let messages = 0;
      let messageItems = [];
      let keywordMatches = {
        totalCount: 0,
        keywords: {}
      };
      
      ENGAGE_KEYWORDS.forEach(keyword => {
        keywordMatches.keywords[keyword] = 0;
      });
      
      // First try count API
      try {
        const groupsCountResponse = await tryVeridaRequest(`/api/rest/v1/ds/count/${GROUP_SCHEMA_ENCODED}`, {
          method: 'POST',
          data: {},
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        const messagesCountResponse = await tryVeridaRequest(`/api/rest/v1/ds/count/${MESSAGE_SCHEMA_ENCODED}`, {
          method: 'POST',
          data: {},
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        groups = groupsCountResponse.data?.count || 0;
        messages = messagesCountResponse.data?.count || 0;
        
        console.log(`Count API results: ${groups} groups, ${messages} messages`);
      } catch (countError) {
        console.log('Count API failed, trying query API');
        
        // Try query API
        try {
          const groupsResponse = await tryVeridaRequest(`/api/rest/v1/ds/query/${GROUP_SCHEMA_ENCODED}`, {
            method: 'POST',
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
          });
          
          const messagesResponse = await tryVeridaRequest(`/api/rest/v1/ds/query/${MESSAGE_SCHEMA_ENCODED}`, {
            method: 'POST',
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
          });
          
          console.log('Groups response:', 
            groupsResponse.data?.results ? 
              `Found ${groupsResponse.data.results.length} groups` :
              'No groups found'
          );
          
          console.log('Messages response:', 
            messagesResponse.data?.results ? 
              `Found ${messagesResponse.data.results.length} messages` :
              'No messages found'
          );
          
          groups = groupsResponse.data?.results?.length || 0;
          messageItems = messagesResponse.data?.results || [];
          messages = messageItems.length;
          
          messageItems.forEach(message => {
            if (message.content) {
              checkForKeywords(message.content, keywordMatches);
            }
            if (message.subject) {
              checkForKeywords(message.subject, keywordMatches);
            }
          });
          
          console.log(`Keyword matches:`, keywordMatches);
        } catch (queryError) {
          console.error('Error querying Verida:', queryError.message);
          
          // Final attempt with search API
          try {
            const searchResponse = await tryVeridaRequest('/api/rest/v1/search/universal?keywords=telegram', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              timeout: 10000
            });
            
            if (searchResponse.data && searchResponse.data.items) {
              const telegramItems = searchResponse.data.items.filter(item => 
                item.schema?.includes('chat/group') || 
                item.schema?.includes('chat/message') || 
                item.name?.toLowerCase().includes('telegram')
              );
              
              console.log(`Found ${telegramItems.length} Telegram-related items in search results`);
              
              groups = telegramItems.filter(item => item.schema?.includes('chat/group')).length;
              messageItems = telegramItems.filter(item => item.schema?.includes('chat/message'));
              messages = messageItems.length;
              
              messageItems.forEach(message => {
                if (message.content) {
                  checkForKeywords(message.content, keywordMatches);
                }
                if (message.subject || message.name) {
                  checkForKeywords(message.subject || message.name, keywordMatches);
                }
              });
            }
          } catch (searchError) {
            console.error('Search also failed:', searchError.message);
          }
        }
      }
      
      return {
        groups,
        messages,
        keywordMatches
      };
    } catch (error) {
      console.error('Error querying Verida vault:', error.message || error);
      return {
        groups: 0,
        messages: 0,
        keywordMatches: {
          totalCount: 0,
          keywords: ENGAGE_KEYWORDS.reduce((acc, keyword) => {
            acc[keyword] = 0;
            return acc;
          }, {})
        }
      };
    }
  }
};

module.exports = veridaService;