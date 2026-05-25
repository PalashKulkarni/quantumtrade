export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "JPY" | "AED";

export type Instrument = {
  symbol: string;
  name: string;
  exchange: string;
  region: string;
  assetClass: "Equity" | "ETF" | "Crypto" | "Index";
  quoteCurrency: CurrencyCode;
  sector: string;
  logo: string;
  favorite?: boolean;
  trending?: boolean;
};

export const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" }
];

export const stockUniverse: Instrument[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Energy", logo: "RI", favorite: true, trending: true },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Technology", logo: "TC", favorite: true },
  { symbol: "INFY.NS", name: "Infosys", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Technology", logo: "IF", trending: true },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Financials", logo: "HD", favorite: true },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Financials", logo: "IC" },
  { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Financials", logo: "SB" },
  { symbol: "ITC.NS", name: "ITC", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Consumer", logo: "IT" },
  { symbol: "LT.NS", name: "Larsen & Toubro", exchange: "NSE", region: "India", assetClass: "Equity", quoteCurrency: "INR", sector: "Industrials", logo: "LT" },
  { symbol: "NIFTYBEES.NS", name: "Nippon India Nifty 50 Bees", exchange: "NSE", region: "India", assetClass: "ETF", quoteCurrency: "INR", sector: "Index ETF", logo: "NF" },
  { symbol: "AAPL", name: "Apple", exchange: "NASDAQ", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Technology", logo: "AP", favorite: true },
  { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Technology", logo: "MS" },
  { symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Semiconductors", logo: "NV", trending: true },
  { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Autos", logo: "TS", trending: true },
  { symbol: "AMZN", name: "Amazon", exchange: "NASDAQ", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Consumer Internet", logo: "AZ" },
  { symbol: "JPM", name: "JPMorgan Chase", exchange: "NYSE", region: "United States", assetClass: "Equity", quoteCurrency: "USD", sector: "Financials", logo: "JP" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE Arca", region: "United States", assetClass: "ETF", quoteCurrency: "USD", sector: "Index ETF", logo: "SP" },
  { symbol: "SHEL.L", name: "Shell", exchange: "LSE", region: "United Kingdom", assetClass: "Equity", quoteCurrency: "GBP", sector: "Energy", logo: "SH" },
  { symbol: "HSBA.L", name: "HSBC Holdings", exchange: "LSE", region: "United Kingdom", assetClass: "Equity", quoteCurrency: "GBP", sector: "Financials", logo: "HS" },
  { symbol: "7203.T", name: "Toyota Motor", exchange: "TSE", region: "Japan", assetClass: "Equity", quoteCurrency: "JPY", sector: "Autos", logo: "TY" },
  { symbol: "9984.T", name: "SoftBank Group", exchange: "TSE", region: "Japan", assetClass: "Equity", quoteCurrency: "JPY", sector: "Technology", logo: "SB" },
  { symbol: "ASML.AS", name: "ASML Holding", exchange: "Euronext", region: "Netherlands", assetClass: "Equity", quoteCurrency: "EUR", sector: "Semiconductors", logo: "AS" },
  { symbol: "BTC-USD", name: "Bitcoin", exchange: "Crypto", region: "Global", assetClass: "Crypto", quoteCurrency: "USD", sector: "Digital Assets", logo: "₿", trending: true },
  { symbol: "ETH-USD", name: "Ethereum", exchange: "Crypto", region: "Global", assetClass: "Crypto", quoteCurrency: "USD", sector: "Digital Assets", logo: "Ξ" }
];

const inrPerUnit: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.5,
  GBP: 106.0,
  JPY: 0.54,
  AED: 22.7
};

export function findInstrument(symbol: string): Instrument {
  const normalized = symbol.toUpperCase();
  return (
    stockUniverse.find((instrument) => instrument.symbol === normalized) ?? {
      symbol: normalized,
      name: normalized,
      exchange: "Yahoo Finance",
      region: "Global",
      assetClass: normalized.includes("-USD") ? "Crypto" : "Equity",
      quoteCurrency: normalized.endsWith(".NS") || normalized.endsWith(".BO") ? "INR" : "USD",
      sector: "Custom",
      logo: normalized.slice(0, 2)
    }
  );
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  return (amount * inrPerUnit[from]) / inrPerUnit[to];
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2
  }).format(amount);
}
