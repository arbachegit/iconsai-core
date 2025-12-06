import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif;">Erro: Elemento root não encontrado</div>';
} else {
  try {
    createRoot(rootElement).render(
      <AudioPlayerProvider>
        <App />
      </AudioPlayerProvider>
    );
  } catch (error) {
    console.error("RENDER ERROR:", error);
    rootElement.innerHTML = `
      <div style="color: #ef4444; padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="margin-bottom: 16px;">Erro de Inicialização</h1>
        <p style="margin-bottom: 16px;">${error instanceof Error ? error.message : String(error)}</p>
        <pre style="background: #1f1f1f; padding: 16px; border-radius: 8px; overflow: auto; font-size: 12px; color: #f87171;">${error instanceof Error ? error.stack : ''}</pre>
        <button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Recarregar
        </button>
      </div>
    `;
  }
}
