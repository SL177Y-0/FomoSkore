import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { useConnect } from "wagmi";
import { Account } from "./Account";
import axios from "axios"; // Import Axios for API requests

const WalletConnect = () => {
  const { logout, user } = usePrivy();
  const [connectedWallets, setConnectedWallets] = useState({});
  const [error, setError] = useState("");
  const [score, setScore] = useState(null); // Store score from the backend

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
  };

  const disconnectWallet = (walletType) => {
    setConnectedWallets((prev) => {
      const updated = { ...prev };
      delete updated[walletType];
      return updated;
    });
    localStorage.removeItem(`${walletType}_connected`);
  };

  const connectEthereumWallet = async (walletType, provider) => {
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const ethersProvider = new BrowserProvider(provider);
      updateWalletList(walletType, {
        address: accounts[0],
        provider: ethersProvider,
      });
    } catch (err) {
      setError(`Failed to connect to ${walletType}: ${err.message}`);
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

  const connectBitGet = async () => {
    const provider = window.bitkeep?.ethereum || window.bitget?.ethereum;
    if (provider) {
      await connectEthereumWallet("bitget", provider);
    } else {
      setError("BitGet Wallet is not installed.");
    }
  };

  const connectPhantom = async () => {
    if (window.solana?.isPhantom) {
      try {
        const response = await window.solana.connect();
        updateWalletList("phantom", {
          address: response.publicKey.toString(),
          provider: window.solana,
        });
      } catch (err) {
        setError(`Failed to connect to Phantom: ${err.message}`);
      }
    } else {
      setError("Phantom Wallet is not installed.");
    }
  };

  const connectWalletConnect = async () => {
    try {
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
        type: "bitget",
        provider: window.bitkeep?.ethereum || window.bitget?.ethereum,
      },
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
  const fetchUserScore = async (userId, walletAddress) => {
    try {
        console.log("📤 Sending to backend:", { privyId: userId, walletAddress });

        const response = await axios.post(
            "http://localhost:5000/api/score/get-score",
            {
                privyId: userId, //  Ensure privyId is sent correctly
                walletAddress: walletAddress
            }
        );

        const data = response.data;
        console.log("✅ Backend Response:", data);
    } catch (error) {
        console.error("❌ Failed to fetch user score:", error.response ? error.response.data : error);
    }


};


  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6">Connect Your Wallet</h2>

      {/* Wallet Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={connectMetaMask}
          className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-500 transition"
        >
          Connect MetaMask
        </button>
        <button
          onClick={connectCoinbase}
          className="bg-blue-700 px-6 py-3 rounded-lg hover:bg-blue-600 transition"
        >
          Connect Coinbase
        </button>
        <button
          onClick={connectTrustWallet}
          className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-500 transition"
        >
          Connect Trust Wallet
        </button>
        <button
          onClick={connectBitGet}
          className="bg-purple-600 px-6 py-3 rounded-lg hover:bg-purple-500 transition"
        >
          Connect BitGet
        </button>
        <button
          onClick={connectPhantom}
          className="bg-yellow-600 px-6 py-3 rounded-lg hover:bg-yellow-500 transition"
        >
          Connect Phantom
        </button>
        <button
          onClick={connectWalletConnect}
          className="bg-teal-600 px-6 py-3 rounded-lg hover:bg-teal-500 transition"
        >
          Connect WalletConnect
        </button>
      </div>

      {/* Display Connected Wallets */}
      <div className="mt-8 w-full max-w-lg bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
        <h3 className="text-2xl font-semibold mb-4">Connected Wallets</h3>
        {Object.keys(connectedWallets).length === 0 ? (
          <p className="text-gray-400">No wallets connected.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(connectedWallets).map(
              ([walletType, walletData]) => (
                <div
                  key={walletType}
                  className="flex justify-between items-center bg-gray-700 p-4 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-300">
                      {walletType.toUpperCase()}
                    </p>
                    <p className="text-gray-400">
                      {shortenAddress(walletData.address)}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnectWallet(walletType)}
                    className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-500 transition"
                  >
                    Disconnect
                  </button>
                </div>
              )
            )}
          </div>
        )}
        <div className="mt-5"><Account/></div>
      </div>
      {/* Error Message */}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default WalletConnect;
