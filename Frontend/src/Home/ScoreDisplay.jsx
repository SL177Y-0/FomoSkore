import{ useState } from "react";

const ScoreDisplay = () => {
  const [username, setUsername] = useState("");
  const [address, setaddress] = useState("");
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchScore = async () => {
    setLoading(true);
    setError("");
    
    console.log("Sending Data:", { username, address }); // Debugging log
    
    try {
        const response = await fetch("http://localhost:5000/api/score/get-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, address }), // Ensure correct data format
        });

        const data = await response.json();
        console.log("Response Data:", data); // Debugging log

        if (!response.ok) throw new Error(data.error || "Failed to fetch score");

        setScoreData(data);
    } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
    }
    setLoading(false);
};


  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">User Score Calculator</h2>

      <input
        type="text"
        placeholder="Enter Twitter Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border p-2 mb-2 w-72 rounded"
      />
      <input
        type="text"
        placeholder="Enter Wallet Address"
        value={address}
        onChange={(e) => setaddress(e.target.value)}
        className="border p-2 mb-2 w-72 rounded"
      />

      <button
        onClick={fetchScore}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      >
        {loading ? "Fetching..." : "Get Score"}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {scoreData && (
        <div className="mt-4 p-4 bg-white shadow-md rounded text-center">
          <p className="text-xl font-bold">Score: {scoreData.score}</p>
          <p className="text-lg text-gray-600">{scoreData.title}</p>
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;
