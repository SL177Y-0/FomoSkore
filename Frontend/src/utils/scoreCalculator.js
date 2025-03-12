// Sophisticated scoring algorithm for FomoSkoree
export function calculateAdvancedScore(userData, walletData, telegramData) {
    // Dynamic Weighting Factors
    const weights = {
        social: 40, crypto: 30, nft: 20, community: 10, telegram: 15,
        frequency: 0.5, volume: 1, diversity: 2, recency: 1.5, crossChain: 5, verification: 10, complexity: 3,
        telegramEngagement: 5, telegramLeadership: 5, telegramPinned: 3, badgeBonus: 5,
        dappInteraction: 3, lendBorrowStake: 4, airdropParticipation: 5, gasSpent: 2, web3Domains: 6
    };

    // Badges Array
    let badges = [];

    // Dynamic Scoring System
    function calculateDynamicScore(baseValue, weight, thresholds) {
        if (baseValue > thresholds.high) return weight;
        if (baseValue > thresholds.medium) return weight * 0.75;
        if (baseValue > thresholds.low) return weight * 0.5;
        return 0;
    }

    // Initialize scores
    let socialScore = 0;
    let cryptoScore = 0;
    let nftScore = 0;
    let communityScore = 0;
    let telegramScore = 0;
    let dappScore = 0;
    let lendBorrowStakeScore = 0;
    let airdropScore = 0;
    let gasSpentScore = 0;
    let web3DomainsScore = 0;

    // Social Influence Score (Twitter)
    if (userData && userData.result) {
        socialScore = calculateDynamicScore(
            userData.result.legacy?.followers_count || 0, 
            weights.social, 
            {low: 100000, medium: 1000000, high: 10000000}
        );
        
        const socialActivity = (userData.result.legacy?.favourites_count || 0) + 
                              (userData.result.legacy?.media_count || 0) + 
                              (userData.result.legacy?.listed_count || 0);
        
        socialScore += calculateDynamicScore(
            socialActivity, 
            weights.social, 
            {low: 10000, medium: 50000, high: 100000}
        );
        
        if (userData.result.is_blue_verified) {
            socialScore += weights.verification;
        }
        
        if (socialScore > 30) badges.push("Crypto Communicator");
        if ((userData.result.legacy?.friends_count || 0) > 2000) badges.push("Social Connector");
        
        // Community Engagement Score
        communityScore = calculateDynamicScore(
            userData.result.creator_subscriptions_count || 0, 
            weights.community, 
            {low: 1, medium: 3, high: 5}
        );
        
        if (communityScore > 5) badges.push("DAO Diplomat");
        if ((userData.result.legacy?.statuses_count || 0) > 5000) badges.push("Twitter Veteran");
    }

    // Crypto/DeFi Score (Wallet)
    if (walletData) {
        const activeChains = walletData.activeChains?.length || 0;
        cryptoScore = calculateDynamicScore(
            activeChains, 
            weights.crypto, 
            {low: 1, medium: 2, high: 3}
        );
        
        const nativeBalance = parseFloat(walletData.nativeBalance || 0);
        cryptoScore += calculateDynamicScore(
            nativeBalance, 
            weights.crypto, 
            {low: 0.5, medium: 1, high: 5}
        );
        
        const defiPositions = walletData.defiPositionsSummary?.positions?.length || 0;
        cryptoScore += calculateDynamicScore(
            defiPositions, 
            weights.crypto, 
            {low: 1, medium: 3, high: 5}
        );
        
        if (defiPositions > 3) badges.push("Liquidity Laureate");
        
        // Default values for metrics that might not be directly available
        const lendBorrowStake = walletData.lendBorrowStake || 0;
        const airdrops = walletData.airdrops || 0;
        
        if (lendBorrowStake > 3) badges.push("DeFi Master");
        if (airdrops > 5) badges.push("Airdrop Veteran");
        
        // NFT Score
        const nftsCount = walletData.walletNFTs?.result?.length || walletData.nfts?.length || 0;
        nftScore = calculateDynamicScore(
            nftsCount, 
            weights.nft, 
            {low: 1, medium: 5, high: 10}
        );
        
        if (nftsCount > 10) badges.push("NFT Networker");
        if (nftsCount > 20) badges.push("NFT Whale");
        
        // Additional Metrics (with fallbacks to default values if not available)
        const dappsInteracted = walletData.dappsInteracted?.length || 0;
        dappScore = calculateDynamicScore(
            dappsInteracted, 
            weights.dappInteraction, 
            {low: 1, medium: 3, high: 5}
        );
        
        lendBorrowStakeScore = calculateDynamicScore(
            lendBorrowStake, 
            weights.lendBorrowStake, 
            {low: 1, medium: 2, high: 5}
        );
        
        airdropScore = calculateDynamicScore(
            airdrops, 
            weights.airdropParticipation, 
            {low: 1, medium: 2, high: 5}
        );
        
        const totalGasSpent = walletData.totalGasSpent || 0;
        gasSpentScore = calculateDynamicScore(
            totalGasSpent, 
            weights.gasSpent, 
            {low: 10, medium: 50, high: 100}
        );
        
        const web3Domains = walletData.web3Domains?.length || 0;
        web3DomainsScore = calculateDynamicScore(
            web3Domains, 
            weights.web3Domains, 
            {low: 1, medium: 2, high: 5}
        );
        
        // Additional badges
        if (dappsInteracted > 5) badges.push("Dapp Diplomat");
        if (lendBorrowStake > 2) badges.push("Staking Storyteller");
        if (totalGasSpent > 100) badges.push("Gas Gladiator");
        if (web3Domains > 0) badges.push("Verified Visionary");
        if (activeChains > 5) badges.push("Chain Explorer");
    }

    // Telegram Engagement Score (from Verida Data)
    if (telegramData) {
        // Extract data from the Verida response, with fallbacks
        const groupsCount = telegramData.groups || telegramData.data?.telegram?.groups || 0;
        const messagesCount = telegramData.messages || telegramData.data?.telegram?.messages || 0;
        
        // Process as arrays if they're numeric values
        const groupsArray = Array.isArray(telegramData.groups) ? telegramData.groups : [];
        const messagesArray = Array.isArray(telegramData.messages) ? telegramData.messages : [];
        
        // Add basic engagement score
        telegramScore += calculateDynamicScore(
            typeof groupsCount === 'number' ? groupsCount : groupsArray.length, 
            weights.telegram, 
            {low: 1, medium: 3, high: 5}
        );
        
        telegramScore += calculateDynamicScore(
            typeof messagesCount === 'number' ? messagesCount : messagesArray.length, 
            weights.telegram, 
            {low: 10, medium: 100, high: 500}
        );
        
        // Check for keyword matches (either from the pre-calculated data or calculate it)
        let keywordMatches = telegramData.keywordMatches || telegramData.data?.keywordMatches || {
            totalCount: 0,
            keywords: {
                'cluster': 0,
                'protocol': 0,
                'ai': 0
            }
        };
        
        // If we have the detailed data, process keywords ourselves
        if (groupsArray.length > 0 || messagesArray.length > 0) {
            keywordMatches = {
                totalCount: 0,
                keywords: {
                    'cluster': 0,
                    'protocol': 0,
                    'ai': 0
                }
            };
            
            // Check groups for keyword matches
            groupsArray.forEach(group => {
                const groupText = [
                    group.name, 
                    group.description, 
                    group.subject
                ].filter(Boolean).join(' ').toLowerCase();
                
                checkForKeywords(groupText, keywordMatches);
            });
            
            // Check messages for keyword matches
            messagesArray.forEach(message => {
                const messageText = [
                    message.text, 
                    message.body,
                    message.content
                ].filter(Boolean).join(' ').toLowerCase();
                
                checkForKeywords(messageText, keywordMatches);
            });
        }
        
        // Add the keyword match bonus
        const keywordBonus = (keywordMatches.totalCount || 0) * weights.telegramEngagement;
        telegramScore += keywordBonus;
        
        // Additional Telegram-based metrics if we have detailed group data
        if (groupsArray.length > 0) {
            groupsArray.forEach(group => {
                if (group.permissions?.can_pin_messages || group.permissions?.can_create_topics) {
                    telegramScore += weights.telegramLeadership;
                }
                
                if (group.positions?.some(pos => pos.is_pinned)) {
                    telegramScore += weights.telegramPinned;
                }
            });
        }
        
        // Add badges based on Telegram data
        if (telegramScore > 10) badges.push("Telegram Titan");
        if (typeof groupsCount === 'number' ? groupsCount > 10 : groupsArray.length > 10) {
            badges.push("Community Leader");
        }
    }

    // Total Score - normalize to a 0-10 scale
    const rawTotalScore = socialScore + cryptoScore + nftScore + communityScore + 
                         telegramScore + dappScore + lendBorrowStakeScore + 
                         airdropScore + gasSpentScore + web3DomainsScore;
    
    // Scale the score to 0-10 range
    // We're assuming a theoretical maximum of about 200 points
    const normalizedScore = Math.min(10, Math.max(0, rawTotalScore / 20));
    
    // Add badge bonus (0.5 per badge) to the final score, but don't exceed 10
    const badgeBonus = Math.min(badges.length * 0.5, 2); // Cap badge bonus at 2 points
    const finalScore = Math.min(10, normalizedScore + badgeBonus);

    return { 
        score: parseFloat(finalScore.toFixed(1)), 
        badges,
        components: {
            socialScore: parseFloat(socialScore.toFixed(1)),
            cryptoScore: parseFloat(cryptoScore.toFixed(1)), 
            nftScore: parseFloat(nftScore.toFixed(1)),
            communityScore: parseFloat(communityScore.toFixed(1)),
            telegramScore: parseFloat(telegramScore.toFixed(1)),
            dappScore: parseFloat(dappScore.toFixed(1)),
            lendBorrowStakeScore: parseFloat(lendBorrowStakeScore.toFixed(1)),
            airdropScore: parseFloat(airdropScore.toFixed(1)),
            gasSpentScore: parseFloat(gasSpentScore.toFixed(1)),
            web3DomainsScore: parseFloat(web3DomainsScore.toFixed(1))
        }
    };
}

// Helper function to check for keywords and update the keyword matches
function checkForKeywords(text, keywordMatches) {
    if (!text) return;
    
    const ENGAGE_KEYWORDS = ['cluster', 'protocol', 'ai']; // The list of keywords to check
    const normalizedText = text.toLowerCase();

    ENGAGE_KEYWORDS.forEach(keyword => {
        // Match whole words, case insensitive
        let searchPos = 0;
        const lowerKeyword = keyword.toLowerCase();
        
        while (true) {
            const foundPos = normalizedText.indexOf(lowerKeyword, searchPos);
            if (foundPos === -1) break;
            
            // Check if it's a whole word or hashtag match
            const isWordStart = foundPos === 0 || 
                !normalizedText[foundPos-1].match(/[a-z0-9]/) || 
                normalizedText[foundPos-1] === '#';
                
            const isWordEnd = foundPos + lowerKeyword.length >= normalizedText.length || 
                !normalizedText[foundPos + lowerKeyword.length].match(/[a-z0-9]/);
            
            if (isWordStart && isWordEnd) {
                keywordMatches.keywords[keyword]++;
                keywordMatches.totalCount++;
                break; // Count each keyword only once per text
            }
            
            searchPos = foundPos + 1;
        }
    });
} 