import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart as PieChartIcon, Target, Zap, ArrowRightLeft } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Tooltip as RechartsTooltip, Cell } from "recharts";
import type { Tag } from "@/types/tag";

interface MetricsDashboardProps {
  parentTags: Tag[];
  childTagsCount: number;
  mergeRulesCount: number;
  chatRoutingRulesCount: number;
  mergeRulesApplications: number;
  chatRoutingCorrections: number;
  duplicatesPending: number;
}

export const MetricsDashboard = memo(({
  parentTags,
  childTagsCount,
  mergeRulesCount,
  chatRoutingRulesCount,
  mergeRulesApplications,
  chatRoutingCorrections,
  duplicatesPending,
}: MetricsDashboardProps) => {
  const sourceDistribution = [
    { name: 'IA', value: parentTags.filter(t => t.source === 'ai').length, fill: 'hsl(262, 83%, 58%)' },
    { name: 'Admin', value: parentTags.filter(t => t.source === 'admin').length, fill: 'hsl(142, 71%, 45%)' },
    { name: 'Outros', value: parentTags.filter(t => !['ai', 'admin'].includes(t.source || '')).length, fill: 'hsl(220, 70%, 50%)' },
  ].filter(d => d.value > 0);

  const chatDistribution = [
    { name: 'Saúde', value: parentTags.filter(t => t.target_chat === 'health').length, fill: 'hsl(142, 71%, 45%)' },
    { name: 'Estudo', value: parentTags.filter(t => t.target_chat === 'study').length, fill: 'hsl(262, 83%, 58%)' },
    { name: 'Não definido', value: parentTags.filter(t => !t.target_chat).length, fill: 'hsl(220, 10%, 50%)' },
  ].filter(d => d.value > 0);

  return (
    <Card className="p-6 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Dashboard de Métricas - Sistema de Categorização</h3>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-background/50 rounded-lg border">
          <div className="text-3xl font-bold text-primary">{parentTags.length}</div>
          <div className="text-sm text-muted-foreground mt-1">Tags Pai</div>
        </div>
        <div className="text-center p-4 bg-background/50 rounded-lg border">
          <div className="text-3xl font-bold text-purple-400">{childTagsCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Tags Filhas</div>
        </div>
        <div className="text-center p-4 bg-background/50 rounded-lg border">
          <div className="text-3xl font-bold text-green-400">{mergeRulesCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Regras ML Tags</div>
        </div>
        <div className="text-center p-4 bg-background/50 rounded-lg border">
          <div className="text-3xl font-bold text-cyan-400">{chatRoutingRulesCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Regras ML Chat</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tag Distribution by Source */}
        <div className="p-4 bg-background/30 rounded-lg border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Distribuição por Fonte
          </h4>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {sourceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tag Distribution by Chat */}
        <div className="p-4 bg-background/30 rounded-lg border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Distribuição por Chat
          </h4>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chatDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ML Summary Stats */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              <Zap className="h-4 w-4 inline mr-1 text-green-400" />
              Total aplicações ML Tags: <strong>{mergeRulesApplications}</strong>
            </span>
            <span className="text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4 inline mr-1 text-cyan-400" />
              Total correções Chat: <strong>{chatRoutingCorrections}</strong>
            </span>
          </div>
          <span className="text-muted-foreground">
            Duplicatas pendentes: <strong className="text-amber-400">{duplicatesPending}</strong>
          </span>
        </div>
      </div>
    </Card>
  );
});

MetricsDashboard.displayName = "MetricsDashboard";
