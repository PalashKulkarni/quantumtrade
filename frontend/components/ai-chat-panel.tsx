"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Mic, Send, Sparkles, Trash2, Wrench, Zap } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE } from "@/lib/config";
import { useDashboardStore } from "@/store/use-dashboard-store";
import type { ChatMessage } from "@/lib/types";

const quickPrompts = [
  "Why did my portfolio drop?",
  "What sectors am I overexposed to?",
  "What if the market drops 20%?",
  "How can I improve my Sharpe ratio?",
  "Analyse my portfolio risk",
];

function ToolCallBadge({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] text-amber-400"
    >
      <Wrench size={10} />
      {name.replace(/_/g, " ")}()
    </motion.div>
  );
}

function AssistantMessage({ content, toolCalls }: { content: string; toolCalls: string[] }) {
  return (
    <div className="rounded-lg border border-cyan/10 bg-cyan/5 p-3">
      {toolCalls.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {toolCalls.map((t, i) => <ToolCallBadge key={i} name={t} />)}
        </div>
      )}
      <div className="prose prose-invert prose-sm max-w-none text-slate-300
        [&_strong]:text-slate-100
        [&_code]:rounded [&_code]:bg-cyan/10 [&_code]:px-1 [&_code]:text-cyan
        [&_blockquote]:rounded [&_blockquote]:border-amber-500 [&_blockquote]:bg-amber-500/5 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:text-amber-400
        [&_li]:text-slate-300 [&_table]:text-xs [&_th]:text-slate-300 [&_td]:text-slate-400">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-cyan"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  );
}

export function AiChatPanel() {
  const { symbol, decision, portfolioAnalytics, chatMessages, setChatMessages, addChatMessage, clearChat } = useDashboardStore();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, streamingText, streaming]);

  // Load history on mount
  useEffect(() => {
    setLoadingHistory(true);
    fetch(`${API_BASE}/api/chat/history`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; role: string; content: string; tool_calls: string[] }>) => {
        if (Array.isArray(data) && data.length > 0) {
          setChatMessages(data.map((m) => ({
            id: m.id,
            role: m.role as ChatMessage["role"],
            content: m.content,
            toolCalls: m.tool_calls,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return;

    addChatMessage({ id: `u-${Date.now()}`, role: "user", content: question });
    setInput("");
    setStreaming(true);
    setStreamingText("");
    setActiveTools([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          context: { symbol, decision, portfolio_analytics: portfolioAnalytics },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const toolsSeen: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const chunk = JSON.parse(raw) as { type: string; text?: string; name?: string };
            if (chunk.type === "delta" && chunk.text) {
              accumulated += chunk.text;
              setStreamingText(accumulated);
            } else if (chunk.type === "tool_call" && chunk.name) {
              toolsSeen.push(chunk.name);
              setActiveTools([...toolsSeen]);
            } else if (chunk.type === "done") {
              addChatMessage({ id: `a-${Date.now()}`, role: "assistant", content: accumulated, toolCalls: toolsSeen });
              setStreamingText("");
              setActiveTools([]);
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addChatMessage({ id: `e-${Date.now()}`, role: "assistant", content: "⚠️ Could not reach the AI Copilot. Make sure the backend is running on port 8000." });
      }
    } finally {
      setStreaming(false);
      setStreamingText("");
      setActiveTools([]);
      inputRef.current?.focus();
    }
  }, [streaming, symbol, decision, portfolioAnalytics, addChatMessage]);

  async function handleClearHistory() {
    await fetch(`${API_BASE}/api/chat/history`, { method: "DELETE" });
    clearChat();
  }

  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); ask(input); }

  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-black/25">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Bot size={17} className="text-cyan" />
          AI Copilot
          <span className="rounded-full border border-cyan/20 bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan">
            QUANTUM ENGINE
          </span>
        </div>
        <div className="flex items-center gap-1">
          {chatMessages.length > 0 && (
            <button onClick={handleClearHistory} className="rounded-md border border-line p-1.5 text-slate-500 transition hover:border-red-500/30 hover:text-red-400" title="Clear history">
              <Trash2 size={13} />
            </button>
          )}
          <button className="rounded-md border border-line p-1.5 text-slate-400 transition hover:border-cyan/60 hover:text-cyan">
            <Mic size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {loadingHistory && (
          <div className="flex justify-center py-4">
            <Sparkles size={16} className="animate-pulse text-cyan/40" />
          </div>
        )}

        {chatMessages.length === 0 && !streaming && !loadingHistory && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/5">
              <Zap size={22} className="text-cyan/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">AI Copilot ready</p>
              <p className="mt-1 text-xs text-slate-500">Institutional-grade analysis · Ask anything about your portfolio</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {msg.role === "user"
                ? <div className="ml-6 rounded-lg border border-line bg-white/[0.04] p-3 text-sm text-slate-200">{msg.content}</div>
                : <AssistantMessage content={msg.content} toolCalls={(msg as ChatMessage & { toolCalls?: string[] }).toolCalls ?? []} />
              }
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activeTools.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {activeTools.map((t, i) => <ToolCallBadge key={i} name={t} />)}
              </div>
            )}
            <div className="rounded-lg border border-cyan/10 bg-cyan/5 p-3">
              {streamingText
                ? <div className="prose prose-invert prose-sm max-w-none text-slate-300 [&_strong]:text-slate-100 [&_code]:text-cyan"><ReactMarkdown>{streamingText}</ReactMarkdown></div>
                : <StreamingDots />
              }
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((p) => (
            <button key={p} onClick={() => ask(p)} disabled={streaming}
              className="rounded-full border border-line px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-cyan/50 hover:text-cyan disabled:opacity-40">
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={streaming ? "AI thinking…" : "Ask AI Copilot…"} disabled={streaming}
            className="h-10 min-w-0 flex-1 rounded-md border border-line bg-black/35 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan/40 focus:ring-1 focus:ring-cyan/20 disabled:opacity-50" />
          <button type="submit" disabled={streaming || !input.trim()}
            className="grid h-10 w-10 place-items-center rounded-md border border-cyan/40 bg-cyan/10 text-cyan transition hover:bg-cyan/20 disabled:opacity-40">
            {streaming ? <Sparkles size={15} className="animate-pulse" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
