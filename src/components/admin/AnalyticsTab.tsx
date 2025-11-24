import { Card } from "@/components/ui/card";
import { useChatAnalytics } from "@/hooks/useChatAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export const AnalyticsTab = () => {
  const { analytics } = useChatAnalytics();

  // Group by date
  const conversationsByDate = analytics?.reduce((acc: any, curr) => {
    const date = new Date(curr.started_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, count: 0, messages: 0, audio: 0 };
    }
    acc[date].count++;
    acc[date].messages += curr.message_count;
    acc[date].audio += curr.audio_plays;
    return acc;
  }, {});

  const chartData = Object.values(conversationsByDate || {}).slice(-7);

  // Top topics
  const topicsCount = analytics?.reduce((acc: any, curr) => {
    curr.topics.forEach((topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {});

  const topTopics = Object.entries(topicsCount || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Métricas de uso e engajamento do KnowYOU
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Conversas nos Últimos 7 Dias
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Top 10 Tópicos
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topTopics}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
              <XAxis
                dataKey="topic"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--primary) / 0.2)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Sessões Recentes
        </h2>

        <div className="space-y-3">
          {analytics?.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-lg bg-background/50"
            >
              <div>
                <p className="font-medium text-foreground">
                  {session.user_name || "Usuário Anônimo"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(session.started_at).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Mensagens</p>
                  <p className="font-bold text-foreground">{session.message_count}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Áudios</p>
                  <p className="font-bold text-foreground">{session.audio_plays}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
