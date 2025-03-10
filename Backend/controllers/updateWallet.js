const { getUserDetails } = require("./twitterController.js");
const { getWalletDetails } = require("./BlockchainController.js");

let userWallets = {}; // Store multiple wallet addresses per user

// Function to update wallet and fetch new score
async function updateWallet(req, res) {
    try {
        const { username, address } = req.body;

        if (!username) {
            return res.status(400).json({ error: "Provide Twitter username" });
        }
        if (!address) {
            return res.status(400).json({ error: "Provide wallet address" });
        }

        console.log(`📢 Updating Wallet for: Twitter(${username}) → Wallet(${address})`);

        //  Add wallet address to user's wallet list (avoid duplicates)
        if (!userWallets[username]) {
            userWallets[username] = new Set();
        }
        userWallets[username].add(address); // Add wallet to set (avoids duplicates)

        // Convert Set to Array
        const walletAddresses = Array.from(userWallets[username]);

        // Fetch user Twitter data
        const userData = await getUserDetails(username);
        let allWalletData = [];

        // Fetch data for each wallet and merge
        for (let wallet of walletAddresses) {
            const walletData = await getWalletDetails(wallet);
            allWalletData.push(walletData);
        }

        console.log("✅ Merged Wallet Data:", allWalletData);

        // Generate score based on all wallets
        const { score, title } = generateScore(userData, allWalletData);

        return res.json({ score, title, wallets: walletAddresses });

    } catch (error) {
        console.error("❌ Error updating wallet:", error);
        return res.status(500).json({ error: "Server Error" });
    }
}

module.exports = { updateWallet };
