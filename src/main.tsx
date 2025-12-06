import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <AudioPlayerProvider>
      <App />
    </AudioPlayerProvider>
  );
} else {
  console.error("Root element not found");
}
