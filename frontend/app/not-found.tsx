"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden subtle-grid">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/5 blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 text-center"
      >
        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10">
          <BrainCircuit size={30} className="text-cyan" />
        </div>

        {/* 404 */}
        <div>
          <div className="font-mono text-[120px] font-bold leading-none text-white/5 select-none">
            404
          </div>
          <div className="-mt-8 relative z-10">
            <h1 className="text-2xl font-semibold text-slate-100">Signal not found</h1>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              The route you requested doesn't exist in this terminal. 
              Check the URL or navigate back to the dashboard.
            </p>
          </div>
        </div>

        {/* Glitchy terminal line */}
        <div className="rounded-lg border border-line bg-black/40 px-4 py-2 font-mono text-xs text-slate-500">
          <span className="text-red-400">ERROR</span>{" "}
          <span className="text-slate-400">404 · Route resolution failed ·</span>{" "}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-cyan"
          >▮</motion.span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-5 py-2.5 text-sm font-medium text-cyan transition hover:bg-cyan/20"
          >
            <Home size={15} /> Back to terminal
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-5 py-2.5 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            <ArrowLeft size={15} /> Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
