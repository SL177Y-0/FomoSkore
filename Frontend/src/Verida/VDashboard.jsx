import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import FOMOscore from "../components/FOMOscore";

function VDashboard({ user }) {
  const [fomoData, setFomoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Default to FOMOscore tab for Verida users
  const [activeTab, setActiveTab] = useState("fomoscore"); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVeridaScore = async () => {
      try {
        setLoading(true);

        console.log("Verida Dashboard - User authentication data:", {
          did: user.did,
          authToken: user.authToken ? `${user.authToken.substring(0, 10)}...` : 'none',
          timestamp: user.timestamp || 'not set'
        });

        if (!user.authToken) {
          setError(
            "Missing Verida authentication token. Please try reconnecting with Verida."
          );
          setLoading(false);
          return;
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/VeridaApi/score`,
          {
            did: user.did,
            authToken: user.authToken,
          }
        );

        if (response.data.did && (!user.did || user.did === "unknown")) {
          console.log(`Server retrieved DID: ${response.data.did}`);
          
          // Update the stored Verida user with the correct DID
          const updatedUser = { ...user, did: response.data.did };
          sessionStorage.setItem('veridaUser', JSON.stringify(updatedUser));
        }

        console.log("Received Verida score data:", response.data);
        setFomoData(response.data);
      } catch (err) {
        console.error("Error fetching Verida score:", err);

        if (err.response?.data?.error === "Invalid DID") {
          setError("Invalid Verida DID. Please try reconnecting with Verida.");
        } else {
          setError(
            err.response?.data?.message ||
              "Failed to calculate your score. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.authToken) {
      fetchVeridaScore();
    } else {
      setError("Missing authentication information. Please log in again.");
      setLoading(false);
    }
  }, [user]);

  const handleLogout = () => {
    // Clear Verida user from session storage
    sessionStorage.removeItem('veridaUser');
    navigate("/");
  };

  const getScoreCategory = (score) => {
    if (score < 10)
      return {
        category: "Low FOMO",
        description: "You're quite content with missing out. Kudos!",
      };
    if (score < 50)
      return {
        category: "Moderate FOMO",
        description: "You're occasionally worried about missing the action.",
      };
    if (score < 100)
      return {
        category: "High FOMO",
        description: "You're often concerned about missing important events.",
      };
    return {
      category: "Extreme FOMO",
      description: "You can't stand the thought of missing anything!",
    };
  };

  if (loading && activeTab === "verida") {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-green-400">Calculating your Verida score...</h2>
        <div className="mt-4 w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && activeTab === "verida") {
    const isDIDError = error.includes("DID") || error.includes("Verida");

    return (
      <div className="bg-red-800 bg-opacity-20 p-6 rounded-lg text-white">
        <h2 className="text-lg font-semibold text-red-400">Something went wrong</h2>
        <p className="mt-2 text-gray-300">{error}</p>

        {isDIDError ? (
          <>
            <p className="text-sm mt-2 text-gray-400">
              We couldn't retrieve your Verida identity. Please try
              reconnecting.
            </p>
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              onClick={handleLogout}
            >
              Reconnect with Verida
            </button>
          </>
        ) : (
          <button
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
            onClick={handleLogout}
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  const scoreInfo = fomoData ? getScoreCategory(fomoData.score) : null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`flex-1 py-2 ${
            activeTab === "verida"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("verida")}
        >
          Verida Score
        </button>
        <button
          className={`flex-1 py-2 ${
            activeTab === "fomoscore"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("fomoscore")}
        >
          FOMOscore
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "verida" ? (
        <>
          <h2 className="text-2xl font-bold text-green-400 mb-4">Your Verida Score</h2>

          {(() => {
            if (loading) {
              return (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading your score...</p>
                </div>
              );
            } else if (error) {
              return (
                <div className="bg-red-900 bg-opacity-20 p-4 rounded-lg">
                  <p className="text-red-400">{error}</p>
                </div>
              );
            } else {
              return (
                <>
                  <div className="mt-4">
                    <p className="text-6xl font-extrabold text-white">{fomoData.score}</p>
                    <p className="text-lg text-yellow-400 font-semibold">
                      {scoreInfo.category}
                    </p>
                    <p className="text-sm mt-2 text-gray-400">{scoreInfo.description}</p>
                  </div>
          
                  <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-gray-400">
                      Verida DID: <span className="text-gray-300 font-mono text-sm">{user.did}</span>
                    </p>
                  </div>
                </>
              );
            }
          })()}
        </>
      ) : (
        <FOMOscore user={user} />
      )}

      <button
        className="mt-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md w-full"
        onClick={handleLogout}
      >
        Log Out
      </button>
    </div>
  );
}

VDashboard.propTypes = {
  user: PropTypes.shape({
    did: PropTypes.string.isRequired,
    authToken: PropTypes.string.isRequired,
    timestamp: PropTypes.string,
  }).isRequired,
};

export default VDashboard;
