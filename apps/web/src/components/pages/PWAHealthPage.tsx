/**
 * PWAHealthPage - Página do PWA Health (Em desenvolvimento)
 */

import React from "react";
import { Heart, Construction } from "lucide-react";

const PWAHealthPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <Heart className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">PWA Health</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
          <Construction className="w-4 h-4" />
          <span>Em Desenvolvimento</span>
        </div>
        <p className="text-muted-foreground">
          O assistente de saúde e bem-estar estará disponível em breve.
        </p>
      </div>
    </div>
  );
};

export default PWAHealthPage;
