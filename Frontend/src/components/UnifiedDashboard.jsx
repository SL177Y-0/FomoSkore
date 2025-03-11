import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import TwitterAuth from "../Home/TwitterAuth";
import WalletConnect from "../Home/WalletConnect";
import DownloadButton from "../Home/DownloadButton";
import axios from "axios";
import "../Verida/VeridaStyles.css";
import "./UnifiedDashboard.css";

const UnifiedDashboard = () => {
  const { privyId, username, address } = useParams();
  const { logout, user } = usePrivy();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Global state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Score states
  const [fomoScore, setFomoScore] = useState({
    overall: 0,
    twitter: 0,
    wallet: 0,
    verida: 0
  });
  const [scoreTitle, setScoreTitle] = useState("BEGINNER");
  
  // Connection states
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  // Verida states
  const [veridaUser, setVeridaUser] = useState(null);
  const [veridaAuthToken, setVeridaAuthToken] = useState(null);
  const [veridaData, setVeridaData] = useState(null);
  const [isVeridaConnected, setIsVeridaConnected] = useState(false);
  const [isVeridaConnecting, setIsVeridaConnecting] = useState(false);
  
  // Add state for verida groups and messages
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
    // Base scores (could be replaced with actual backend data)
    let twitterScore = isTwitterConnected ? 5 : 0;
    let walletScore = isWalletConnected ? 6 : 0;
    let veridaScore = isVeridaConnected ? 8 : 0;
    
    if (veridaData && veridaData.score) {
      veridaScore = veridaData.score;
    }
    
    // Calculate overall score (weighted average)
    const totalWeight = (isTwitterConnected ? 1 : 0) + (isWalletConnected ? 1 : 0) + (isVeridaConnected ? 1 : 0);
    let overallScore = 0;
    
    if (totalWeight > 0) {
      overallScore = Math.round(((twitterScore + walletScore + veridaScore) / 3) * 10);
    }
    
    // Set score title based on overall score
    let title = "BEGINNER";
    if (overallScore < 30) title = "BEGINNER";
    else if (overallScore < 60) title = "INTERMEDIATE";
    else if (overallScore < 90) title = "ADVANCED";
    else title = "EXPERT";
    
    setFomoScore({
      overall: overallScore,
      twitter: twitterScore,
      wallet: walletScore,
      verida: veridaScore
    });
    
    setScoreTitle(title);
    setLoading(false);
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
        navigate(location.pathname, { replace: true });
        return;
      }
      
      // Check for parameters from Verida callback
      const did = searchParams.get("did");
      
      // Check both auth_token and authToken parameters
      const authToken = searchParams.get("auth_token") || searchParams.get("authToken");
      
      // Check for token parameter - direct from Verida
      const tokenParam = searchParams.get("token");
      
      // Process direct token parameter from Verida if available
      if (tokenParam) {
        try {
          const tokenData = JSON.parse(tokenParam);
          console.log('Processing token data from Verida:', tokenData);
          
          // Extract DID and token based on Verida's structure
          let extractedDid, extractedToken;
          
          if (tokenData.token) {
            extractedDid = tokenData.token.did;
            extractedToken = tokenData.token._id || tokenData.token;
          } else if (tokenData.did) {
            extractedDid = tokenData.did;
            extractedToken = tokenData._id;
          }
          
          if (extractedDid && extractedToken) {
            console.log("Extracted Verida data - DID:", extractedDid, "Token:", extractedToken.substring(0, 10) + '...');
            setIsVeridaConnecting(true);
            setVeridaUser({ did: extractedDid });
            setVeridaAuthToken(extractedToken);
            setIsVeridaConnected(true);
            
            // Fetch score with the extracted data
            fetchVeridaScore(extractedDid, extractedToken, privyId);
            
            // Get groups and messages data
            setVeridaGroups(getVeridaGroupsData());
            setVeridaMessages(getVeridaMessagesData());
            
            // Clear the URL parameters to avoid reprocessing
            navigate(location.pathname, { replace: true });
            
            // Mark Verida connecting as done after a short delay
            setTimeout(() => {
              setIsVeridaConnecting(false);
            }, 1500);
            
            return;
          }
        } catch (err) {
          console.error('Error parsing token data:', err);
          setError('Failed to process Verida authentication data');
        }
      }
      
      // Process auth token and DID from backend callback
      if (authToken) {
        setIsVeridaConnecting(true);
        console.log("Found Verida auth token:", authToken.substring(0, 10) + '...');
        
        // If we have a DID directly, use it
        if (did && did !== 'null' && did !== 'undefined') {
          console.log("Using provided DID:", did);
          setVeridaUser({ did });
          setVeridaAuthToken(authToken);
          setIsVeridaConnected(true);
          
          // Fetch score with the provided DID and token
          fetchVeridaScore(did, authToken, privyId);
          
          // Fetch groups and messages data
          setVeridaGroups(getVeridaGroupsData());
          setVeridaMessages(getVeridaMessagesData());
        } else {
          // We have an auth token but no DID, try to get DID from the token
          console.log("No DID provided, will try to get it from auth token");
          setVeridaUser({ did: "pending-from-token" });
          setVeridaAuthToken(authToken);
          setIsVeridaConnected(true);
          
          // Fetch DID and score using the auth token
          fetchVeridaScore("pending-from-token", authToken, privyId);
          
          // Fetch groups and messages data
          setVeridaGroups(getVeridaGroupsData());
          setVeridaMessages(getVeridaMessagesData());
        }
        
        // Clear the URL parameters to avoid reprocessing
        navigate(location.pathname, { replace: true });
        
        // Mark Verida connecting as done after a short delay
        setTimeout(() => {
          setIsVeridaConnecting(false);
        }, 1500);
      }
    }
  }, [location, navigate, privyId]);

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

  const connectWithVerida = () => {
    setIsVeridaConnecting(true);
    
    // Use the backend API to handle Verida auth
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    
    // The redirect URL should go back to the dashboard page with the privyId
    const redirectUrl = `${window.location.origin}/dashboard/${privyId}/${username || 'guest'}/${address || 'null'}`;
    
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
    
    // Create the auth URL with the correct callback URL to our backend
    // The backend should redirect back to our dashboard with the auth token and DID
    const authUrl = `https://app.verida.ai/auth?scopes=${scopes}&redirectUrl=${encodeURIComponent(`${apiBaseUrl}/auth/callback?redirectUrl=${encodeURIComponent(redirectUrl)}`)}&appDID=${encodeURIComponent(appDID)}`;
    
    console.log("Redirecting to Verida auth:", authUrl);
    window.location.href = authUrl;
  };

  const fetchVeridaScore = async (did, authToken, privyId) => {
    try {
      console.log("Fetching Verida score with:", { 
        did, 
        authToken: authToken ? (authToken.substring(0, 10) + '...') : 'none',
        privyId
      });
      
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
        setVeridaData(response.data);
        
        // Update Verida connection status
        setIsVeridaConnected(true);
        
        // Update Verida score in overall scores via calculateScore
        calculateScore();
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
        setError(`No Telegram data found in your Verida vault. Please sync your Telegram data first.`);
      } else if (err.message.includes('timeout')) {
        setError(`Request timed out. The server might be overloaded, please try again.`);
      } else {
        setError(`Error: ${err.response?.data?.message || err.message}`);
      }
      
      setIsVeridaConnecting(false);
      
      // For debugging, still show verida panel in case of error
      if (import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.VITE_DEBUG_MODE === true) {
        console.log("Debug mode: Showing example Verida data despite error");
        setVeridaGroups(getVeridaGroupsData());
        setVeridaMessages(getVeridaMessagesData());
      }
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
  };

  // Handler for Wallet connection status updates
  const handleWalletConnectionChange = (isConnected) => {
    setIsWalletConnected(isConnected);
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
              <div className="flex flex-col items-center mb-6">
                <div 
                  className="score-circle mb-4" 
                  style={{ 
                    background: `conic-gradient(${getScoreColor(fomoScore.overall / 10)} ${fomoScore.overall}%, var(--v-card-background) 0)` 
                  }}
                >
                  <div className="score-value">{fomoScore.overall}</div>
                  <div className="score-scale">/ 100</div>
                </div>
                <p className="score-category" style={{ color: getScoreColor(fomoScore.overall / 10) }}>{scoreTitle}</p>
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
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Score Breakdown</h2>
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3">
                      <div className="flex justify-between mb-1">
                        <span>X/Twitter Score</span>
                        <span>{fomoScore.twitter}/10</span>
                      </div>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar twitter-score-bar" 
                          style={{ width: `${fomoScore.twitter * 10}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="flex justify-between mb-1">
                        <span>Wallet Score</span>
                        <span>{fomoScore.wallet}/10</span>
                      </div>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar wallet-score-bar" 
                          style={{ width: `${fomoScore.wallet * 10}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="flex justify-between mb-1">
                        <span>Verida Score</span>
                        <span>{fomoScore.verida}/10</span>
                      </div>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar verida-score-bar" 
                          style={{ width: `${fomoScore.verida * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeScoreTab === 'download' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Download Your Score</h2>
                <DownloadButton score={fomoScore.overall} />
              </div>
            )}
          </div>
          
          {/* Right Top: Wallet Connect */}
          <div className="card-container p-6 overflow-auto max-h-[600px]">
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <WalletConnect onConnectionChange={handleWalletConnectionChange} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Bottom: X/Twitter Connect */}
          <div className="card-container p-6">
            <h2 className="text-xl font-bold mb-4">Connect X/Twitter</h2>
            <TwitterAuth onConnectionChange={handleTwitterConnectionChange} />
          </div>
          
          {/* Middle Bottom: Verida Panel */}
          <div className="card-container p-6">
            <h2 className="text-xl font-bold mb-4 v-title">VERIDA</h2>
            
            {isVeridaConnecting ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-medium">Connecting to Verida...</p>
                <p className="text-sm text-gray-400 mt-2">Please wait while we establish a secure connection</p>
              </div>
            ) : !isVeridaConnected ? (
              <div className="text-center">
                <p className="text-gray-400 mb-6">Connect with Verida to enhance your FOMO score based on your digital activity.</p>
                <button 
                  className="v-verida-button"
                  onClick={connectWithVerida}
                >
                  <img src="/verida-logo.svg" alt="Verida Logo" className="h-6 mr-2" />
                  Connect with Verida
                </button>
              </div>
            ) : (
              <div className="v-dashboard-content">
                <div className="v-user-info mb-4">
                  <div className="v-did-info">
                    <span>Verida DID:</span>
                    <span className="v-did-value">
                      {veridaUser?.did || "Unknown"}
                    </span>
                  </div>
                </div>
                
                {/* Verida Dashboard Tabs */}
                <div className="verida-dashboard-tabs">
                  <button 
                    className={`verida-tab-button ${veridaDashboardTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setVeridaDashboardTab('overview')}
                  >
                    Overview
                  </button>
                  <button 
                    className={`verida-tab-button ${veridaDashboardTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setVeridaDashboardTab('groups')}
                  >
                    Groups
                  </button>
                  <button 
                    className={`verida-tab-button ${veridaDashboardTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setVeridaDashboardTab('messages')}
                  >
                    Messages
                  </button>
                </div>
                
                {/* Overview Tab */}
                {veridaDashboardTab === 'overview' && veridaData && (
                  <div className="space-y-4">
                    <div className="v-stats-container">
                      <div className="v-stat-item">
                        <div className="v-stat-label">Telegram Groups</div>
                        <div className="v-stat-value">{veridaData.data?.telegram?.groups || 0}</div>
                      </div>
                      
                      <div className="v-stat-item">
                        <div className="v-stat-label">Messages</div>
                        <div className="v-stat-value">{veridaData.data?.telegram?.messages || 0}</div>
                      </div>
                      
                      <div className="v-stat-item">
                        <div className="v-stat-label">Engagement</div>
                        <div className="v-stat-value">{veridaData.data?.telegram?.engagementRate ? 
                          `${(veridaData.data.telegram.engagementRate * 100).toFixed(0)}%` : '0%'}</div>
                      </div>
                    </div>
                    
                    {veridaData.data?.keywords && veridaData.data.keywords.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Top Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {veridaData.data.keywords.map((keyword, index) => (
                            <span 
                              key={index} 
                              className="keyword-tag"
                              style={{ backgroundColor: `rgba(93, 95, 239, ${0.3 + (0.7 * index / veridaData.data.keywords.length)})` }}
                            >
                              {keyword.name} ({keyword.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Groups Tab */}
                {veridaDashboardTab === 'groups' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Your Groups</h3>
                    
                    {veridaGroups.length === 0 ? (
                      <p className="text-gray-400">No groups found.</p>
                    ) : (
                      <div className="space-y-3">
                        {veridaGroups.map(group => (
                          <div key={group.id} className="group-card">
                            <div className="flex justify-between">
                              <h4 className="group-name">{group.name}</h4>
                              <span className={`group-activity ${
                                group.activity === 'high' ? 'activity-high' :
                                group.activity === 'medium' ? 'activity-medium' :
                                'activity-low'
                              }`}>
                                {group.activity.toUpperCase()}
                              </span>
                            </div>
                            <div className="group-meta">
                              <span>{group.members} members</span>
                              <span>Last active: {group.lastActive}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Messages Tab */}
                {veridaDashboardTab === 'messages' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-2">Recent Messages</h3>
                    
                    {veridaMessages.length === 0 ? (
                      <p className="text-gray-400">No messages found.</p>
                    ) : (
                      <div className="space-y-3">
                        {veridaMessages.map(message => (
                          <div key={message.id} className="message-card">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="message-sender">{message.sender}</span>
                                <span className="message-group">in {message.group}</span>
                              </div>
                              <span className="text-xs text-gray-500">{message.time}</span>
                            </div>
                            <p className="message-content">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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