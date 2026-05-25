"use client";

import { motion } from "framer-motion";
import { TerminalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LiveTerminal({ events }: { events: TerminalEvent[] }) {
  return (
    <div className="h-[260px] overflow-hidden rounded-lg border border-line bg-black/30">
      <div className="border-b border-line px-3 py-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
        Live Market Operating Log
      </div>
      <div className="space-y-1 p-2">
        {events.map((event, index) => (
          <motion.div
            key={`${event.id}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-[68px_120px_1fr] gap-2 rounded-md px-2 py-1.5 font-mono text-[11px] text-slate-300 transition hover:bg-white/[0.04]"
          >
            <span className="text-slate-500">[{event.timestamp}]</span>
            <span className={cn("truncate", severityColor(event.severity))}>{event.source}</span>
            <span className="truncate">{event.message}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function severityColor(severity: TerminalEvent["severity"]) {
  return {
    info: "text-cyan",
    success: "text-success",
    warning: "text-amber",
    danger: "text-danger"
  }[severity];
}

