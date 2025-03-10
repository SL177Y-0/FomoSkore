import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { usePrivy } from "@privy-io/react-auth";

function FOMOscore({ user }) {
FOMOscore.propTypes = {
  user: PropTypes.shape({
    authToken: PropTypes.string,
    token: PropTypes.string,
    did: PropTypes.string,
    username: PropTypes.string,
  }).isRequired,
};
  const [fomoData, setFomoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user: privyUser } = usePrivy();

  // Fetch FOMOscore on component mount
  useEffect(() => {
    const fetchFOMOscore = async () => {
      try {
        setLoading(true);
        
        // Make sure we have auth token in the right format
        const authToken = user?.authToken || user?.token || '';
        const did = user?.did || 'unknown';
        
        // Log authentication information for debugging
        console.log('User authentication data:', {
          did: did,
          authToken: authToken ? `${authToken.substring(0, 10)}...` : 'none',
          source: user?.authToken ? 'verida' : (user?.token ? 'session' : 'unknown')
        });
        
        // Get privyId from localStorage if we have a test user
        let privyId = null;
        const testUserString = localStorage.getItem('dev-test-user');
        if (testUserString) {
          try {
            const testUser = JSON.parse(testUserString);
            privyId = testUser.id;
            console.log('Using test user ID:', privyId);
          } catch (e) {
            console.error("Error parsing test user:", e);
          }
        }
        
        // Extract Privy ID if available from Privy authentication
        if (privyUser?.id) {
          privyId = privyUser.id;
          console.log('Using Privy user ID:', privyId);
        }
        
        // If no privyId but we have Verida user, use the DID as the ID
        if (!privyId && did && did !== 'unknown') {
          privyId = did;
          console.log('Using Verida DID as ID:', privyId);
        }
        
        // If still no ID, use a generic guest ID
        if (!privyId) {
          privyId = 'guest';
          console.log('Using guest ID as fallback');
        }
        
        // Determine a valid wallet address
        let walletAddress = null;
        
        // For Verida users, we use a placeholder to tell the backend this is a Verida wallet
        if (user?.did && user?.authToken) {
          walletAddress = 'verida-wallet';
        } 
        // For Privy users, get the actual wallet address
        else if (privyUser?.wallet?.address) {
          walletAddress = privyUser.wallet.address;
        }
        
        // Make sure wallet address is never the string "null"
        if (!walletAddress || walletAddress === 'null') {
          walletAddress = null;
        }
        
        // Determine username
        let username = 'guest';
        if (user?.username) {
          username = user.username;
        } else if (privyUser?.twitter?.username) {
          username = privyUser.twitter.username;
        } else if (did !== 'unknown') {
          username = 'verida-user';
        }
        
        console.log('Sending score request with:', {
          did,
          authToken: authToken ? 'present' : 'missing',
          privyId,
          username,
          walletAddress: walletAddress || 'null'
        });
        
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/fomoscore/score`,
          {
            did: did,
            authToken: authToken,
            privyId: privyId,
            username: username,
            address: walletAddress || null
          }
        );
        
        // Update the user DID if it was retrieved on the server side
        if (response.data.did && (!user.did || user.did === 'unknown')) {
          console.log(`Server retrieved DID: ${response.data.did}`);
        }
        
        console.log('Received FOMO score data:', response.data);
        setFomoData(response.data);
        
        // If we have an overall score update, trigger a refresh of the main dashboard
        if (response.data.totalScore !== null && window.updateOverallScore) {
          window.updateOverallScore(response.data.totalScore);
        }
      } catch (err) {
        console.error('Error fetching FOMOscore:', err);
        
        // Handle specific error cases
        if (err.response?.data?.error === 'Invalid DID') {
          setError('Invalid Verida DID. Please try reconnecting with Verida.');
        } else {
          setError(err.response?.data?.message || 'Failed to calculate your FOMOscore. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    // Only run if we have some kind of user data
    if (user) {
      fetchFOMOscore();
    } else {
      setError('Missing user information. Please log in again.');
      setLoading(false);
    }
  }, [user, privyUser]);

  // Get score category based on FOMOscore value
  const getScoreCategory = (score) => {
    if (score < 3) return { category: 'Noob', description: 'You\'re quite content with missing out. Kudos!' };
    if (score < 6) return { category: 'Intern', description: 'You\'re occasionally worried about missing the action.' };
    if (score < 8) return { category: 'Associate', description: 'You\'re often concerned about missing important events.' };
    return { category: 'Pro', description: 'You can\'t stand the thought of missing anything!' };
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-full max-w-2xl text-center border border-gray-700">
        <h2 className="text-2xl font-bold text-green-400 mb-6">Calculating your FOMOscore...</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    // Check if the error is related to DID
    const isDIDError = error.includes('DID') || error.includes('Verida');
    
    return (
      <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-full max-w-2xl text-center border border-gray-700">
        <h2 className="text-2xl font-bold text-red-400 mb-6">Oops! Something went wrong</h2>
        <p className="text-gray-300 mb-4">{error}</p>
        
        {isDIDError && (
          <p className="text-gray-400 mb-4">
            This error is likely because we couldn't retrieve your Verida identity. 
            Make sure you have a Verida account and have granted the necessary permissions.
          </p>
        )}
      </div>
    );
  }

  // Success state
  const scoreInfo = fomoData ? getScoreCategory(fomoData.score) : null;
  const hasKeywordMatches = fomoData?.data?.keywordMatches?.totalCount > 0;

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-full max-w-2xl text-center border border-gray-700">
      <h2 className="text-3xl font-bold text-green-400 mb-6">Your FOMOscore</h2>
      
      <div className="mb-4">
        <p className="text-gray-400">Verida DID: <span className="text-gray-300 font-mono text-sm">{user?.did || 'Not connected'}</span></p>
      </div>
      
      {fomoData && (
        <div>
          {/* Add warning if no Telegram data found */}
          {fomoData.data.groups === 0 && fomoData.data.messages === 0 && (
            <div className="bg-yellow-900 bg-opacity-30 p-4 rounded-lg mb-6">
              <p className="text-yellow-300 mb-2">No Telegram data found in your Verida vault.</p>
              <p className="text-gray-300 mb-4">Please sync your Telegram with Verida first by installing the Verida Wallet app.</p>
              <a href="https://www.verida.io/wallet" target="_blank" rel="noopener noreferrer" 
                 className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition">
                Get Verida Wallet
              </a>
            </div>
          )}
          
          <div className="flex justify-center mb-6">
            <div className="relative h-36 w-36 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{fomoData.score}</span>
              <span className="text-gray-400 text-sm absolute bottom-8">/10</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-yellow-400 mb-2">{scoreInfo.category}</h3>
          <p className="text-gray-300 mb-6">{scoreInfo.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <span className="block text-gray-400 text-sm">Telegram Groups</span>
              <span className="block text-2xl font-bold text-white">{fomoData.data.groups}</span>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <span className="block text-gray-400 text-sm">Telegram Messages</span>
              <span className="block text-2xl font-bold text-white">{fomoData.data.messages}</span>
            </div>
          </div>
          
          {/* Add Engage Bonus section */}
          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <h3 className="text-xl font-bold text-green-400 mb-2">Engage Bonus</h3>
            <p className="text-gray-300 mb-4">
              How much you gossip about crypto topics
            </p>
            
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">{fomoData.data.keywordMatches?.totalCount || 0}</span>
              <span className="text-gray-400 ml-2">Total Matches</span>
            </div>
            
            {hasKeywordMatches && (
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(fomoData.data.keywordMatches.keywords).map(([keyword, count]) => (
                  <div key={keyword} className="bg-gray-600 px-3 py-1 rounded-full flex items-center">
                    <span className="text-gray-300">{keyword}</span>
                    <span className="ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FOMOscore; 