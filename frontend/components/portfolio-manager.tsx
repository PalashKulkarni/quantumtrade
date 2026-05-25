"use client";

import { X, Plus, Trash2, PieChart, UploadCloud, FileText } from "lucide-react";
import { useState, FormEvent, useRef } from "react";
import { useDashboardStore, HoldingDTO } from "@/store/use-dashboard-store";
import { API_BASE } from "@/lib/config";
import { Button } from "./ui/button";

export function PortfolioManager({ onClose }: { onClose: () => void }) {
  const store = useDashboardStore();
  const { holdings, setHoldings, setPortfolioAnalytics } = store;

  const [localHoldings, setLocalHoldings] = useState<HoldingDTO[]>(holdings);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [sector, setSector] = useState("Technology");
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addHolding(e: FormEvent) {
    e.preventDefault();
    if (!ticker || !quantity || !price) return;
    setLocalHoldings([...localHoldings, {
      ticker: ticker.toUpperCase(),
      quantity: parseFloat(quantity),
      average_price: parseFloat(price),
      sector,
      asset_class: "Equity",
    }]);
    setTicker(""); setQuantity(""); setPrice("");
  }

  function removeHolding(index: number) {
    const next = [...localHoldings];
    next.splice(index, 1);
    setLocalHoldings(next);
  }

  function parseCSV(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { alert("CSV seems empty or invalid."); return; }
      const headers = lines[0].toLowerCase().split(",");
      const tickerIdx = headers.findIndex(h => h.includes("ticker") || h.includes("symbol"));
      const qtyIdx    = headers.findIndex(h => h.includes("quantity") || h.includes("qty"));
      const priceIdx  = headers.findIndex(h => h.includes("price") || h.includes("avg"));
      const sectorIdx = headers.findIndex(h => h.includes("sector"));
      if (tickerIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
        alert("CSV must contain columns: ticker, quantity, price"); return;
      }
      const parsed: HoldingDTO[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",");
        const t = row[tickerIdx]?.trim().toUpperCase();
        const q = parseFloat(row[qtyIdx]);
        const p = parseFloat(row[priceIdx]);
        const s = sectorIdx !== -1 ? (row[sectorIdx]?.trim() || "Technology") : "Technology";
        if (t && !isNaN(q) && !isNaN(p)) parsed.push({ ticker: t, quantity: q, average_price: p, sector: s, asset_class: "Equity" });
      }
      setLocalHoldings(prev => [...prev, ...parsed]);
    };
    reader.readAsText(file);
  }

  async function save() {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/portfolio/holdings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localHoldings),
      });
      if (res.ok) {
        setHoldings(localHoldings);
        const aRes = await fetch(`${API_BASE}/api/portfolio/analytics`, {});
        if (aRes.ok) setPortfolioAnalytics(await aRes.json());
        onClose();
      } else {
        alert("Failed to save portfolio. Are you logged in?");
      }
    } catch {
      alert("Network error: Could not reach backend.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-line bg-slate-900 shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <PieChart className="text-cyan" size={20} />
            Manage Portfolio Holdings
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* CSV Drop Zone */}
          <div
            className={`mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${isDragging ? "border-cyan bg-cyan/5" : "border-line bg-black/20 hover:border-slate-500"}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f?.name.endsWith(".csv")) parseCSV(f); else alert("Please upload a .csv file."); }}
          >
            <UploadCloud size={32} className="mb-2 text-slate-400" />
            <p className="text-sm text-slate-300">Drag & drop a CSV portfolio export here</p>
            <p className="mt-1 text-xs text-slate-500">Required columns: ticker, quantity, price</p>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) parseCSV(f); }} />
            <Button className="mt-4 border-slate-600 bg-transparent hover:bg-slate-800" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
          </div>

          {/* Manual Entry */}
          <div className="mb-4 text-sm font-semibold text-slate-300">Manual Entry</div>
          <form onSubmit={addHolding} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker (e.g. TCS.NS)" className="rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan/50" />
            <input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Qty" type="number" step="any" className="rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan/50" />
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Avg Price" type="number" step="any" className="rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan/50" />
            <select value={sector} onChange={e => setSector(e.target.value)} className="rounded-md border border-line bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan/50">
              {["Technology","Financials","Healthcare","Consumer","Energy","Industrials","Crypto"].map(s => <option key={s}>{s}</option>)}
            </select>
            <Button type="submit" className="bg-slate-800"><Plus size={16} /></Button>
          </form>

          {/* Holdings Table */}
          <div className="overflow-x-auto rounded-lg border border-line bg-black/20">
            <table className="w-full min-w-[500px] text-left text-sm text-slate-300">
              <thead className="bg-white/5 text-xs text-slate-400">
                <tr>
                  {["Ticker","Sector","Quantity","Avg Price","Value",""].map(h => (
                    <th key={h} className={`px-4 py-3 font-medium ${h === "Quantity" || h === "Avg Price" || h === "Value" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {localHoldings.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500">No holdings yet — add one above or upload a CSV.</td></tr>
                ) : localHoldings.map((h, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      <div className="flex items-center gap-2"><FileText size={14} className="text-cyan/60" />{h.ticker}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{h.sector}</td>
                    <td className="px-4 py-3 text-right">{h.quantity}</td>
                    <td className="px-4 py-3 text-right">${h.average_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">${(h.quantity * h.average_price).toLocaleString("en", { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeHolding(i)} className="rounded p-1 text-slate-500 transition hover:text-red-400"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-line bg-black/10 p-4">
          <p className="text-xs text-slate-600">{localHoldings.length} holding{localHoldings.length !== 1 ? "s" : ""} · ${localHoldings.reduce((s, h) => s + h.quantity * h.average_price, 0).toLocaleString("en", { maximumFractionDigits: 0 })} total cost</p>
          <div className="flex gap-3">
            <Button className="border-transparent bg-transparent hover:bg-white/10" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={isSaving}>{isSaving ? "Saving…" : "Save & Analyze"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
