const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Ensure the correct Verida API endpoint is used
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
      
      let tokenObj = authToken;
      if (typeof authToken === 'string') {
        if (authToken.startsWith('{')) {
          try {
            tokenObj = JSON.parse(authToken);
            console.log('Successfully parsed token as JSON object');
          } catch (e) {
            console.log('Token is not in JSON format');
          }
        }
      }
      
      if (tokenObj.token && tokenObj.token.did) {
        console.log('Extracted DID from token object:', tokenObj.token.did);
        return tokenObj.token.did;
      }

      if (process.env.DEFAULT_DID && process.env.DEFAULT_DID !== 'unknown') {
        console.log('Using DEFAULT_DID from environment:', process.env.DEFAULT_DID);
        return process.env.DEFAULT_DID;
      }
      
      try {
        const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
        
        try {
          console.log('Attempting to fetch profile from Verida API with token');
          const profileResponse = await axios({
            method: 'GET',
            url: `${VERIDA_API_BASE_URL}/api/profile`,
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            timeout: 10000
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
        
        console.log('Attempting test query to Verida API');
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
        
        console.log('Successfully retrieved DID:', process.env.DEFAULT_DID || 'unknown');
        return process.env.DEFAULT_DID || 'unknown';
      } catch (apiError) {
        console.warn(`API test failed:`, apiError.message);
        if (apiError.response) {
          console.log('Error response:', apiError.response.status, apiError.response.statusText);
        }
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
      
      try {
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
          timeout: 10000
        });
        
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