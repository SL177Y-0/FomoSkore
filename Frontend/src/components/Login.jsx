import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "./Navigation";

const Login = () => {
  const { login, authenticated, user, ready } = usePrivy();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (authenticated && user) {
      const username = user?.twitter?.username || user?.email?.address || "guest";
      const address = user?.wallet?.address || "null";
      const privyId = user?.id || "null";

      console.log("Redirecting to:", `/dashboard/${privyId}/${username}/${address}`);
      navigate(`/dashboard/${privyId}/${username}/${address}`);
    }
  }, [authenticated, user, navigate]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      await login();
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Failed to login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-96 text-center border border-gray-700">
            <h2 className="text-3xl font-bold mb-6 text-gray-200">WELCOME</h2>
            <p className="mb-4 text-gray-400">Login using your preferred method</p>

            {!ready ? (
              <div className="flex justify-center items-center py-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="ml-3 text-gray-400">Loading authentication...</p>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className={`bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-500 transition font-medium w-full ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Logging in...
                  </span>
                ) : 'Login'}
              </button>
            )}

            {loginError && (
              <div className="mt-4 p-3 bg-red-500 bg-opacity-20 text-red-300 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <p className="mt-4 text-sm text-gray-500">Powered by Cluster Protocol</p>
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                App ID: {import.meta.env.VITE_PRIVY_APP_ID || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
