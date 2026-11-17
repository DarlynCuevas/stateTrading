export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";

export interface ImpactedAsset {
  symbol: string; // "NQ", "MGC", "MES", "NVDA", "CL", "BTC", etc.
  name?: string; // "Nasdaq 100", "Micro Oro", "Micro S&P 500", etc.
  direction: "up" | "down" | "neutral";
  changePct: number; // e.g. 0.35 para +0.35% o -0.42 para -0.42%
  sentiment?: "bullish" | "bearish" | "neutral";
}

export interface EconomicCalendarItem {
  id: string;
  title: string;
  country: string; // "USD", "EUR", "GBP", etc.
  date: string; // ISO string o "2026-11-17"
  time: string; // "14:30"
  impact: ImpactLevel;
  forecast?: string;
  previous?: string;
  actual?: string;
  description?: string;
  isPast?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  timeAgo: string;
  category: "Wall Street" | "Empresas & Tech" | "Macroeconomía" | "Cripto" | "General";
  tickers?: string[];
  impact?: "ALTO" | "MEDIO" | "INFO";
  impactedAssets?: ImpactedAsset[];
}

export interface NewsApiResponse {
  calendar: EconomicCalendarItem[];
  news: NewsArticle[];
  lastUpdated: string;
  status: "live" | "fallback" | "cached";
}
