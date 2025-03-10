import React, { useState } from "react";
import { useSelector } from "react-redux";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Modal from "react-modal";
import {
  WhatsappShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  FacebookShareButton,
  RedditShareButton,
  EmailShareButton,
} from "react-share";
import {
  FaWhatsapp,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaReddit,
  FaEnvelope,
} from "react-icons/fa";

Modal.setAppElement("#root"); // Required for accessibility

const DownloadButton = () => {
  const score = useSelector((state) => state.score.totalScore);
  const title = useSelector((state) => state.score.title);

  const [format, setFormat] = useState("text");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const shareMessage = `Check out my score on Cluster Protocol! Score: ${score} - Title: ${title}`;
  const shareUrl = "https://your-app-url.com"; // Replace with your actual app URL

  // Function to Download Score in Selected Format
  const downloadReport = async () => {
    const content = `Your Score: ${score}\nTitle: ${title}`;
    switch (format) {
      case "text":
        downloadText(content);
        break;
      case "pdf":
        await downloadPDF(content);
        break;
      case "img":
        await downloadImage();
        break;
      default:
        downloadText(content);
    }
  };

  const downloadText = (content) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "score-report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPDF = async (content) => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save("score-report.pdf");
  };

  const downloadImage = async () => {
    const element = document.getElementById("score-card");
    if (element) {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = "score-report.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div>
      {/* Download Section */}
      <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700 text-center">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Download Your Score</h3>

        <select
          onChange={(e) => setFormat(e.target.value)}
          value={format}
          className="mb-4 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none"
        >
          <option value="text">Text</option>
          <option value="pdf">PDF</option>
          <option value="img">Image</option>
        </select>

        <button
          onClick={downloadReport}
          className="ml-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-500 transition"
        >
          Download
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-4 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-500 transition"
        >
          Share
        </button>
      </div>

      {/* Share Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Share Score"
        style={{
          overlay: { zIndex: 1000, backgroundColor: "rgba(0, 0, 0, 0.7)" },
          content: {
            width: "350px",
            height: "450px",
            margin: "auto",
            background: "#222",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
          },
        }}
      >
        <h2 className="text-lg font-bold text-white mb-4 text-center">Share Your Score</h2>
        <div className="flex flex-col items-center space-y-3">
          <WhatsappShareButton url={shareUrl} title={shareMessage}>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaWhatsapp /> WhatsApp
            </button>
          </WhatsappShareButton>

          <LinkedinShareButton url={shareUrl} summary={shareMessage}>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaLinkedin /> LinkedIn
            </button>
          </LinkedinShareButton>

          <TwitterShareButton url={shareUrl} title={shareMessage}>
            <button className="bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaTwitter /> Twitter
            </button>
          </TwitterShareButton>

          <FacebookShareButton url={shareUrl} quote={shareMessage}>
            <button className="bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaFacebook /> Facebook
            </button>
          </FacebookShareButton>

          <RedditShareButton url={shareUrl} title={shareMessage}>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaReddit /> Reddit
            </button>
          </RedditShareButton>

          <EmailShareButton url={shareUrl} subject="My Score on Cluster Protocol" body={shareMessage}>
            <button className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <FaEnvelope /> Email
            </button>
          </EmailShareButton>
        </div>

        <button
          onClick={() => setIsModalOpen(false)}
          className="mt-4 w-full bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-400 transition"
        >
          Close
        </button>
      </Modal>
    </div>
  );
};

export default DownloadButton;
