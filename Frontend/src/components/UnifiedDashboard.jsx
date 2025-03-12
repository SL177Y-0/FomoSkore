import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import TwitterAuth from "../Home/TwitterAuth";
import WalletConnect from "../Home/WalletConnect";
import DownloadButton from "../Home/DownloadButton";
import axios from "axios";
import "../Verida/VeridaStyles.css";
import "./UnifiedDashboard.css";
import { calculateAdvancedScore } from "../utils/scoreCalculator";

const UnifiedDashboard = () => {
  const { privyId, username, address } = useParams();
  const { logout, user } = usePrivy();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Global state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Score states
  const [totalScore, setTotalScore] = useState(0);
  const [twitterScore, setTwitterScore] = useState(0);
  const [walletScore, setWalletScore] = useState(0);
  const [veridaScore, setVeridaScore] = useState(0);
  const [badges, setBadges] = useState([]);
  const [componentScores, setComponentScores] = useState({});
  const [scoreTitle, setScoreTitle] = useState("BEGINNER");
  
  // Connection states
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isVeridaConnected, setIsVeridaConnected] = useState(false);
  const [isVeridaConnecting, setIsVeridaConnecting] = useState(false);
  
  // Data states
  const [twitterData, setTwitterData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [veridaData, setVeridaData] = useState(null);
  
  // Verida states
  const [veridaUser, setVeridaUser] = useState(null);
  const [veridaAuthToken, setVeridaAuthToken] = useState(null);
  const [veridaGroups, setVeridaGroups] = useState([]);
  const [veridaMessages, setVeridaMessages] = useState([]);
  const [veridaDashboardTab, setVeridaDashboardTab] = useState('overview'); // 'overview', 'groups', or 'messages'
  
  // Score panel states
  const [activeScoreTab, setActiveScoreTab] = useState('breakdown'); // 'breakdown' or 'download'

  // Get data for Verida groups
  const getVeridaGroupsData = () => {
    // Simulated groups data - in production this would come from Verida API
    return [
      { id: 'grp1', name: 'Crypto Enthusiasts', members: 124, activity: 'high', lastActive: '2h ago' },
      { id: 'grp2', name: 'NFT Collectors', members: 89, activity: 'medium', lastActive: '4h ago' },
      { id: 'grp3', name: 'DeFi Discussion', members: 156, activity: 'high', lastActive: '1h ago' },
      { id: 'grp4', name: 'Blockchain Developers', members: 72, activity: 'low', lastActive: '1d ago' },
      { id: 'grp5', name: 'Metaverse Projects', members: 63, activity: 'medium', lastActive: '6h ago' },
    ];
  };

  // Get data for Verida messages
  const getVeridaMessagesData = () => {
    // Simulated messages data - in production this would come from Verida API
    return [
      { id: 'msg1', group: 'Crypto Enthusiasts', sender: 'alex.eth', content: 'Just saw the latest update on Ethereum...', time: '2h ago' },
      { id: 'msg2', group: 'NFT Collectors', sender: 'nftmaxima', content: 'Anyone interested in the new drop?', time: '3h ago' },
      { id: 'msg3', group: 'DeFi Discussion', sender: 'defi_whiz', content: 'Yield farming strategies for Q4 are looking promising', time: '5h ago' },
      { id: 'msg4', group: 'Crypto Enthusiasts', sender: 'satoshi_fan', content: 'What do you think about the recent market movement?', time: '6h ago' },
      { id: 'msg5', group: 'Blockchain Developers', sender: 'dev_jane', content: 'Found a great library for smart contract testing', time: '1d ago' },
    ];
  };

  // Calculate score based on connections
  const calculateScore = () => {
    // Log the data we have for debugging
    console.log("Calculating score with:", { 
      twitter: isTwitterConnected, twitterData, 
      wallet: isWalletConnected, walletData, 
      verida: isVeridaConnected, veridaData 
    });
    
    try {
      // Use the advanced algorithm if we have the required data
      if (twitterData || walletData || veridaData) {
        const advancedScoreResult = calculateAdvancedScore(
          twitterData, 
          walletData, 
          veridaData
        );
        
        console.log("Advanced score calculation result:", advancedScoreResult);
        
        // Store the badges for use in the UI
        setBadges(advancedScoreResult.badges || []);
        
        // Store the component scores for detailed breakdown
        setComponentScores(advancedScoreResult.components || {});
        
        // Update individual scores based on the new calculation
        if (twitterData) {
          setTwitterScore(advancedScoreResult.components.socialScore || 0);
        }
        
        if (walletData) {
          setWalletScore(advancedScoreResult.components.cryptoScore + 
                        advancedScoreResult.components.nftScore || 0);
        }
        
        if (veridaData) {
          setVeridaScore(advancedScoreResult.components.telegramScore || 0);
        }
        
        // Set the total score
        setTotalScore(advancedScoreResult.score || 0);
        return;
      }
      
      // Legacy/fallback scoring logic if we don't have detailed data
      // Base scores
      let twitterScore = isTwitterConnected ? 5 : 0;
      let walletScore = isWalletConnected ? 6 : 0;
      let veridaScore = isVeridaConnected ? 8 : 0;
      
      if (veridaData && veridaData.score) {
        veridaScore = veridaData.score;
      }
      
      // If we have wallet data, calculate a more dynamic score
      if (walletData) {
        const tokenCount = walletData.tokenBalances?.length || 0;
        const nftCount = walletData.walletNFTs?.result?.length || 0;
        
        // Adjust wallet score based on tokens and NFTs
        walletScore = Math.min(8, 3 + (tokenCount > 0 ? 2 : 0) + (nftCount > 0 ? 3 : 0));
      }
      
      // If we have Twitter data, calculate a more dynamic score
      if (twitterData) {
        const followers = twitterData.result?.legacy?.followers_count || 0;
        const tweetCount = twitterData.result?.legacy?.statuses_count || 0;
        
        // Adjust Twitter score based on followers and tweet count
        if (followers > 10000 || tweetCount > 5000) {
          twitterScore = 8;
        } else if (followers > 1000 || tweetCount > 1000) {
          twitterScore = 6;
        } else {
          twitterScore = 4;
        }
      }
      
      // Store individual scores
      setTwitterScore(twitterScore);
      setWalletScore(walletScore);
      setVeridaScore(veridaScore);
      
      // Calculate average for connected services
      let connectedCount = 0;
      let scoreSum = 0;
      
      if (isTwitterConnected) {
        connectedCount++;
        scoreSum += twitterScore;
      }
      
      if (isWalletConnected) {
        connectedCount++;
        scoreSum += walletScore;
      }
      
      if (isVeridaConnected) {
        connectedCount++;
        scoreSum += veridaScore;
      }
      
      // Calculate final score (average of connected services)
      const finalScore = connectedCount > 0 
        ? parseFloat((scoreSum / connectedCount).toFixed(1)) 
        : 0;
      
      setTotalScore(finalScore);
      
      // Legacy badges
      setBadges([
        isTwitterConnected ? "Twitter Connected" : null,
        isWalletConnected ? "Wallet Connected" : null,
        isVeridaConnected ? "Verida Connected" : null
      ].filter(Boolean));
      
    } catch (error) {
      console.error("Error calculating score:", error);
      // Fallback to a default score
      setTotalScore(0);
    }
  };

  // Initialize the dashboard with user data
  useEffect(() => {
    // Check if user has wallet already connected
    if (address && address !== 'null') {
      setIsWalletConnected(true);
    }
    
    // Check if user has Twitter already connected
    if (username && username !== 'guest') {
      setIsTwitterConnected(true);
    }
    
    // Calculate initial scores
    setTimeout(() => {
      calculateScore();
      setLoading(false);
    }, 1000);
  }, [address, username]);
  
  const connectWithVerida = () => {
    setIsVeridaConnecting(true);
    setError(null); // Clear any previous errors
    
    // Use the backend API to handle Verida auth
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    
    // Get the current full URL including the path (with Privy ID, username, etc.)
    const currentUrl = window.location.href;
    
    // Create the callback URL that includes the redirectUrl back to the current page
    const callbackUrl = `${apiBaseUrl}/auth/callback?redirectUrl=${encodeURIComponent(currentUrl)}`;
    
    // Consistent format with working implementation
    const scopes = [
      'api:ds-query',
      'api:search-universal',
      'ds:social-email',
      'api:search-ds',
      'api:search-chat-threads',
      'ds:r:social-chat-group',
      'ds:r:social-chat-message'
    ].join('&scopes=');
    
    const appDID = 'did:vda:mainnet:0x87AE6A302aBf187298FC1Fa02A48cFD9EAd2818D';
    
    // Create the auth URL with the callback URL to our backend
    const authUrl = `https://app.verida.ai/auth?scopes=${scopes}&redirectUrl=${encodeURIComponent(callbackUrl)}&appDID=${encodeURIComponent(appDID)}`;
    
    console.log("Redirecting to Verida auth:", authUrl);
    
    // Use direct redirect like the working implementation
    window.location.href = authUrl;
  };
  
  // Process URL query params - specifically for Verida auth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (searchParams.toString()) {
      console.log("Found URL parameters:", Object.fromEntries([...searchParams]));
      
      // Check for error parameters
      const error = searchParams.get("error");
      const errorMessage = searchParams.get("message");
      
      if (error) {
        console.error("Auth error:", error, errorMessage);
        setError(`Authentication error: ${errorMessage || error}`);
        setIsVeridaConnecting(false);
        
        // Clear URL parameters
        if (window.history.replaceState) {
          const url = window.location.href.split('?')[0];
          window.history.replaceState({}, document.title, url);
        }
        return;
      }
      
      // Check for auth token parameter
      const authToken = searchParams.get("auth_token") || searchParams.get("authToken");
      
      // Process token parameter directly from Verida if present
      const tokenParam = searchParams.get("token");
      
      if (tokenParam) {
        try {
          const tokenData = JSON.parse(tokenParam);
          console.log('Processing token data from Verida:', tokenData);
          
          // Extract token from Verida's structure
          let extractedToken;
          
          if (tokenData.token) {
            extractedToken = tokenData.token._id || tokenData.token;
          } else if (tokenData._id) {
            extractedToken = tokenData._id;
          }
          
          if (extractedToken) {
            // We only need the auth token, the DID will be fetched from the API
            handleVeridaAuth(extractedToken);
            return;
          }
        } catch (error) {
          console.error('Error parsing token data:', error);
        }
      }
      
      // Process auth token from backend callback
      if (authToken) {
        // We only need the auth token, the DID will be fetched from the API
        handleVeridaAuth(authToken);
      }
    }
  }, [location]);

  // Handle Verida authentication with just the auth token
  const handleVeridaAuth = async (authToken) => {
    try {
      setIsVeridaConnecting(true);
      setError(null);
      
      console.log("Processing Verida auth with token:", authToken.substring(0, 10) + '...');
      
      // Store the auth token
      setVeridaAuthToken(authToken);
      
      // Fetch the DID from the Verida API
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/verida-auth/getDID`,
        { authToken }
      );
      
      if (response.data && response.data.did) {
        const did = response.data.did;
        console.log("Retrieved DID from API:", did);
        
        // Store the DID
        setVeridaUser({ did });
        setIsVeridaConnected(true);
        
        // Fetch score with the provided DID and token
        fetchVeridaScore(did, authToken, privyId);
        
        // Fetch groups and messages data
        setVeridaGroups(getVeridaGroupsData());
        setVeridaMessages(getVeridaMessagesData());
      } else {
        throw new Error("Failed to retrieve DID from auth token");
      }
      
      // Clear URL parameters
      if (window.history.replaceState) {
        const url = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, url);
      }
    } catch (error) {
      console.error("Error processing Verida auth:", error);
      setError(`Verida authentication error: ${error.response?.data?.error || error.message}`);
      setIsVeridaConnecting(false);
      
      // In debug mode, try with a test DID
      if (import.meta.env.VITE_DEBUG_MODE === 'true') {
        console.log("Debug mode is enabled, setting test auth data despite error");
        setVeridaUser({ did: 'test-debug-did' });
        setVeridaAuthToken('test-debug-token');
        setIsVeridaConnected(true);
        fetchVeridaScore('test-debug-did', 'test-debug-token', privyId);
        setVeridaGroups(getVeridaGroupsData());
        setVeridaMessages(getVeridaMessagesData());
      }
    }
  };

  // Update scores when connection status changes
  useEffect(() => {
    calculateScore();
  }, [isTwitterConnected, isWalletConnected, isVeridaConnected, veridaData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchVeridaScore = async (did, authToken, privyId) => {
    try {
      console.log("Fetching Verida score with:", { 
        did, 
        authToken: authToken ? (authToken.substring(0, 10) + '...') : 'none',
        privyId
      });
      
      // Check if we're in debug mode
      if (import.meta.env.VITE_DEBUG_MODE === 'true' && (did.includes('test-debug') || authToken.includes('test-debug'))) {
        console.log("Debug mode detected with test credentials, using mock data");
        
        // Create mock data for testing
        const mockData = {
          did: did || 'test-debug-did',
          score: 8.5,
          data: {
            telegram: {
              groups: 15,
              messages: 350,
              engagementRate: 0.65
            },
            keywordMatches: {
              totalCount: 12,
              keywords: {
                cluster: 4,
                protocol: 5,
                ai: 3
              }
            }
          }
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setVeridaData(mockData);
        setIsVeridaConnected(true);
        calculateScore();
        setIsVeridaConnecting(false);
        return;
      }
      
      // Validate inputs before making the API call
      if (!authToken) {
        throw new Error('Missing Verida authentication token');
      }
      
      // Handle the case where the auth token might be a JSON string
      let processedToken = authToken;
      if (typeof authToken === 'string' && authToken.startsWith('{')) {
        try {
          const tokenObj = JSON.parse(authToken);
          // Extract the actual token from the object if needed
          if (tokenObj.token && tokenObj.token._id) {
            processedToken = tokenObj.token._id;
            console.log("Extracted token from JSON object");
          }
        } catch (e) {
          // If parsing fails, use the token as-is
          console.log("Using auth token as-is (parsing failed)");
        }
      }
      
      // Fix the API endpoint to match the backend implementation
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/verida/score`,
        {
          did: did,
          authToken: processedToken,
          privyId: privyId
        },
        {
          timeout: 15000 // 15 second timeout
        }
      );
      
      console.log("Verida score response:", response.data);
      
      if (response.data && response.data.did && did === "pending-from-token") {
        console.log("Updating user DID from API response:", response.data.did);
        setVeridaUser({ did: response.data.did });
      }
      
      // Check if we got valid data
      if (response.data && (response.data.score !== undefined || response.data.data)) {
        // Store the complete Verida data for advanced scoring
        setVeridaData(response.data);
        
        // Update Verida connection status
        setIsVeridaConnected(true);
        
        // Update Verida score in overall scores via calculateScore
        calculateScore();
        
        // Show a success message
        setError(null); // Clear any existing error
      } else {
        console.warn("Received response but no score data:", response.data);
        throw new Error('No score data received from server');
      }
      
      // Make sure we're not in connecting state anymore
      setIsVeridaConnecting(false);
      
    } catch (err) {
      console.error("❌ Error fetching Verida score:", err);
      
      // Provide a more specific error message based on the error
      if (err.response?.status === 401) {
        setError(`Authentication error: Your Verida token is invalid or expired`);
      } else if (err.response?.status === 404) {
        setError(`API endpoint not found. Check server configuration.`);
      } else if (err.code === 'ECONNABORTED') {
        setError(`Connection timeout. The server is taking too long to respond.`);
      } else if (err.message.includes('Network Error')) {
        setError(`Network error. Make sure the server is running.`);
      } else {
        setError(`Error: ${err.response?.data?.message || err.message}`);
      }
      
      // If debug mode is enabled, use test data
      if (import.meta.env.VITE_DEBUG_MODE === 'true') {
        console.log("Debug mode enabled, using test data despite error");
        
        const testData = {
          did: did || 'error-recovery-did',
          score: 7.5,
          data: {
            telegram: {
              groups: 10,
              messages: 250,
              engagementRate: 0.55
            },
            keywordMatches: {
              totalCount: 8,
              keywords: {
                cluster: 3,
                protocol: 4,
                ai: 1
              }
            }
          }
        };
        
        setVeridaData(testData);
        setIsVeridaConnected(true);
        calculateScore();
      } else {
        setIsVeridaConnected(false);
      }
      
      setIsVeridaConnecting(false);
    }
  };

  const getScoreColor = (score) => {
    if (!score && score !== 0) return "#777";
    if (score >= 9) return "#ff3b3b";
    if (score >= 7) return "#ff9500";
    if (score >= 5) return "#ffcc00";
    if (score >= 3) return "#34c759";
    return "#57c5ff";
  };

  // Handler for Twitter connection status updates
  const handleTwitterConnectionChange = (isConnected) => {
    setIsTwitterConnected(isConnected);
    calculateScore();
  };

  // Handler for Wallet connection status updates
  const handleWalletConnectionChange = (isConnected) => {
    setIsWalletConnected(isConnected);
    calculateScore();
  };

  // Update to store Twitter data for advanced scoring
  const handleTwitterDataReceived = (data) => {
    console.log("Received Twitter data:", data);
    setTwitterData(data);
    calculateScore();
  };
  
  // Update to store Wallet data for advanced scoring
  const handleWalletDataReceived = (data) => {
    console.log("Received Wallet data:", data);
    setWalletData(data);
    calculateScore();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col">
      {/* Top Navigation Bar */}
      <div className="dashboard-header p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-green-400">FomoScore</h1>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-gray-300">{username || user?.username || "Guest"}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Dashboard Content */}
      <div className="container mx-auto px-4 py-8 flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Top: FOMO Score */}
          <div className="card-container p-6">
            <h2 className="text-2xl font-bold text-center mb-4">Your FOMOScore</h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-4 text-gray-400">Calculating...</p>
              </div>
            ) : (
              <div className="text-center">
                <div 
                  className="score-circle mb-4" 
                  style={{ 
                    background: `conic-gradient(${getScoreColor(totalScore / 10)} ${totalScore * 10}%, var(--v-card-background) 0)` 
                  }}
                >
                  <div className="score-value">{totalScore.toFixed(1)}</div>
                  <div className="score-scale">/ 10</div>
                </div>
                
                {/* Calculate score title based on total score */}
                {(() => {
                  let title = "BEGINNER";
                  if (totalScore < 3) title = "BEGINNER";
                  else if (totalScore < 6) title = "INTERMEDIATE";
                  else if (totalScore < 8) title = "ADVANCED";
                  else title = "EXPERT";
                  return (
                    <p className="score-category" style={{ color: getScoreColor(totalScore / 10) }}>{title}</p>
                  );
                })()}
                
                {/* Display badges */}
                {badges.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Your Badges</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {badges.map((badge, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 bg-gray-700 text-blue-300 rounded-full text-xs"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle Top: Score Breakdown Panel */}
          <div className="card-container">
            <div className="flex border-b border-gray-700">
              <button 
                className={`tab-button ${activeScoreTab === 'breakdown' ? 'active' : ''}`}
                onClick={() => setActiveScoreTab('breakdown')}
              >
                Score Breakdown
              </button>
              <button 
                className={`tab-button ${activeScoreTab === 'download' ? 'active' : ''}`}
                onClick={() => setActiveScoreTab('download')}
              >
                Download
              </button>
            </div>
            
            {activeScoreTab === 'breakdown' && (
              <div className="p-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
                
                {/* Twitter Score */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span>X/Twitter Score</span>
                    <span>{twitterScore.toFixed(1)}/10</span>
                  </div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar twitter-score-bar" 
                      style={{ width: `${twitterScore * 10}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Wallet Score */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span>Wallet Score</span>
                    <span>{walletScore.toFixed(1)}/10</span>
                  </div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar wallet-score-bar" 
                      style={{ width: `${walletScore * 10}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Verida Score */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span>Verida Score</span>
                    <span>{veridaScore.toFixed(1)}/10</span>
                  </div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar verida-score-bar" 
                      style={{ width: `${veridaScore * 10}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Advanced Component Scores */}
                {Object.keys(componentScores).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Detailed Components</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(componentScores)
                        .filter(([key, value]) => value > 0 && key !== 'socialScore' && key !== 'cryptoScore' && key !== 'telegramScore')
                        .map(([key, value]) => (
                          <div key={key} className="bg-gray-700 p-2 rounded">
                            <div className="flex justify-between text-xs">
                              <span>{key.replace('Score', '')}</span>
                              <span>{value.toFixed(1)}</span>
                            </div>
                            <div className="h-1 bg-gray-600 mt-1 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${Math.min(value * 10, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeScoreTab === 'download' && (
              <div className="p-6 border-t border-gray-700">
                <h2 className="text-xl font-bold mb-4">Download Your Score</h2>
                <DownloadButton 
                  score={totalScore} 
                  badges={badges}
                  componentScores={componentScores}
                />
              </div>
            )}
          </div>
          
          {/* Right Top: Wallet Connect */}
          <div className="card-container p-6 overflow-auto max-h-[600px]">
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <WalletConnect 
              walletAddress={address} 
              privyId={privyId} 
              onConnectionChange={handleWalletConnectionChange}
              onDataReceived={handleWalletDataReceived}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Bottom: X/Twitter Connect */}
          <div className="card-container p-6">
            <h2 className="text-xl font-bold mb-4">Connect X/Twitter</h2>
            <TwitterAuth 
              userId={username} 
              privyId={privyId} 
              onConnectionChange={handleTwitterConnectionChange}
              onDataReceived={handleTwitterDataReceived}
            />
          </div>
          
          {/* Middle Bottom: Verida Panel */}
          <div className="card-container p-6">
            <h2 className="text-xl font-bold mb-4 v-title">VERIDA</h2>
            
            {/* VERIDA PANEL */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Verida</h3>
                <div className="flex space-x-2">
                  {isVeridaConnected ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500 text-white flex items-center">
                      <span className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-600 text-gray-300">Not Connected</span>
                  )}
                  {isVeridaConnected && (
                    <button 
                      onClick={() => fetchVeridaScore(veridaUser?.did, veridaAuthToken, privyId)}
                      className="px-2 py-1 text-xs rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      disabled={isVeridaConnecting}
                    >
                      {isVeridaConnecting ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>
              </div>
              
              {isVeridaConnecting ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400">Connecting to Verida...</p>
                  <p className="text-gray-500 text-sm mt-2">Please wait while we authenticate with Verida</p>
                </div>
              ) : isVeridaConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">User DID:</p>
                      <p className="text-white font-mono text-xs truncate max-w-[240px]">{veridaUser?.did || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Score:</p>
                      <div className="bg-gray-900 rounded-full px-3 py-1">
                        <span className="text-xl font-bold text-blue-500">{veridaData?.score ? veridaData.score.toFixed(1) : '0.0'}</span>
                        <span className="text-gray-500">/10</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabs for different views */}
                  <div className="border-b border-gray-700 mt-2">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setVeridaDashboardTab('overview')}
                        className={`py-2 px-4 font-medium text-sm border-b-2 ${
                          veridaDashboardTab === 'overview'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setVeridaDashboardTab('groups')}
                        className={`py-2 px-4 font-medium text-sm border-b-2 ${
                          veridaDashboardTab === 'groups'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        Groups
                      </button>
                      <button
                        onClick={() => setVeridaDashboardTab('messages')}
                        className={`py-2 px-4 font-medium text-sm border-b-2 ${
                          veridaDashboardTab === 'messages'
                            ? 'border-blue-500 text-blue-500'
                            : 'border-transparent text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        Messages
                      </button>
                    </div>
                  </div>
                  
                  {/* Overview Tab Content */}
                  {veridaDashboardTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Telegram Groups</p>
                          <p className="text-white text-xl font-semibold">
                            {veridaData?.data?.telegram?.groups || 0}
                          </p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <p className="text-gray-400 text-sm">Telegram Messages</p>
                          <p className="text-white text-xl font-semibold">
                            {veridaData?.data?.telegram?.messages || 0}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-2">Engagement Keywords</p>
                        {veridaData?.data?.keywordMatches?.totalCount > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(veridaData.data.keywordMatches.keywords || {}).map(([keyword, count]) => (
                              <span key={keyword} className="bg-gray-800 px-2 py-1 rounded text-xs text-white flex items-center">
                                {keyword} <span className="ml-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{count}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No keyword matches found</p>
                        )}
                      </div>
                      
                      {/* Download score section */}
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <p className="text-gray-300 font-medium mb-2">Download Your Score</p>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => generateScoreBadge()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                            disabled={!isVeridaConnected}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Badge
                          </button>
                          <button 
                            onClick={() => downloadScoreImage()}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center"
                            disabled={!isVeridaConnected}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Image
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Groups Tab Content */}
                  {veridaDashboardTab === 'groups' && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {veridaGroups.length > 0 ? (
                        veridaGroups.map((group, index) => (
                          <div key={group.id || index} className="bg-gray-900 rounded-lg p-3 hover:bg-gray-850 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-medium">{group.name}</p>
                                <p className="text-gray-400 text-xs">{group.members} members</p>
                              </div>
                              <div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  group.activity === 'high' ? 'bg-green-500 text-white' :
                                  group.activity === 'medium' ? 'bg-yellow-500 text-gray-900' :
                                  'bg-gray-600 text-gray-300'
                                }`}>
                                  {group.activity}
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-500 text-xs mt-1">Last active: {group.lastActive}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-gray-400">No group data available</p>
                          {veridaData?.data?.telegram?.groups === 0 && (
                            <p className="text-gray-500 text-sm mt-2">Sync your Telegram data with Verida first</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Messages Tab Content */}
                  {veridaDashboardTab === 'messages' && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {veridaMessages.length > 0 ? (
                        veridaMessages.map((message, index) => (
                          <div key={message.id || index} className="bg-gray-900 rounded-lg p-3 hover:bg-gray-850 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="text-white font-medium">{message.sender}</p>
                                <p className="text-gray-400 text-xs">in {message.group}</p>
                              </div>
                              <span className="text-gray-500 text-xs">{message.time}</span>
                            </div>
                            <p className="text-gray-300 text-sm">{message.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-gray-400">No message data available</p>
                          {veridaData?.data?.telegram?.messages === 0 && (
                            <p className="text-gray-500 text-sm mt-2">Sync your Telegram data with Verida first</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-gray-400 mb-4">Connect to Verida to see your data</p>
                  <button 
                    onClick={connectWithVerida}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    disabled={isVeridaConnecting}
                  >
                    {isVeridaConnecting ? (
                      <>
                        <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Connect with Verida
                      </>
                    )}
                  </button>
                  <p className="text-gray-500 text-xs mt-4 text-center max-w-xs">
                    Connecting to Verida will calculate your Telegram engagement score
                  </p>
                </div>
              )}
              
              {error && error.includes('Verida') && (
                <div className="mt-4 bg-red-900 bg-opacity-50 text-red-200 p-3 rounded text-sm">
                  {error}
                </div>
              )}
            </div>
            {/* End of Verida Panel */}
          </div>
          
          {/* Right Bottom: Empty Cell */}
          <div className="card-container p-6">
            <h2 className="text-xl font-bold mb-4">Future Panel</h2>
            <p className="text-gray-400">This space is reserved for future functionality.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard; 