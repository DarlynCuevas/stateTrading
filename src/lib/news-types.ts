export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";

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
}

export interface NewsApiResponse {
  calendar: EconomicCalendarItem[];
  news: NewsArticle[];
  lastUpdated: string;
  status: "live" | "fallback" | "cached";
}
