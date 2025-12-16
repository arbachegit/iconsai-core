import { AgentChat } from "@/components/chat/AgentChat";

export function AIChat() {
  return (
    <div className="h-full">
      <AgentChat agentSlug="analyst" embedded />
    </div>
  );
}
