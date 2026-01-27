/**
 * PWACityPage - Página do PWA City (Em desenvolvimento)
 */

import React from "react";
import { Building2, Construction } from "lucide-react";

const PWACityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">PWA City</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
          <Construction className="w-4 h-4" />
          <span>Em Desenvolvimento</span>
        </div>
        <p className="text-muted-foreground">
          O assistente de serviços urbanos estará disponível em breve.
        </p>
      </div>
    </div>
  );
};

export default PWACityPage;
