import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";

export function Account() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  if (!address) return null; // Hide component if no wallet is connected

  return (
    <div className="flex flex-col space-y-4 w-full max-w-lg">
      <div className="flex justify-between items-center bg-gray-700 p-4 rounded-lg shadow-lg border border-gray-600">
        <div className="flex items-center space-x-4">
          {ensAvatar && (
            <img
              alt="ENS Avatar"
              src={ensAvatar}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-gray-300">
              {ensName || "WALLETCONNECT"}
            </p>
            <p className="text-gray-400">
              {ensName ? (
                <>
                  {ensName}{" "}
                  <span className="text-gray-500">({address.slice(0, 6)}...{address.slice(-4)})</span>
                </>
              ) : (
                `${address.slice(0, 6)}...${address.slice(-4)}`
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-500 transition"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
