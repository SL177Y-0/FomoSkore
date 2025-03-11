import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Provider } from "react-redux";
import { store } from "./redux/store.js";
import { BrowserRouter } from "react-router-dom";
import { PrivyProvider } from "@privy-io/react-auth";
import "./index.css";

// Use the App ID from environment variables
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrivyProvider appId={privyAppId}>
      <BrowserRouter>
      <Provider store={store}>
      <App />
    </Provider>
      </BrowserRouter>
    </PrivyProvider>
  </React.StrictMode>
);
