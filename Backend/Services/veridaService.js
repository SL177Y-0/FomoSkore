const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Get the Verida network from environment variables
const VERIDA_NETWORK = process.env.VERIDA_NETWORK || 'mainnet';
console.log(`Using Verida network: ${VERIDA_NETWORK}`);

// Define the CORRECT API endpoint based on the sandbox example
const VERIDA_API_BASE_URL = "https://api.verida.ai";
console.log(`Using Verida API endpoint: ${VERIDA_API_BASE_URL}`);

// The correct encoded schemas from the sandbox example
const GROUP_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvZ3JvdXAvdjAuMS4wL3NjaGVtYS5qc29u';
const MESSAGE_SCHEMA_ENCODED = 'aHR0cHM6Ly9jb21tb24uc2NoZW1hcy52ZXJpZGEuaW8vc29jaWFsL2NoYXQvbWVzc2FnZS92MC4xLjAvc2NoZW1hLmpzb24%3D';

// Keywords to check for "Engage Bonus"
const ENGAGE_KEYWORDS = ['cluster', 'protocol', 'ai'];

// Helper function to check for keywords in text content
function checkForKeywords(text, keywordMatches) {
  if (!text) return;
  
  const normalizedText = text.toLowerCase();
  
  ENGAGE_KEYWORDS.forEach(keyword => {
    // Match whole words, case insensitive, including:
    // - Within sentences
    // - In capital letters
    // - In hashtags (#keyword)
    // - Multiple keywords in same text
    
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
        console.log(`Keyword match: '${keyword}' at position ${foundPos} in text: "${text.substring(Math.max(0, foundPos-10), Math.min(text.length, foundPos+keyword.length+10))}..."`);
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

      console.log('Fetching user DID with auth token:', authToken.substring(0, 10) + '...');
      
      // Parse token if it's a JSON structure (Verida sometimes returns this format)
      let tokenObj = authToken;
      if (typeof authToken === 'string') {
        // If the token is a string, check if it's JSON or a Bearer token
        if (authToken.startsWith('{')) {
          try {
            tokenObj = JSON.parse(authToken);
            console.log('Successfully parsed token as JSON object');
          } catch (e) {
            console.log('Token is not in JSON format');
            // Not JSON, keep as-is
          }
        }
      }
      
      // Extract DID from token object if present
      if (tokenObj.token && tokenObj.token.did) {
        console.log('Extracted DID from token object:', tokenObj.token.did);
        return tokenObj.token.did;
      }

      // First try to use the default DID from .env if available
      if (process.env.DEFAULT_DID && process.env.DEFAULT_DID !== 'unknown') {
        console.log('Using DEFAULT_DID from environment:', process.env.DEFAULT_DID);
        return process.env.DEFAULT_DID;
      }
      
      // If we can't get the DID from the environment, try an API call
      try {
        // Format auth header correctly - EXACTLY as shown in example
        const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
        
        // Try to get user profile info
        try {
          console.log('Attempting to fetch profile from Verida API with token');
          const VERIDA_API_BASE_URL = 'https://api.verida.network'; // Ensure this is correct
          
          const profileResponse = await axios({
            method: 'GET',
            url: `${VERIDA_API_BASE_URL}/api/profile`,
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // Increased timeout
          });
          
          console.log('Profile API response:', profileResponse.status, 
                      profileResponse.data ? 'with data' : 'no data');
          
          if (profileResponse.data?.did) {
            console.log('Retrieved DID from profile:', profileResponse.data.did);
            return profileResponse.data.did;
          } else {
            console.log('Profile response did not contain DID:', JSON.stringify(profileResponse.data).substring(0, 200));
          }
        } catch (profileError) {
          console.warn('Profile lookup failed:', profileError.message);
          if (profileError.response) {
            console.log('Error response:', profileError.response.status, profileError.response.statusText);
          }
        }
        
        // Try to query for Telegram groups - this should fail if the token is invalid
        // but if it works, we know the token is valid
        console.log('Attempting test query to Verida API');
        const GROUP_SCHEMA_ENCODED = encodeURIComponent('https://schema.verida.io/social/chat/group/v0.1.0/schema.json');
        const VERIDA_API_BASE_URL = 'https://api.verida.network'; // Ensure this is correct
        
        const testResponse = await axios({
          method: 'POST',
          url: `${VERIDA_API_BASE_URL}/api/rest/v1/ds/query/${GROUP_SCHEMA_ENCODED}`,
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
          timeout: 10000 // Increased timeout
        });
        
        console.log(`Test query response status:`, testResponse.status);
        
        // If we made it here, the token is valid
        // Try to extract DID from token directly - some versions store it differently
        if (authToken.includes('did:')) {
          const didMatch = authToken.match(/did:[^:]+:[^:]+:[^&\s]+/);
          if (didMatch) {
            console.log('Extracted DID from token string:', didMatch[0]);
            return didMatch[0];
          }
        }
        
        // If we made it here, the auth token is valid, so we can use the default DID
        console.log('Successfully retrieved DID:', process.env.DEFAULT_DID || 'unknown');
        return process.env.DEFAULT_DID || 'unknown';
      } catch (apiError) {
        console.warn(`API test failed:`, apiError.message);
        if (apiError.response) {
          console.log('Error response:', apiError.response.status, apiError.response.statusText);
        }
        // Continue and try the next option
      }
      
      // If we get here, we couldn't determine the DID
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
      // For Verida API calls, we only need the auth token
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      console.log('Querying Verida with:', { did, authToken: authToken.substring(0, 10) + '...' });
      
      // Format auth header correctly - EXACTLY as shown in example
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Use the exact same API schema and structure as shown in the sandbox
      let groups = 0;
      let messages = 0;
      let messageItems = [];
      let keywordMatches = {
        totalCount: 0,
        keywords: {}
      };
      
      // Initialize keyword counts
      ENGAGE_KEYWORDS.forEach(keyword => {
        keywordMatches.keywords[keyword] = 0;
      });
      
      try {
        // Query for Telegram chat groups using the exact format from the example
        const groupsResponse = await axios({
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
          timeout: 10000 // 10 second timeout
        });
        
        // Query for Telegram chat messages using the exact format from the example
        const messagesResponse = await axios({
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
          timeout: 10000 // 10 second timeout
        });
        
        // Log response samples for debugging
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
        
        // Extract data from responses
        groups = groupsResponse.data?.results?.length || 0;
        messageItems = messagesResponse.data?.results || [];
        messages = messageItems.length;
        
        // Process message content for keyword matches
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
        // If the direct query fails, we can try the universal search instead
        
        try {
          // Try universal search as a fallback
          const searchResponse = await axios({
            method: 'GET',
            url: `${VERIDA_API_BASE_URL}/api/rest/v1/search/universal?keywords=telegram`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader
            },
            timeout: 10000 // 10 second timeout
          });
          
          if (searchResponse.data && searchResponse.data.items) {
            const telegramItems = searchResponse.data.items.filter(item => 
              item.schema?.includes('chat/group') || 
              item.schema?.includes('chat/message') || 
              item.name?.toLowerCase().includes('telegram')
            );
            
            console.log(`Found ${telegramItems.length} Telegram-related items in search results`);
            
            // Set the counts based on the search results
            groups = telegramItems.filter(item => item.schema?.includes('chat/group')).length;
            messageItems = telegramItems.filter(item => item.schema?.includes('chat/message'));
            messages = messageItems.length;
            
            // Process message content for keyword matches
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