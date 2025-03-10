import { Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./config";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

// This component handles Verida redirects with query parameters
function VeridaRedirectHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get query parameters from Verida redirect
    const did = searchParams.get('did');
    const authToken = searchParams.get('authToken');
    const error = searchParams.get('error');
    
    console.log('Verida redirect parameters:', {
      did: did || 'not provided',
      authToken: authToken ? `${authToken.substring(0, 20)}...` : 'not provided',
      error: error || 'none'
    });
    
    if (error) {
      console.error("Verida authentication error:", error);
      navigate('/');
      return;
    }
    
    // Check if we have an auth token (DID might be "unknown" initially)
    if (authToken) {
      try {
        // Try to parse the authToken if it's in JSON format
        let tokenData = null;
        let tokenObj = null;
        
        if (typeof authToken === 'string' && 
            (authToken.startsWith('{') || authToken.includes('"token"'))) {
          try {
            tokenObj = JSON.parse(authToken);
            if (tokenObj.token) {
              tokenData = tokenObj.token;
            }
          } catch (e) {
            console.error("Failed to parse auth token as JSON:", e);
          }
        }
        
        // Store Verida credentials in sessionStorage - even if DID is "unknown"
        // The backend will try to resolve the actual DID using the auth token
        sessionStorage.setItem('veridaUser', JSON.stringify({ 
          did: did || 'unknown', 
          authToken: tokenData?._id || authToken,
          tokenData: tokenData,
          timestamp: Date.now() 
        }));
        
        // Redirect to dashboard with verida placeholder parameters
        // These will be used to identify this is a Verida user
        // Use "verida-user" as privyId for Verida users
        navigate('/dashboard/verida-user/verida-user/verida-wallet');
      } catch (err) {
        console.error("Error handling Verida redirect:", err);
        navigate('/');
      }
    } else {
      console.error("Missing auth token in Verida redirect");
      // If missing auth token, go back to login
      navigate('/');
    }
  }, [searchParams, navigate]);
  
  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl text-white">Logging in with Verida...</h2>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { authenticated } = usePrivy();
  const [devAuthenticated, setDevAuthenticated] = useState(false);
  const [veridaAuthenticated, setVeridaAuthenticated] = useState(false);
  
  // Check for dev test user or Verida user
  useEffect(() => {
    const testUser = localStorage.getItem('dev-test-user');
    const veridaUser = sessionStorage.getItem('veridaUser');
    
    if (testUser && process.env.NODE_ENV !== 'production') {
      setDevAuthenticated(true);
    }
    
    if (veridaUser) {
      setVeridaAuthenticated(true);
    }
  }, []);
  
  // Allow access if authenticated via Privy, dev test user, or Verida
  return (authenticated || devAuthenticated || veridaAuthenticated) ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* Handle Verida redirects */}
      <Route path="/dashboard" element={<VeridaRedirectHandler />} />
      <Route
        path="/dashboard/:privyId/:username/:address"
        element={
          <ProtectedRoute>
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <Dashboard />
              </QueryClientProvider>
            </WagmiProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;