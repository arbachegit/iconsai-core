import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportStats {
  total: number;
  byCategory: Record<string, number>;
  byUser: Record<string, number>;
  recentActions: any[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { period } = await req.json(); // 'daily', 'weekly', 'monthly'
    
    if (!["daily", "weekly", "monthly"].includes(period)) {
      throw new Error("Período inválido. Use: daily, weekly ou monthly");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calcular datas do período
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;
    
    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        periodLabel = "Últimas 24 horas";
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = "Últimos 7 dias";
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = "Últimos 30 dias";
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        periodLabel = "Últimas 24 horas";
    }

    console.log(`Gerando relatório ${period}: ${startDate.toISOString()} até ${now.toISOString()}`);

    // Buscar logs do período
    const { data: logs, error: logsError } = await supabase
      .from("user_activity_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) throw logsError;

    // Buscar email de notificação
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("gmail_notification_email, alert_email")
      .single();

    if (settingsError) throw settingsError;

    const recipientEmail = settings?.gmail_notification_email || settings?.alert_email || "admin@knowyou.app";

    // Agrupar estatísticas
    const stats: ReportStats = {
      total: logs?.length || 0,
      byCategory: {},
      byUser: {},
      recentActions: logs?.slice(0, 10) || []
    };

    logs?.forEach(log => {
      stats.byCategory[log.action_category] = (stats.byCategory[log.action_category] || 0) + 1;
      stats.byUser[log.user_email] = (stats.byUser[log.user_email] || 0) + 1;
    });

    // Gerar HTML do relatório
    const html = generateReportHTML(periodLabel, stats, startDate, now);

    // Enviar via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    console.log(`Enviando relatório para: ${recipientEmail}`);
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "KnowYOU <noreply@resend.dev>", // Use your verified domain
      to: [recipientEmail],
      subject: `📊 Relatório de Atividades ${period.toUpperCase()} - KnowYOU`,
      html
    });

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);
      throw emailError;
    }

    console.log("Email enviado com sucesso:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats, 
        recipient: recipientEmail,
        emailId: emailData?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao gerar relatório:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateReportHTML(
  periodLabel: string, 
  stats: ReportStats, 
  startDate: Date, 
  endDate: Date
): string {
  const categoryBadges = Object.entries(stats.byCategory)
    .map(([cat, count]) => {
      const colors: Record<string, string> = {
        LOGIN: 'background: rgba(34, 197, 94, 0.2); color: rgb(34, 197, 94);',
        LOGOUT: 'background: rgba(156, 163, 175, 0.2); color: rgb(156, 163, 175);',
        DOCUMENT: 'background: rgba(59, 130, 246, 0.2); color: rgb(59, 130, 246);',
        CONFIG: 'background: rgba(168, 85, 247, 0.2); color: rgb(168, 85, 247);',
        CONTENT: 'background: rgba(249, 115, 22, 0.2); color: rgb(249, 115, 22);',
        NAVIGATION: 'background: rgba(100, 116, 139, 0.2); color: rgb(100, 116, 139);',
        RAG: 'background: rgba(6, 182, 212, 0.2); color: rgb(6, 182, 212);',
        EXPORT: 'background: rgba(99, 102, 241, 0.2); color: rgb(99, 102, 241);',
        DELETE: 'background: rgba(239, 68, 68, 0.2); color: rgb(239, 68, 68);',
        VERSION: 'background: rgba(16, 185, 129, 0.2); color: rgb(16, 185, 129);',
        TAG: 'background: rgba(236, 72, 153, 0.2); color: rgb(236, 72, 153);',
        IMAGE: 'background: rgba(251, 191, 36, 0.2); color: rgb(251, 191, 36);',
      };
      
      return `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 4px; ${colors[cat] || 'background: rgba(156, 163, 175, 0.2); color: rgb(156, 163, 175);'}">${cat}: ${count}</span>`;
    })
    .join('');

  const recentActionsList = stats.recentActions
    .map(action => {
      const date = new Date(action.created_at).toLocaleString('pt-BR');
      return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(147, 51, 234, 0.1);">
        <strong>${date}</strong> - ${action.user_email}: ${action.action}
        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px; background: rgba(147, 51, 234, 0.15); color: rgb(147, 51, 234);">${action.action_category}</span>
      </li>`;
    })
    .join('');

  const userStats = Object.entries(stats.byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user, count]) => `<li style="padding: 6px 0;">${user}: <strong>${count} ações</strong></li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      background: #0f0f0f; 
      color: #ffffff; 
      margin: 0; 
      padding: 20px; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #9333ea, #3b82f6); 
      padding: 32px 24px; 
      text-align: center;
    }
    .header h1 { 
      margin: 0 0 8px 0; 
      font-size: 28px; 
      font-weight: 700; 
    }
    .header p { 
      margin: 0; 
      opacity: 0.9; 
      font-size: 14px; 
    }
    .content {
      padding: 24px;
    }
    .stat-card { 
      background: #262626; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 16px 0; 
      border: 1px solid rgba(147, 51, 234, 0.2);
    }
    .stat-card h3 { 
      margin: 0 0 16px 0; 
      font-size: 18px; 
      color: #9333ea; 
    }
    .total-count {
      font-size: 48px;
      font-weight: 700;
      color: #9333ea;
      text-align: center;
      margin: 16px 0;
    }
    ul { 
      list-style: none; 
      padding: 0; 
      margin: 0; 
    }
    .footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid rgba(147, 51, 234, 0.2);
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Atividades</h1>
      <p>${periodLabel}</p>
      <p style="font-size: 12px; margin-top: 8px;">
        ${startDate.toLocaleDateString('pt-BR')} ${startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} 
        - 
        ${endDate.toLocaleDateString('pt-BR')} ${endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
    
    <div class="content">
      <div class="stat-card">
        <h3>Total de Ações</h3>
        <div class="total-count">${stats.total}</div>
      </div>
      
      ${stats.total > 0 ? `
      <div class="stat-card">
        <h3>Por Categoria</h3>
        <div>${categoryBadges}</div>
      </div>
      
      <div class="stat-card">
        <h3>Usuários Mais Ativos</h3>
        <ul>${userStats || '<li>Nenhum usuário registrado</li>'}</ul>
      </div>
      
      <div class="stat-card">
        <h3>Ações Recentes (Últimas 10)</h3>
        <ul>${recentActionsList || '<li>Nenhuma ação registrada</li>'}</ul>
      </div>
      ` : `
      <div class="stat-card">
        <p style="text-align: center; color: rgba(255, 255, 255, 0.6);">Nenhuma atividade registrada neste período.</p>
      </div>
      `}
    </div>
    
    <div class="footer">
      <p>KnowYOU - Sistema de Gestão de Atividades</p>
      <p style="margin-top: 8px;">Este é um email automático. Não responda a esta mensagem.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

serve(handler);
