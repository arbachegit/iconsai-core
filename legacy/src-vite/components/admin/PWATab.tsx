/**
 * PWATab - Tab de gerenciamento do PWA
 *
 * v2.0.0 - Simplificado para nova arquitetura
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Users,
  MessageSquare,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PWAStats {
  totalInvites: number;
  pendingInvites: number;
  completedInvites: number;
  totalConversations: number;
  activeSessions: number;
}

const PWATab: React.FC = () => {
  const [stats, setStats] = useState<PWAStats>({
    totalInvites: 0,
    pendingInvites: 0,
    completedInvites: 0,
    totalConversations: 0,
    activeSessions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Buscar estatísticas de convites
      const { count: totalInvites } = await supabase
        .from("user_invites")
        .select("*", { count: "exact", head: true });

      const { count: pendingInvites } = await supabase
        .from("user_invites")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "sent", "opened"]);

      const { count: completedInvites } = await supabase
        .from("user_invites")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      // Buscar estatísticas de conversas
      const { count: totalConversations } = await supabase
        .from("pwa_conversations")
        .select("*", { count: "exact", head: true });

      // Buscar sessões ativas
      const { count: activeSessions } = await supabase
        .from("pwa_sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      setStats({
        totalInvites: totalInvites || 0,
        pendingInvites: pendingInvites || 0,
        completedInvites: completedInvites || 0,
        totalConversations: totalConversations || 0,
        activeSessions: activeSessions || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            PWA Voice Assistant
          </h2>
          <p className="text-muted-foreground">
            Gerenciamento do aplicativo de voz
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <a href="/pwa" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir PWA
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Convites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalInvites}</span>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Convites Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.pendingInvites}</span>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                Aguardando
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Convites Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.completedInvites}</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                Ativos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Conversas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalConversations}</span>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre o PWA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O IconsAI PWA é um assistente de voz inteligente que permite aos usuários
            interagir com diferentes módulos de IA através de comandos de voz.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Sessões Ativas</h4>
              <p className="text-2xl font-bold text-primary">{stats.activeSessions}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Taxa de Conversão</h4>
              <p className="text-2xl font-bold text-primary">
                {stats.totalInvites > 0
                  ? Math.round((stats.completedInvites / stats.totalInvites) * 100)
                  : 0}
                %
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">URL do PWA</h4>
              <code className="text-sm text-primary">
                fia.iconsai.ai/pwa
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWATab;
