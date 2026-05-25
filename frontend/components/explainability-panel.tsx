"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { GitBranch, Maximize2, X } from "lucide-react";
import { Decision } from "@/lib/types";

export function ExplainabilityPanel({ decision }: { decision?: Decision }) {
  const entries = Object.entries(decision?.feature_importance ?? { momentum: 0.72, sentiment: 0.36, volatility: 0.28, regime: 0.7, risk: 0.45 });
  return (
    <Dialog.Root>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <GitBranch size={16} />
            Decision Explainability
          </div>
          <Dialog.Trigger className="rounded-md border border-line p-1.5 text-slate-400 transition hover:border-cyan/60 hover:text-cyan" aria-label="Open explainability modal">
            <Maximize2 size={15} />
          </Dialog.Trigger>
        </div>
        <p className="text-sm leading-6 text-slate-300">{decision?.explanation ?? "The meta-agent is waiting for a complete signal bundle."}</p>
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[92px_1fr_42px] items-center gap-2 text-xs">
              <span className="capitalize text-slate-400">{key}</span>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan to-success" style={{ width: `${Math.round(value * 100)}%` }} />
              </div>
              <span className="font-mono text-slate-300">{Math.round(value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(760px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cyan/20 bg-[#08131a] p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">AI Reasoning Tree</Dialog.Title>
            <Dialog.Description className="sr-only">
              Expanded explanation of the quantitative model reasoning and feature contribution pipeline.
            </Dialog.Description>
            <Dialog.Close className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-slate-100"><X size={16} /></Dialog.Close>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Signal ingestion", "Agent voting", "Risk normalization", "Portfolio impact"].map((step, index) => (
              <div key={step} className="rounded-lg border border-line bg-white/[0.03] p-4">
                <div className="font-mono text-xs text-cyan">0{index + 1}</div>
                <div className="mt-2 font-semibold text-slate-100">{step}</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Contributions are normalized against volatility, regime confidence, current exposure, sentiment impulse, and indicator agreement.
                </p>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
