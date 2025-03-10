const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Updated base endpoints with new API structure
const PRIMARY_VERIDA_API_URL = "https://api.verida.ai/api/rest/v1";
const LEGACY_VERIDA_API_URL = "https://api.verida.io/api/rest/v1";

console.log(`Using Verida API primary endpoint: ${PRIMARY_VERIDA_API_URL} with fallback`);

// Encoded schemas remain unchanged
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
    console.log(`Request succeeded with primary domain`);
    return primaryResponse;
  } catch (primaryError) {
    console.log(`Request failed with primary domain: ${primaryError.message}`);
    
    // Try with legacy domain as fallback
    try {
      console.log(`Trying fallback to legacy domain...`);
      const legacyResponse = await axios({
        ...options,
        url: `${LEGACY_VERIDA_API_URL}${endpoint}`
      });
      console.log(`Request succeeded with legacy domain`);
      return legacyResponse;
    } catch (legacyError) {
      console.error(`Request also failed with legacy domain: ${legacyError.message}`);
      throw legacyError; // Rethrow the last error
    }
  }
}

// Helper function to clean DID (remove context parameter)
function cleanDID(did) {
  if (typeof did === 'string') {
    return did.split('?')[0];
  }
  return did;
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
        !normalizedText[foundPos - 1].match(/[a-z0-9]/) || 
        normalizedText[foundPos - 1] === '#';
        
      const isWordEnd = foundPos + lowerKeyword.length >= normalizedText.length || 
        !normalizedText[foundPos + lowerKeyword.length].match(/[a-z0-9]/);
      
      if (isWordStart && isWordEnd) {
        keywordMatches.keywords[keyword]++;
        keywordMatches.totalCount++;
        console.log(`Keyword match: '${keyword}' at position ${foundPos} in text: "${text.substring(Math.max(0, foundPos - 10), Math.min(text.length, foundPos + lowerKeyword.length + 10))}..."`);
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
      
      // Attempt to parse token as JSON
      let tokenObj = authToken;
      if (typeof authToken === 'string') {
        try {
          if (authToken.startsWith('{')) {
            tokenObj = JSON.parse(authToken);
            console.log('Successfully parsed token as JSON object');
          } else if (authToken.includes('"token"') || authToken.includes('"did"')) {
            try {
              tokenObj = JSON.parse(authToken);
              console.log('Successfully parsed token as JSON object');
            } catch (e) {
              console.log('Token contains JSON-like patterns but is not valid JSON');
            }
          }
        } catch (e) {
          console.log('Token is not in JSON format');
        }
      }
      
      if (tokenObj.token && tokenObj.token.did) {
        console.log('Extracted DID from token object:', tokenObj.token.did);
        return cleanDID(tokenObj.token.did);
      }
      
      if (tokenObj.did) {
        console.log('Extracted DID from token object:', tokenObj.did);
        return cleanDID(tokenObj.did);
      }

      // Format auth header
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Use the updated Connection Profiles endpoint instead of /api/profile
      try {
        console.log('Attempting to fetch connection profile from Verida API with token');
        const profileResponse = await tryVeridaRequest('/connections/profiles', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (profileResponse.data?.did) {
          console.log('Retrieved DID from connection profile:', profileResponse.data.did);
          return cleanDID(profileResponse.data.did);
        }
      } catch (profileError) {
        console.warn('Connection profile lookup failed:', profileError.message);
      }

      // Fallback: use the Connection Status endpoint instead of /api/user/info
      try {
        console.log('Attempting to fetch connection status from Verida API');
        const statusResponse = await tryVeridaRequest('/connections/status', {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (statusResponse.data?.did) {
          console.log('Retrieved DID from connection status:', statusResponse.data.did);
          return cleanDID(statusResponse.data.did);
        }
      } catch (statusError) {
        console.warn('Connection status lookup failed:', statusError.message);
      }
      
      // Test query on datastore as a last resort; note the endpoint now omits the extra base path
      try {
        console.log('Attempting test query to Verida API');
        const testResponse = await tryVeridaRequest(`/ds/query/${GROUP_SCHEMA_ENCODED}`, {
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
        console.log(`Test query response data:`, JSON.stringify(testResponse.data).substring(0, 200));
        
        if (testResponse.data && testResponse.data.items && testResponse.data.items.length > 0) {
          for (const item of testResponse.data.items) {
            if (item.owner && item.owner.startsWith('did:')) {
              console.log('Found DID in item owner:', item.owner);
              return cleanDID(item.owner);
            }
          }
          
          const responseStr = JSON.stringify(testResponse.data);
          const didMatch = responseStr.match(/did:vda:[^"',\s}]+/);
          if (didMatch) {
            console.log('Extracted DID from response:', didMatch[0]);
            return cleanDID(didMatch[0]);
          }
        }
      } catch (apiError) {
        console.warn(`API test failed:`, apiError.message);
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
      
      console.log('Querying Verida with:', { did: cleanDID(did), authToken: authToken.substring(0, 10) + '...' });
      
      let parsedAuthToken = authToken;
      if (typeof authToken === 'string' && authToken.startsWith('{')) {
        try {
          const tokenObj = JSON.parse(authToken);
          if (tokenObj.token && tokenObj.token._id) {
            parsedAuthToken = tokenObj.token._id;
            console.log('Extracted auth token from JSON object:', parsedAuthToken.substring(0, 10) + '...');
          }
        } catch (e) {
          console.log('Failed to parse auth token as JSON, using as-is');
        }
      }
      
      const authHeader = parsedAuthToken.startsWith('Bearer ') ? parsedAuthToken : `Bearer ${parsedAuthToken}`;
      
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
      
      // First try the count API (updated endpoint)
      try {
        const groupsCountResponse = await tryVeridaRequest(`/ds/count/${GROUP_SCHEMA_ENCODED}`, {
          method: 'POST',
          data: {},
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        const messagesCountResponse = await tryVeridaRequest(`/ds/count/${MESSAGE_SCHEMA_ENCODED}`, {
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
        
        try {
          const groupsResponse = await tryVeridaRequest(`/ds/query/${GROUP_SCHEMA_ENCODED}`, {
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
          
          const messagesResponse = await tryVeridaRequest(`/ds/query/${MESSAGE_SCHEMA_ENCODED}`, {
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
          
          // Final attempt with search API (updated endpoint)
          try {
            const searchResponse = await tryVeridaRequest('/search/universal?keywords=telegram', {
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
