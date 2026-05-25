"use client";

import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { agentRoster } from "@/lib/terminal-data";
import { Decision } from "@/lib/types";

export function AgentOrchestration({ decision }: { decision?: Decision }) {
  const agents = agentRoster(decision);
  return (
    <div className="space-y-4">
      <div className="relative mx-auto grid h-48 max-w-[560px] place-items-center overflow-hidden rounded-lg border border-line bg-black/25">
        <div className="absolute inset-0 opacity-60 neural-grid" />
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(61,219,217,.14)", "0 0 48px rgba(61,219,217,.28)", "0 0 20px rgba(61,219,217,.14)"] }}
          transition={{ repeat: Infinity, duration: 2.8 }}
          className="z-10 grid h-20 w-20 place-items-center rounded-full border border-cyan/40 bg-cyan/10 text-cyan"
        >
          <BrainCircuit size={28} />
        </motion.div>
        {agents.slice(0, 8).map((agent, index) => {
          const angle = (index / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 190;
          const y = Math.sin(angle) * 72;
          return (
            <motion.div
              key={agent.agent}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              transition={{ delay: index * 0.04 }}
              className="absolute z-20 rounded-full border border-line bg-[#0d1820] px-2.5 py-1 font-mono text-[10px] uppercase text-slate-200"
            >
              {agent.agent.replace("_", " ")}
            </motion.div>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {agents.map((agent) => (
          <div key={agent.agent} className="rounded-md border border-line bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold capitalize text-slate-200">{agent.agent.replace("_", " ")}</span>
              <span className="font-mono text-xs text-cyan">{Math.round(agent.confidence * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${Math.round(agent.confidence * 100)}%` }}
                className="h-1.5 rounded-full bg-cyan"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

