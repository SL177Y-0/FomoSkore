import { useState } from "react";
import PropTypes from "prop-types";

const DownloadButton = ({ score, badges = [], componentScores = {} }) => {
  const [downloadFormat, setDownloadFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Get appropriate badge title based on score
  const getBadgeTitle = (score) => {
    if (score < 3) return "BEGINNER";
    if (score < 6) return "INTERMEDIATE";
    if (score < 8) return "ADVANCED";
    return "EXPERT";
  };

  // Function to generate PDF using Canvas
  const generatePDF = async () => {
    try {
      setLoading(true);
      
      // Simulate PDF generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create canvas for PDF generation
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 800;
      canvas.height = 800;
      
      // Set background
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add logo/heading
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 40px Arial";
      ctx.fillText("FomoScore Certificate", 200, 100);
      
      // Add score
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 80px Arial";
      ctx.fillText(score.toFixed(1).toString(), 350, 220);
      
      // Add score scale
      ctx.fillStyle = "#94e2d5";
      ctx.font = "bold 24px Arial";
      ctx.fillText("/10", 470, 220);
      
      // Add badge title
      ctx.fillStyle = "#94e2d5";
      ctx.font = "italic 32px Arial";
      ctx.fillText(getBadgeTitle(score), 340, 280);
      
      // Add component scores
      ctx.fillStyle = "#cdd6f4";
      ctx.font = "bold 24px Arial";
      ctx.fillText("Component Scores:", 280, 340);
      
      let yPos = 380;
      
      // Add Twitter, Wallet, and Verida scores
      if (componentScores.twitterScore !== undefined) {
        ctx.fillStyle = "#1da1f2";
        ctx.font = "20px Arial";
        ctx.fillText(`Twitter: ${componentScores.twitterScore.toFixed(1)}/10`, 280, yPos);
        yPos += 40;
      }
      
      if (componentScores.walletScore !== undefined) {
        ctx.fillStyle = "#f6851b";
        ctx.font = "20px Arial";
        ctx.fillText(`Wallet: ${componentScores.walletScore.toFixed(1)}/10`, 280, yPos);
        yPos += 40;
      }
      
      if (componentScores.veridaScore !== undefined) {
        ctx.fillStyle = "#6c5ce7";
        ctx.font = "20px Arial";
        ctx.fillText(`Verida: ${componentScores.veridaScore.toFixed(1)}/10`, 280, yPos);
        yPos += 40;
      }
      
      // Add badges
      if (badges && badges.length > 0) {
        ctx.fillStyle = "#cdd6f4";
        ctx.font = "bold 24px Arial";
        ctx.fillText("Badges Earned:", 280, yPos);
        yPos += 40;
        
        badges.forEach((badge, index) => {
          if (index < 3) { // Limit to 3 badges to fit on certificate
            ctx.fillStyle = "#f1c40f";
            ctx.font = "20px Arial";
            ctx.fillText(`• ${badge}`, 280, yPos);
            yPos += 30;
          }
        });
      }
      
      // Add border
      ctx.strokeStyle = "#6c7086";
      ctx.lineWidth = 10;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
      
      // Add date
      const currentDate = new Date().toLocaleDateString();
      ctx.fillStyle = "#cdd6f4";
      ctx.font = "20px Arial";
      ctx.fillText(`Generated on: ${currentDate}`, 290, 700);
      
      // Convert canvas to data URL
      const dataURL = canvas.toDataURL("image/png");
      
      // Create download link
      const link = document.createElement("a");
      link.download = `fomoscore-${score.toFixed(1)}-${getBadgeTitle(score).toLowerCase()}.${downloadFormat === "pdf" ? "png" : "json"}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate JSON
  const generateJSON = async () => {
    try {
      setLoading(true);
      
      // Simulate JSON generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const jsonData = {
        score: parseFloat(score.toFixed(1)),
        level: getBadgeTitle(score),
        timestamp: new Date().toISOString(),
        certificateId: `FOMO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        badges: badges || [],
        componentScores: {
          twitter: componentScores.twitterScore !== undefined ? parseFloat(componentScores.twitterScore.toFixed(1)) : 0,
          wallet: componentScores.walletScore !== undefined ? parseFloat(componentScores.walletScore.toFixed(1)) : 0,
          verida: componentScores.veridaScore !== undefined ? parseFloat(componentScores.veridaScore.toFixed(1)) : 0
        },
        detailedScores: Object.entries(componentScores)
          .filter(([key]) => !['socialScore', 'cryptoScore', 'telegramScore', 'twitterScore', 'walletScore', 'veridaScore'].includes(key) && componentScores[key] > 0)
          .reduce((acc, [key, value]) => {
            acc[key] = parseFloat(value.toFixed(1));
            return acc;
          }, {})
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData, null, 2));
      const link = document.createElement("a");
      link.download = `fomoscore-${score.toFixed(1)}.json`;
      link.href = dataStr;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating JSON:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadFormat === "pdf") {
      generatePDF();
    } else {
      generateJSON();
    }
  };

  const handleShare = (platform) => {
    const scoreText = `Check out my FomoScore: ${score.toFixed(1)}/10 (${getBadgeTitle(score)})! #FomoScore`;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(scoreText)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(scoreText)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('My FomoScore')}&summary=${encodeURIComponent(scoreText)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(scoreText)}`;
        break;
      default:
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setShareModalOpen(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Format Selection */}
      <div className="flex mb-4 justify-center">
        <button
          onClick={() => setDownloadFormat("pdf")}
          className={`px-4 py-2 text-sm rounded-l-lg ${
            downloadFormat === "pdf"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          Certificate
        </button>
        <button
          onClick={() => setDownloadFormat("json")}
          className={`px-4 py-2 text-sm rounded-r-lg ${
            downloadFormat === "json"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
        >
          JSON Data
        </button>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-lg transition flex items-center justify-center ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            Generating...
          </>
        ) : downloadSuccess ? (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Downloaded!
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download {downloadFormat === "pdf" ? "Certificate" : "JSON"}
          </>
        )}
      </button>

      {/* Share Button */}
      <button 
        onClick={() => setShareModalOpen(true)}
        className="mt-2 bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded-lg transition flex items-center justify-center"
      >
        <svg 
          className="w-5 h-5 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
          />
        </svg>
        Share Score
      </button>

      {/* Preview Information */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
        <p className="text-gray-300 mb-1">Preview:</p>
        <p className="font-bold">{`Score: ${score.toFixed(1)}/10`}</p>
        <p className="text-blue-400">{`Level: ${getBadgeTitle(score)}`}</p>
        
        {/* Display badges if available */}
        {badges && badges.length > 0 && (
          <div className="mt-1">
            <p className="text-yellow-400 font-semibold">Badges:</p>
            <ul className="list-disc list-inside pl-2">
              {badges.slice(0, 3).map((badge, index) => (
                <li key={index} className="text-yellow-300">{badge}</li>
              ))}
              {badges.length > 3 && <li className="text-gray-400">+{badges.length - 3} more</li>}
            </ul>
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-2">
          Download will include a timestamped certificate showing your FomoScore achievement.
        </p>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Share Your Score</h3>
              <button 
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            </div>
            
            <p className="mb-4 text-gray-300">Share your FomoScore of {score.toFixed(1)}/10 ({getBadgeTitle(score)}) with your network</p>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <button 
                onClick={() => handleShare('twitter')}
                className="p-3 bg-blue-400 hover:bg-blue-500 rounded-full transition"
                title="Share on Twitter/X"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.057 10.057 0 01-3.126 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.9 4.9 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59l-.047-.02z"/>
                </svg>
            </button>
              
              <button 
                onClick={() => handleShare('facebook')}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition"
                title="Share on Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </button>
              
              <button 
                onClick={() => handleShare('linkedin')}
                className="p-3 bg-blue-700 hover:bg-blue-800 rounded-full transition"
                title="Share on LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.223 0h.002z"/>
                </svg>
            </button>
              
              <button 
                onClick={() => handleShare('telegram')}
                className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition"
                title="Share on Telegram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.306.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DownloadButton.propTypes = {
  score: PropTypes.number.isRequired,
  badges: PropTypes.array,
  componentScores: PropTypes.object
};

export default DownloadButton;
