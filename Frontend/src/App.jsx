import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./config";
import Login from "./components/Login";
import UnifiedDashboard from "./components/UnifiedDashboard";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import "./Verida/VeridaStyles.css";

const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { authenticated } = usePrivy();
  return authenticated ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard/:privyId/:username/:address"
        element={
          <ProtectedRoute>
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <UnifiedDashboard />
              </QueryClientProvider>
            </WagmiProvider>
          </ProtectedRoute>
        }
      />
      {/* Verida callback route - redirects to dashboard with auth token */}
      <Route
        path="/dashboard/:privyId/:username/:address/verida-callback"
        element={
          <ProtectedRoute>
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <UnifiedDashboard veridaCallback={true} />
              </QueryClientProvider>
            </WagmiProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
