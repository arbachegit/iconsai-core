import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, TrendingUp, AlertTriangle, Check, X } from "lucide-react";

interface MergeRule {
  id: string;
  source_tag: string;
  canonical_tag: string;
  chat_type: string;
  created_at: string;
  created_by: string | null;
  merge_count: number;
}

interface MLEvent {
  id: string;
  action_type: string;
  input_state: any;
  user_decision: any;
  rationale?: string;
  created_at: string;
}

interface MLInsight {
  id: string;
  title: string;
  description: string;
  type: 'merge_suggestion' | 'orphan_pattern' | 'low_confidence' | 'unused_rule';
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

interface MLInsightsPanelProps {
  mergeRules: MergeRule[];
  mlEvents: MLEvent[];
  onApplySuggestion?: (insight: MLInsight) => void;
  onIgnoreSuggestion?: (insight: MLInsight) => void;
}

export const MLInsightsPanel = ({
  mergeRules,
  mlEvents,
  onApplySuggestion,
  onIgnoreSuggestion
}: MLInsightsPanelProps) => {
  const insights = useMemo<MLInsight[]>(() => {
    const result: MLInsight[] = [];

    // 1. Frequent merge patterns: if same source_tag merged 3+ times, suggest auto-rule
    const mergePatterns = (mlEvents || [])
      .filter(e => e.action_type?.includes('merge'))
      .reduce((acc, e) => {
        const decision = e.user_decision as any;
        const targetName = decision?.target_tag_name;
        if (targetName) {
          acc[targetName] = (acc[targetName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

    Object.entries(mergePatterns).forEach(([tagName, count]) => {
      if (count >= 3) {
        result.push({
          id: `merge-pattern-${tagName}`,
          title: `"${tagName}" foi destino de ${count} merges`,
          description: `Esta tag recebe frequentemente tags similares. Considere criar regras automáticas para evitar duplicatas.`,
          type: 'merge_suggestion',
          priority: count >= 5 ? 'high' : 'medium',
          data: { tagName, count }
        });
      }
    });

    // 2. Recurrent orphan adoptions: same child adopted by same parent 2+ times
    const adoptionPatterns = (mlEvents || [])
      .filter(e => e.action_type === 'adopt_orphan')
      .reduce((acc, e) => {
        const decision = e.user_decision as any;
        const key = `${decision?.target_parent_name}:${decision?.target_tag_name}`;
        if (key && key !== 'undefined:undefined') {
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

    Object.entries(adoptionPatterns).forEach(([key, count]) => {
      if (count >= 2) {
        const [parent, child] = key.split(':');
        result.push({
          id: `orphan-pattern-${key}`,
          title: `"${child}" adotada por "${parent}" ${count}x`,
          description: `Esta associação órfão→pai ocorre repetidamente. Considere criar associação permanente.`,
          type: 'orphan_pattern',
          priority: 'medium',
          data: { parent, child, count }
        });
      }
    });

    // 3. Unused ML rules: rules created 30+ days ago with merge_count = 0
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    (mergeRules || []).forEach(rule => {
      const createdAt = new Date(rule.created_at);
      if (createdAt < thirtyDaysAgo && (rule.merge_count || 0) === 0) {
        result.push({
          id: `unused-rule-${rule.id}`,
          title: `Regra "${rule.source_tag}" → "${rule.canonical_tag}" não utilizada`,
          description: `Esta regra existe há mais de 30 dias sem aplicações. Considere removê-la.`,
          type: 'unused_rule',
          priority: 'low',
          data: { ruleId: rule.id, sourcTag: rule.source_tag, canonicalTag: rule.canonical_tag }
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [mergeRules, mlEvents]);

  if (insights.length === 0) {
    return (
      <Card className="p-4 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold">Insights ML - Sugestões de Reorganização</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhuma sugestão de reorganização no momento. O sistema está analisando padrões de uso.
        </p>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-amber-500/50 bg-amber-500/10';
      case 'low': return 'border-blue-500/50 bg-blue-500/10';
      default: return 'border-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'merge_suggestion': return <TrendingUp className="h-4 w-4 text-purple-400" />;
      case 'orphan_pattern': return <Target className="h-4 w-4 text-cyan-400" />;
      case 'unused_rule': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default: return <Sparkles className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <Card className="p-4 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-400" />
        <h3 className="font-semibold">Insights ML - Sugestões de Reorganização</h3>
        <Badge variant="outline" className="ml-auto">{insights.length} sugestões</Badge>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {insights.slice(0, 10).map(insight => (
          <div 
            key={insight.id} 
            className={`p-3 rounded-lg border ${getPriorityColor(insight.priority)}`}
          >
            <div className="flex items-start gap-2">
              {getTypeIcon(insight.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      insight.priority === 'high' ? 'text-red-400 border-red-500/50' :
                      insight.priority === 'medium' ? 'text-amber-400 border-amber-500/50' :
                      'text-blue-400 border-blue-500/50'
                    }`}
                  >
                    {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={() => onApplySuggestion?.(insight)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-xs"
                    onClick={() => onIgnoreSuggestion?.(insight)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Ignorar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {insights.length > 10 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{insights.length - 10} outras sugestões
          </p>
        )}
      </div>
    </Card>
  );
};
