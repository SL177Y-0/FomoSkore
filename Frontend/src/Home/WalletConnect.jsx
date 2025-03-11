import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { useConnect } from "wagmi";
import { Account } from "./Account";
import axios from "axios"; // Import Axios for API requests
import PropTypes from "prop-types";

const WalletConnect = ({ onConnectionChange }) => {
  const { logout, user } = usePrivy();
  const [connectedWallets, setConnectedWallets] = useState({});
  const [error, setError] = useState("");
  const [score, setScore] = useState(null); // Store score from the backend
  const [loading, setLoading] = useState(false);

  // wagmi hook for WalletConnect
  const { connect, connectors } = useConnect();

  const shortenAddress = (address) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const updateWalletList = (walletType, walletData) => {
    setConnectedWallets((prev) => ({ ...prev, [walletType]: walletData }));
    localStorage.setItem(`${walletType}_connected`, walletData?.address || "");
    
    // Send request to backend after connecting wallet
    if (user?.id && walletData.address) {
      fetchUserScore(user.id, walletData.address);
    }
    
    // Notify parent component of connection status
    if (onConnectionChange) {
      onConnectionChange(true);
    }
  };

  const disconnectWallet = (walletType) => {
    setConnectedWallets((prev) => {
      const updated = { ...prev };
      delete updated[walletType];
      return updated;
    });
    localStorage.removeItem(`${walletType}_connected`);
    
    // Notify parent component of disconnection if no wallets remain
    if (onConnectionChange && Object.keys(connectedWallets).length <= 1) {
      setTimeout(() => onConnectionChange(false), 0);
    }
  };

  const connectEthereumWallet = async (walletType, provider) => {
    try {
      setLoading(true);
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new BrowserProvider(provider);
      updateWalletList(walletType, {
        address: accounts[0],
        provider: ethersProvider,
      });
    } catch (err) {
      setError(`Failed to connect to ${walletType}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMask = async () => {
    if (window.ethereum?.isMetaMask) {
      await connectEthereumWallet("metamask", window.ethereum);
    } else {
      setError("MetaMask is not installed.");
    }
  };

  const connectCoinbase = async () => {
    const provider =
      window.coinbaseWalletExtension ||
      (window.ethereum?.isCoinbaseWallet ? window.ethereum : null);
    if (provider) {
      await connectEthereumWallet("coinbase", provider);
    } else {
      setError("Coinbase Wallet is not installed.");
    }
  };

  const getTrustWalletProvider = () => {
    if (window.trustwallet) return window.trustwallet;
    if (window.ethereum?.isTrust) return window.ethereum;
    return window.ethereum?.providers?.find((p) => p.isTrust) || null;
  };

  const connectTrustWallet = async () => {
    const provider = getTrustWalletProvider();
    if (provider) {
      await connectEthereumWallet("trustwallet", provider);
    } else {
      setError("Trust Wallet is not installed.");
    }
  };

  const connectPhantom = async () => {
    if (window.solana?.isPhantom) {
      try {
        setLoading(true);
        const response = await window.solana.connect();
        updateWalletList("phantom", {
          address: response.publicKey.toString(),
          provider: window.solana,
        });
      } catch (err) {
        setError(`Failed to connect to Phantom: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      setError("Phantom Wallet is not installed.");
    }
  };

  const connectWalletConnect = async () => {
    try {
      setLoading(true);
      const wcConnector = connectors.find(
        (connector) => connector.id === "walletConnect"
      );
      if (!wcConnector) {
        setError("WalletConnect connector not available.");
        return;
      }
      const result = await connect({ connector: wcConnector });
      if (result?.data) {
        updateWalletList("walletconnect", {
          address: result.data.account,
          provider: result.data.provider,
        });
      }
    } catch (err) {
      setError(`Failed to connect to WalletConnect: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const walletTypes = [
      {
        type: "metamask",
        provider: window.ethereum?.isMetaMask ? window.ethereum : null,
      },
      {
        type: "coinbase",
        provider:
          window.coinbaseWalletExtension ||
          (window.ethereum?.isCoinbaseWallet ? window.ethereum : null),
      },
      { type: "trustwallet", provider: getTrustWalletProvider() },
      {
        type: "phantom",
        provider: window.solana?.isPhantom ? window.solana : null,
      },
    ];

    walletTypes.forEach(({ type, provider }) => {
      const savedAddress = localStorage.getItem(`${type}_connected`);
      if (savedAddress && provider) {
        updateWalletList(type, { address: savedAddress, provider });
      }
    });
  }, []);
  
  // Update parent about initial connection status
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(Object.keys(connectedWallets).length > 0);
    }
  }, [connectedWallets, onConnectionChange]);
  
  const fetchUserScore = async (userId, walletAddress) => {
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/score/get-score`,
            {
                privyId: userId,
                walletAddress: walletAddress
            }
        );
        const data = response.data;
    } catch (error) {
        console.error("Failed to fetch user score:", error.response ? error.response.data : error);
    }
  };


  return (
    <div className="flex flex-col">
      {/* Wallet Buttons - Grid Layout for Popular Wallets */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={connectMetaMask}
          disabled={loading}
          className={`bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-500 transition text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          MetaMask
        </button>
        <button
          onClick={connectCoinbase}
          disabled={loading}
          className={`bg-blue-700 px-3 py-2 rounded-lg hover:bg-blue-600 transition text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          Coinbase
        </button>
      </div>
      
      {/* More Wallets - Accordion */}
      <details className="mb-4 bg-gray-800 p-2 rounded-lg">
        <summary className="cursor-pointer font-medium text-gray-300 p-1">More Wallet Options</summary>
        <div className="grid grid-cols-2 gap-3 mt-3 p-2">
          <button
            onClick={connectTrustWallet}
            disabled={loading}
            className={`bg-green-600 px-3 py-2 rounded-lg hover:bg-green-500 transition text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            Trust Wallet
          </button>
          <button
            onClick={connectPhantom}
            disabled={loading}
            className={`bg-yellow-600 px-3 py-2 rounded-lg hover:bg-yellow-500 transition text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            Phantom
          </button>
          <button
            onClick={connectWalletConnect}
            disabled={loading}
            className={`bg-teal-600 px-3 py-2 rounded-lg hover:bg-teal-500 transition text-sm col-span-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            WalletConnect
          </button>
        </div>
      </details>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center mt-2 mb-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-2 text-sm text-gray-400">Connecting...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500 bg-opacity-20 text-red-300 p-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Display Connected Wallets */}
      <div className="mt-2 mb-2 w-full bg-gray-800 p-3 rounded-lg">
        <h3 className="text-base font-semibold mb-2">Connected Wallets</h3>
        
        {Object.keys(connectedWallets).length === 0 ? (
          <p className="text-gray-400 text-sm">No wallets connected.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(connectedWallets).map(([walletType, walletData]) => (
              <div
                key={walletType}
                className="flex justify-between items-center bg-gray-700 p-2 rounded-lg text-sm"
              >
                <div>
                  <p className="font-semibold text-gray-300">
                    {walletType.charAt(0).toUpperCase() + walletType.slice(1)}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {shortenAddress(walletData.address)}
                  </p>
                </div>
                <button
                  onClick={() => disconnectWallet(walletType)}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

WalletConnect.propTypes = {
  onConnectionChange: PropTypes.func
};

export default WalletConnect;
