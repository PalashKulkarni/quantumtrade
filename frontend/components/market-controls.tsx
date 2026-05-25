"use client";

import { Search } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useState } from "react";
import { currencies, CurrencyCode, findInstrument, stockUniverse } from "@/lib/markets";

type MarketControlsProps = {
  symbol: string;
  currency: CurrencyCode;
  onSymbolChange: (symbol: string) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
};

export function MarketControls({ symbol, currency, onSymbolChange, onCurrencyChange }: MarketControlsProps) {
  const [customSymbol, setCustomSymbol] = useState(symbol);
  const instrument = findInstrument(symbol);

  function selectSymbol(event: ChangeEvent<HTMLSelectElement>) {
    const nextSymbol = event.target.value;
    setCustomSymbol(nextSymbol);
    onSymbolChange(nextSymbol);
  }

  function submitCustomSymbol() {
    const nextSymbol = customSymbol.trim().toUpperCase();
    if (nextSymbol) onSymbolChange(nextSymbol);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") submitCustomSymbol();
  }

  return (
    <div className="flex flex-col gap-2 md:min-w-[560px]">
      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
        <select
          value={stockUniverse.some((item) => item.symbol === symbol) ? symbol : ""}
          onChange={selectSymbol}
          className="h-9 rounded-md border border-line bg-black/30 px-3 text-sm text-slate-100 outline-none transition hover:border-cyan/60"
          aria-label="Select market instrument"
        >
          <option value="" disabled>
            Select from India, US, Europe, Japan, crypto
          </option>
          {stockUniverse.map((item) => (
            <option key={item.symbol} value={item.symbol}>
              {item.symbol} - {item.name} ({item.exchange})
            </option>
          ))}
        </select>

        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
          className="h-9 rounded-md border border-line bg-black/30 px-3 text-sm text-slate-100 outline-none transition hover:border-cyan/60"
          aria-label="Select display currency"
        >
          {currencies.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-black/30 px-3">
          <Search size={15} className="text-slate-500" />
          <input
            value={customSymbol}
            onChange={(event) => setCustomSymbol(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder="Enter any Yahoo symbol: RELIANCE.NS, TCS.NS, AAPL, BTC-USD"
            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            aria-label="Enter custom market symbol"
          />
        </div>
        <button
          type="button"
          onClick={submitCustomSymbol}
          className="h-9 rounded-md border border-line bg-white/5 px-3 text-sm font-medium text-slate-100 transition hover:border-cyan/60 hover:bg-cyan/10"
        >
          Load
        </button>
      </div>

      <div className="text-xs text-slate-500">
        {instrument.name} · {instrument.exchange} · {instrument.region} · Native quote {instrument.quoteCurrency}
      </div>
    </div>
  );
}

