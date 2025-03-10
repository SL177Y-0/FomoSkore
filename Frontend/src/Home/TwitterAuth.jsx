import { useState, useEffect } from "react";
import { auth, twitterProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { usePrivy } from "@privy-io/react-auth";

function TwitterAuth() {
 
  const [user, setUseri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const privyID = user?.id || "guest";
  // Fetch score when user logs in
  useEffect(() => {
    if (user) {
      fetchScore(user.displayName);
    }
  }, [user]); // Runs when `user` changes

  // Function to Fetch Score from Backend
  const fetchScore = async (username) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/score/get-score/${privyID}/${username}/null`,
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

  // Login with Twitter
  const loginWithTwitter = async () => {
    try {
      const result = await signInWithPopup(auth, twitterProvider);
      setUseri(result.user);
      setError(null);
      fetchScore(result.user.displayName); // Fetch updated score
    } catch (err) {
      setError(err.message);
    }
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUseri(null);
  // Reset score on logout
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {!user ? (
        <button
          onClick={loginWithTwitter}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Sign in with Twitter
        </button>
      ) : (
        <div className="text-center">
          <p className="text-green-600 font-bold">Welcome, {user.displayName}!</p>
          <button
            onClick={logout}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      )}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

export default TwitterAuth;
