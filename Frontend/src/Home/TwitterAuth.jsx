import { useState, useEffect } from "react";
import { auth, twitterProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { usePrivy } from "@privy-io/react-auth";
import PropTypes from "prop-types";

function TwitterAuth({ onConnectionChange }) {
 
  const [user, setUseri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const privyID = user?.id || "guest";
  
  // Notify parent when connection status changes
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(!!user);
    }
  }, [user, onConnectionChange]);
  
  // ✅ Fetch score when user logs in
  useEffect(() => {
    if (user) {
      fetchScore(user.displayName);
    }
  }, [user]); // ✅ Runs when `user` changes

  // ✅ Function to Fetch Score from Backend
  const fetchScore = async (username) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/score/get-score/${privyID}/${username}/null`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch score");

    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // ✅ Login with Twitter
  const loginWithTwitter = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, twitterProvider);
      setUseri(result.user);
      setError(null);
      fetchScore(result.user.displayName); // ✅ Fetch updated score
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUseri(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {!user ? (
        <button
          onClick={loginWithTwitter}
          disabled={loading}
          className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition w-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              Connecting...
            </span>
          ) : 'Sign in with Twitter'}
        </button>
      ) : (
        <div className="text-center w-full">
          <p className="text-green-600 font-bold">Connected as {user.displayName}</p>
          <button
            onClick={logout}
            disabled={loading}
            className={`mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition w-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Disconnecting...
              </span>
            ) : 'Disconnect'}
          </button>
        </div>
      )}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

TwitterAuth.propTypes = {
  onConnectionChange: PropTypes.func
};

export default TwitterAuth;
