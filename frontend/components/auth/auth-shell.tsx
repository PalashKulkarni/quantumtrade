/**
 * Shared shell for login + signup pages.
 * Dark, terminal-aesthetic with animated grid and glow — matches the dashboard.
 */
"use client";

import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  footerText: string;
  footerLink: string;
  footerLinkLabel: string;
}

export function AuthShell({
  children,
  title,
  subtitle,
  footerText,
  footerLink,
  footerLinkLabel,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden subtle-grid">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] translate-x-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10">
            <BrainCircuit size={24} className="text-cyan" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan/70">QuantumTrade AI</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-50">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-xl p-6">{children}</div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          {footerText}{" "}
          <Link href={footerLink} className="text-cyan transition hover:text-cyan/80">
            {footerLinkLabel}
          </Link>
        </p>

        {/* Legal */}
        <p className="mt-4 text-center text-[11px] text-slate-600">
          By continuing, you agree to our{" "}
          <a href="#" className="underline underline-offset-2 hover:text-slate-400">Terms</a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2 hover:text-slate-400">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
