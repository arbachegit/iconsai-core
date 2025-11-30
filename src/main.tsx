import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";

createRoot(document.getElementById("root")!).render(
  <AudioPlayerProvider>
    <App />
  </AudioPlayerProvider>
);
