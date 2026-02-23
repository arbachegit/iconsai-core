/**
 * SecurityWhitelist - Placeholder para whitelist de IPs
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const SecurityWhitelist: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Whitelist de IPs</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A gestão de whitelist de IPs será implementada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityWhitelist;
