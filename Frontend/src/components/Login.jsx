import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Login = () => {
  const { login, authenticated, user } = usePrivy();
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated && user) {
      const username = user?.twitter?.username || "guest";
      const address = user?.wallet?.address || "null";
      const privyId= user?.privyId || "null";

      console.log("Redirecting to:", `/dashboard/${privyId}/${username}/${address}`);
      navigate(`/dashboard/${privyId}/${username}/${address}`);
    }
  }, [authenticated, user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 shadow-xl rounded-lg p-8 w-96 text-center border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-gray-200">Welcome Back</h2>
        <p className="mb-4 text-gray-400">Login using your preferred method</p>

        <button
          onClick={login}
          className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-500 transition font-medium w-full"
        >
          Login
        </button>

        <p className="mt-4 text-sm text-gray-500">Powered by Cluster Protocol</p>
      </div>

      {/* Fallback login for testing (remove in production) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-yellow-400 mb-2">Development Testing Login</h3>
          <p className="text-gray-400 mb-4">Use this option only if Privy authentication is not working</p>
          <button
            onClick={() => {
              // Simple bypass for development testing
              const testUser = {
                id: "test-user-id",
                wallet: { address: "0x0000000000000000000000000000000000000000" },
                email: "test@example.com"
              };
              // Store in localStorage for session persistence
              localStorage.setItem('dev-test-user', JSON.stringify(testUser));
              // Navigate to dashboard with the three-parameter pattern
              window.location.href = '/dashboard/test-user-id/testuser/0x0000000000000000000000000000000000000000';
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
          >
            Test Login (Dev Only)
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
