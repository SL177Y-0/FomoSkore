import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios"; 
import VDashboard from '../Verida/VDashboard'
import TwitterAuth from "../Home/TwitterAuth";
import WalletConnect from "../Home/WalletConnect";
import DownloadButton from "../Home/DownloadButton"; 
import VLogin from "../Verida/VLogin";

const Dashboard = () => {
  const { logout, user } = usePrivy();
  const navigate = useNavigate();
  const { privyId, username, address } = useParams();
  const [veridaUser, setVeridaUser] = useState(null);
  const [showFOMOscore, setShowFOMOscore] = useState(false);
  const [scoreBreakdown, setScoreBreakdown] = useState({
    twitter: 0,
    wallet: 0,
    fomo: 0
  });

  const [title, setTitle] = useState("ALL ROUNDOOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  let [score, setScore] = useState(0);

  // Use provided privyId from route or user's ID
  const userPrivyID = user?.id || privyId || "guest";
  
  // Create a global update function for the FOMOscore component to use
  useEffect(() => {
    window.updateOverallScore = (newScore) => {
      fetchTotalScore(userPrivyID);
    };
    
    return () => {
      window.updateOverallScore = null;
    };
  }, [userPrivyID]);
  
  useEffect(() => {
    if (userPrivyID) {
      fetchTotalScore(userPrivyID);
      fetchScoreBreakdown(userPrivyID);
    }
  }, [userPrivyID]);

  // Fetch score on component mount & when Twitter login happens
  useEffect(() => {
    const userNameFromPrivy = user?.twitter?.username || "guest";
    const walletAddressFromPrivy = user?.wallet?.address || "null";

    if (!username || !address) {
      // Include the privyId in the navigation
      navigate(`/dashboard/${userPrivyID}/${userNameFromPrivy}/${walletAddressFromPrivy}`);
    } else {
      fetchScore(userPrivyID, username, address);
    }
  }, [username, address, user?.twitter, userPrivyID, navigate]);

  // Handle dev test user if Privy is not available
  useEffect(() => {
    const testUserString = localStorage.getItem('dev-test-user');
    if (testUserString && !user?.id && process.env.NODE_ENV !== 'production') {
      try {
        const testUser = JSON.parse(testUserString);
        // Use test user information instead of Privy user
        const testPrivyID = testUser.id || "test-user-id";
        if (testPrivyID) {
          console.log("Using test user:", testUser);
          fetchTotalScore(testPrivyID);
          fetchScoreBreakdown(testPrivyID);
        }
      } catch (err) {
        console.error("Error parsing test user data:", err);
      }
    }
  }, []);

  // Handle Verida authentication
  useEffect(() => {
    const veridaUserString = sessionStorage.getItem('veridaUser');
    if (veridaUserString) {
      try {
        const veridaData = JSON.parse(veridaUserString);
        console.log("Using Verida authentication:", {
          did: veridaData.did,
          authToken: veridaData.authToken ? `${veridaData.authToken.substring(0, 10)}...` : 'none',
          timestamp: veridaData.timestamp || 'not set'
        });
        
        // Set Verida user in state for FOMOscore component
        setVeridaUser(veridaData);
        
        // If username is "verida-user" from our redirect handler, this is a Verida login
        if (username === "verida-user" && address === "verida-wallet") {
          // Auto-open FOMOscore tab for Verida users
          setShowFOMOscore(true);
        }
      } catch (err) {
        console.error("Error parsing Verida user data:", err);
      }
    }
  }, [username, address]);

  const fetchScoreBreakdown = async (privyID) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/score/breakdown/${privyID}`);
      if (response.data) {
        setScoreBreakdown({
          twitter: response.data.twitterScore || 0,
          wallet: response.data.walletScore || 0,
          fomo: response.data.fomoScore || 0
        });
      }
    } catch (err) {
      console.error("❌ Error fetching score breakdown:", err);
    }
  };

  const fetchTotalScore = async (privyID) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`http://localhost:5000/api/score/total-score/${privyID}`);
      const data = response.data;
      console.log("✅ Total Score Fetched:", data.totalScore);

      setScore(data.totalScore);
      updateTitle(data.totalScore);
    } catch (err) {
      console.error("❌ Error fetching total score:", err);
      setError(err.response?.data?.error || "Failed to fetch total score");
    } finally {
      setLoading(false);
    }
  };

  // Function to Fetch Score from Backend using Axios
  const fetchScore = async (privyID, username, address) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `http://localhost:5000/api/score/get-score/${privyID}/${username}/${address}`
      );

      const data = response.data;
      console.log("✅ Fetched Score:", data.totalScore); // Log the score
     
      setScore(data.totalScore);
      updateTitle(data.totalScore);
      fetchScoreBreakdown(privyID);
    } catch (err) {
      console.error("❌ Error fetching score:", err);
      setError(err.response?.data?.error || "Failed to fetch score");
    } finally {
      setLoading(false);
    }
  };
  
  const updateTitle = (totalScore) => {
    let newTitle = "ALL ROUNDOOR";
    if (totalScore >= 90) newTitle = "ALPHA TRADOOR";
    else if (totalScore >= 70) newTitle = "NFT EXPLOROOR";
    else if (totalScore >= 50) newTitle = "DAO DIPLOMAT";
    else if (totalScore >= 30) newTitle = "COMMUNITY ANALYST";

    setTitle(newTitle);
  };

  const handleLogout = () => {
    // Clear all authentication data
    logout(); // Privy logout
    localStorage.removeItem('dev-test-user'); // Clear dev test user
    sessionStorage.removeItem('veridaUser'); // Clear Verida user
    
    navigate("/");
    setScore(0);
    setTitle("ALL ROUNDOOR");
  };
  
  const toggleFOMOscore = () => {
    setShowFOMOscore(!showFOMOscore);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col">
      {/* Navbar */}
      <nav className="bg-gray-800 shadow-md p-4 flex items-center justify-between px-8">
        <h1 className="text-xl font-bold text-gray-300">Cluster Protocol</h1>
        <div className="flex space-x-4">
          <button className="text-gray-400 hover:text-white transition">Home</button>
          <button 
            onClick={toggleFOMOscore} 
            className="text-gray-400 hover:text-white transition"
          >
            FOMOscore
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-gray-300">{username || "Guest"}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Score Display */}
      <main className="flex flex-1 items-center justify-center p-8">
        {showFOMOscore ? (
          <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-full max-w-2xl text-center border border-gray-700">
            {veridaUser ? (
              // If authenticated, show Verida Dashboard
              <VDashboard user={veridaUser} />
            ) : (
              // Otherwise, show Verida Login
              <VLogin setUser={setVeridaUser} />
            )}
          </div>
        ) : (
          <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-full max-w-2xl text-center border border-gray-700">
            <h2 className="text-4xl font-bold text-green-400 mb-6">Your Score</h2>

            {loading ? (
              <p className="text-gray-400 mb-6">Calculating...</p>
            ) : (
              <div className="mb-6">
                <p className="text-6xl font-extrabold text-white">{score}</p>
                <p className="text-xl text-yellow-400 mt-2 font-semibold">{title}</p> 
              </div>
            )}
            
            {/* Score Breakdown */}
            <div className="mt-4 mb-6 bg-gray-900 p-4 rounded-lg">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Twitter</div>
                  <div className="text-2xl font-bold">{scoreBreakdown.twitter}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Wallet</div>
                  <div className="text-2xl font-bold">{scoreBreakdown.wallet}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">FOMOscore</div>
                  <div className="text-2xl font-bold">{scoreBreakdown.fomo * 10}</div>
                </div>
              </div>
            </div>

            {/* Download & Share Score Section */}
            <div className="mt-6 bg-gray-900 p-6 rounded-lg border border-gray-700 shadow-md">
              <DownloadButton score={score} />
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}

            {/* Connect Your Accounts Section */}
            <div className="mt-8">
              <h3 className="text-xl font-bold text-blue-400 mb-4">Connect Your Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Twitter Connection */}
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Twitter</h4>
                  {user.twitter ? (
                    <div className="text-green-400">✓ Connected</div>
                  ) : (
                    <TwitterAuth />
                  )}
                </div>
                
                {/* Wallet Connection */}
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Wallet</h4>
                  {user.wallet ? (
                    <div className="text-green-400">✓ Connected</div>
                  ) : (
                    <WalletConnect />
                  )}
                </div>
                
                {/* Verida Connection */}
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Verida</h4>
                  {veridaUser ? (
                    <div className="text-green-400">✓ Connected</div>
                  ) : (
                    <button 
                      onClick={toggleFOMOscore}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
