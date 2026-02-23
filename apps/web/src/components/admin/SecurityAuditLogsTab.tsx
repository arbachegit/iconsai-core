/**
 * SecurityAuditLogsTab - Placeholder para logs de auditoria
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export const SecurityAuditLogsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Os logs de auditoria serão implementados em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAuditLogsTab;
