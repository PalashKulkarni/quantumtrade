"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BarChart3, Flame, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { currencies, CurrencyCode, findInstrument, Instrument, stockUniverse } from "@/lib/markets";
import { cn } from "@/lib/utils";

type Props = {
  symbol: string;
  currency: CurrencyCode;
  onSymbolChange: (symbol: string) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
};

export function MarketCommandPalette({ symbol, currency, onSymbolChange, onCurrencyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customSymbol, setCustomSymbol] = useState("");
  const selected = findInstrument(symbol);
  const favorites = useMemo(() => stockUniverse.filter((item) => item.favorite), []);
  const trending = useMemo(() => stockUniverse.filter((item) => item.trending), []);

  function choose(instrument: Instrument) {
    onSymbolChange(instrument.symbol);
    setOpen(false);
  }

  function chooseCustom(value: string) {
    const custom = value.trim().toUpperCase();
    if (custom) {
      onSymbolChange(custom);
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 md:min-w-[620px]">
      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button className="group flex h-11 items-center gap-3 rounded-lg border border-line bg-black/35 px-3 text-left transition hover:border-cyan/60 hover:bg-cyan/10 focus:outline-none focus:ring-2 focus:ring-cyan/40">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-cyan/10 text-sm font-semibold text-cyan shadow-glow">
                {selected.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-50">{selected.symbol}</span>
                  <span className="rounded border border-line px-1.5 py-0.5 text-[10px] uppercase text-slate-400">{selected.exchange}</span>
                  {selected.trending ? <Flame size={13} className="text-amber" /> : null}
                </div>
                <div className="truncate text-xs text-slate-500">{selected.name} / {selected.sector}</div>
              </div>
              <Search size={16} className="text-slate-500 transition group-hover:text-cyan" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[min(760px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-xl border border-cyan/20 bg-[#08131a]/95 shadow-2xl shadow-cyan/10">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <Dialog.Title className="text-sm font-semibold text-slate-100">Global Market Command</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Search and select live market symbols across Indian, US, international, ETF, and crypto markets.
                </Dialog.Description>
                <Dialog.Close className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-100">
                  <X size={16} />
                </Dialog.Close>
              </div>
              <Command
                className="[&_[cmdk-input]]:h-12 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:border-0 [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:font-mono [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-slate-100 [&_[cmdk-input]]:outline-none [&_[cmdk-input]]:placeholder:text-slate-600"
                filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
              >
                <div className="flex items-center border-b border-line">
                  <Search size={17} className="ml-4 text-slate-500" />
                  <Command.Input placeholder="Search NSE, NASDAQ, NYSE, crypto, or type any Yahoo Finance symbol..." />
                </div>
                <Command.List className="max-h-[480px] overflow-y-auto p-2">
                  <Command.Empty className="px-3 py-8 text-center text-sm text-slate-500">
                    Press Enter after typing a custom ticker such as ADANIENT.NS, META, or SOL-USD.
                  </Command.Empty>
                  <Command.Group heading="Favorites" className="command-group">
                    {favorites.map((item) => <MarketCommandItem key={item.symbol} instrument={item} onSelect={choose} />)}
                  </Command.Group>
                  <Command.Group heading="Trending Now" className="command-group">
                    {trending.map((item) => <MarketCommandItem key={item.symbol} instrument={item} onSelect={choose} />)}
                  </Command.Group>
                  <Command.Group heading="Global Universe" className="command-group">
                    {stockUniverse.map((item) => <MarketCommandItem key={item.symbol} instrument={item} onSelect={choose} />)}
                  </Command.Group>
                </Command.List>
              </Command>
              <div className="border-t border-line p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={customSymbol}
                    onChange={(event) => setCustomSymbol(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") chooseCustom(customSymbol);
                    }}
                    placeholder="Custom symbol: ADANIENT.NS, META, VOD.L, SOL-USD"
                    className="h-10 rounded-md border border-line bg-black/30 px-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan/40"
                  />
                  <button
                    type="button"
                    onClick={() => chooseCustom(customSymbol)}
                    className="h-10 rounded-md border border-cyan/40 bg-cyan/10 px-4 text-sm font-medium text-cyan transition hover:bg-cyan/20"
                  >
                    Load Custom
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <select
          value={currency}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
          className="h-11 rounded-lg border border-line bg-black/35 px-3 font-mono text-sm text-slate-100 outline-none transition hover:border-cyan/60 focus:ring-2 focus:ring-cyan/40"
          aria-label="Select display currency"
        >
          {currencies.map((item) => (
            <option key={item.code} value={item.code}>{item.code}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded border border-line px-2 py-1">{selected.region}</span>
        <span className="rounded border border-line px-2 py-1">{selected.assetClass}</span>
        <span className="rounded border border-line px-2 py-1">Native {selected.quoteCurrency}</span>
      </div>
    </div>
  );
}

function MarketCommandItem({ instrument, onSelect }: { instrument: Instrument; onSelect: (instrument: Instrument) => void }) {
  return (
    <Command.Item
      value={`${instrument.symbol} ${instrument.name} ${instrument.exchange} ${instrument.sector}`}
      onSelect={() => onSelect(instrument)}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition",
        "aria-selected:bg-cyan/10 aria-selected:text-cyan hover:bg-cyan/10"
      )}
    >
      <div className="grid h-9 w-9 place-items-center rounded-md border border-cyan/20 bg-cyan/10 font-mono text-xs font-semibold text-cyan">
        {instrument.logo}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold text-slate-100">{instrument.symbol}</span>
          <span className="truncate text-slate-400">{instrument.name}</span>
          {instrument.favorite ? <Star size={12} className="fill-amber text-amber" /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded border border-line px-1.5">{instrument.exchange}</span>
          <span>{instrument.sector}</span>
          <span>{instrument.region}</span>
        </div>
      </div>
      <BarChart3 size={15} className="text-slate-600 transition group-aria-selected:text-cyan" />
    </Command.Item>
  );
}
