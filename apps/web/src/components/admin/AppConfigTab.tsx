/**
 * AppConfigTab - Configurações do sistema
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const AppConfigTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            As configurações do sistema serão implementadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppConfigTab;
