export interface RawTradingViewRow {
  [key: string]: string | number | undefined;
}

export interface ParsedTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'COMPRA' | 'VENTA' | string;
  openTime: string;
  closeTime?: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  commission?: number;
  netPnl: number;
  quantity?: number;
  holdingTimeMinutes?: number;
  raw?: RawTradingViewRow;
}

export interface AccountStats {
  initialBalance: number;
  currentBalance: number;
  totalNetPnl: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  // ─── Métricas avanzadas (Estilo FX Replay) ───
  maxDrawdown: number;
  maxDrawdownPercent: number;
  riskRewardRatio: number;
  expectancy: number;
  averageWinner: number;
  averageLoser: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface SymbolPerformance {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
}

export interface PnlDistributionBucket {
  rangeLabel: string;
  count: number;
  pnlTotal: number;
}

export interface HourlyPerformance {
  hour: string; // Ejemplo: "09:00"
  netPnl: number;
  trades: number;
  wins: number;
  winRate: number;
}

export interface DailyFrequencyBucket {
  bucketLabel: string;
  daysCount: number;
  totalTrades: number;
  netPnl: number;
  averageDailyPnl: number;
  winRate: number;
  winDaysRate: number;
}

export interface HoldingTimeStats {
  avgWinnerMinutes: number;
  avgLoserMinutes: number;
  avgTotalMinutes: number;
  ratioWinnerLoserTime: number;
  hasTimeData: boolean;
}

export interface PeriodSummary {
  periodId: string; // ej: "2026-W27" o "2026-07"
  label: string; // ej: "Semana 27 (2026)" o "Julio 2026"
  periodType: "week" | "month";
  tradesCount: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  bestDayPnl: number;
  worstDayPnl: number;
  winDays: number;
  totalDays: number;
}

