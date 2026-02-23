/**
 * SecurityDashboard - Placeholder para dashboard de segurança
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export const SecurityDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Dashboard de Segurança</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O dashboard de segurança será implementado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
