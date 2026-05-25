import { Bot, ShieldCheck, TrendingUp } from "lucide-react";
import { Decision } from "@/lib/types";

export function AgentFeed({ decision }: { decision?: Decision }) {
  return (
    <div className="space-y-3">
      {decision?.agents.map((agent) => (
        <div key={agent.agent} className="rounded-md border border-line bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {agent.agent === "risk_manager" ? <ShieldCheck size={16} /> : agent.agent === "momentum" ? <TrendingUp size={16} /> : <Bot size={16} />}
              <span className="capitalize">{agent.agent.replace("_", " ")}</span>
            </div>
            <span className={agent.action === "BUY" ? "text-success" : agent.action === "SELL" ? "text-danger" : "text-amber"}>
              {agent.action} {(agent.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">{agent.explanation}</p>
        </div>
      ))}
    </div>
  );
}

