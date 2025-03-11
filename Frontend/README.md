# FomoSkoree - Unified Dashboard

## Overview

FomoSkoree is an application that calculates and displays a user's FOMO score based on various data sources including:
- X/Twitter activity
- Wallet activity
- Verida data

The latest update includes a unified dashboard that integrates all components into a single coherent interface.

## Features

### Unified Dashboard Layout

The new dashboard follows a clear 3-column structure:

1. **Left Column**:
   - FomoScore display with overall score
   - X/Twitter connection

2. **Middle Column**:
   - Score breakdown by source (X/Twitter, Wallet, Verida)
   - Score download panel

3. **Right Column**:
   - Tab interface to switch between:
     - Verida login/dashboard (with groups and messages)
     - Wallet connection options

### Verida Integration

The Verida dashboard now appears in the same section after connecting, showing:
- Overview with score and statistics
- Groups tab showing Telegram groups
- Messages tab showing recent messages

### Design Improvements

- Consistent styling across all components
- Using Verida's theme as the global style foundation
- Responsive design for various screen sizes
- Improved user experience with intuitive navigation

## Setup and Running

### Prerequisites

- Node.js 16+ installed
- MongoDB running (for backend)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd FomoSkoree/cluster/Frontend
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` if it doesn't exist
   - Ensure `VITE_API_BASE_URL` is set to your backend URL (default: http://localhost:5001)
   - Verify that `VITE_PRIVY_APP_ID` is correctly set to your Privy App ID

### Running the Application

1. Start the backend:
   ```
   cd FomoSkoree/cluster/Backend
   npm start
   ```

2. Start the frontend development server:
   ```
   cd FomoSkoree/cluster/Frontend
   npm run dev
   ```

3. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## Authentication Flow

1. **Main Login**: Users log in via Privy authentication
   - If you see "You don't have access to this app. Have you been invited?", check that:
     - Your Privy App ID is correct in both `.env` and `main.jsx`
     - Your Privy app is not in "Invite Only" mode
     - You're accessing from an allowed domain

2. **Verida Connection**: Users can connect their Verida account from within the dashboard
   - After connecting, the Verida dashboard appears in the same section
   - Users can view groups, messages, and other Verida data

3. **X/Twitter Connection**: Users can connect their X/Twitter account

4. **Wallet Connection**: Multiple wallet options are available to connect

## Development Notes

- The application uses Vite for the frontend build
- Styling is done with Tailwind CSS and custom CSS
- The Verida integration uses the Verida Auth API

## File Structure

- `/src/components/UnifiedDashboard.jsx` - Main dashboard component
- `/src/components/UnifiedDashboard.css` - Custom styles for the dashboard
- `/src/Verida/VeridaStyles.css` - Base Verida styles used globally
- `/src/Home/` - Individual component directories for specific functionality
