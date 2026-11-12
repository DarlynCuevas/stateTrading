"use client";

import * as React from "react";
import { AccountStats } from "@/lib/types";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Scale,
  Flame,
  Zap,
  Activity,
} from "lucide-react";

interface KpiCardsProps {
  stats: AccountStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const isPnlPositive = stats.totalNetPnl >= 0;
  const isAvgPositive = stats.averageTrade >= 0;

  return (
    <div className="space-y-4">
      {/* Fila 1: KPIs Principales de Cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Balance Actual */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Balance Actual
            </span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              ${stats.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Inicial: ${stats.initialBalance.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* 2. PnL Neto Total */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform ${isPnlPositive ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-rose-500/5 dark:bg-rose-500/10"}`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              PnL Neto Total
            </span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isPnlPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {isPnlPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight flex items-center gap-1 ${isPnlPositive ? "text-emerald-500" : "text-rose-500"}`}>
              {isPnlPositive ? "+$" : "-$"}{Math.abs(stats.totalNetPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {isPnlPositive ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
              <span>{stats.totalTrades} operaciones aud.</span>
            </div>
          </div>
        </div>

        {/* 3. Win Rate */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Win Rate (% Acierto)
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${stats.winRate >= 50 ? "text-emerald-500" : stats.winRate >= 35 ? "text-amber-500" : "text-rose-500"}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="text-emerald-500 font-semibold">{stats.winningTrades} W</span>
              <span>&bull;</span>
              <span className="text-rose-500 font-semibold">{stats.losingTrades} L</span>
            </div>
          </div>
        </div>

        {/* 4. Profit Factor */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Profit Factor
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${stats.profitFactor >= 1.5 ? "text-emerald-500" : stats.profitFactor >= 1.0 ? "text-blue-500" : "text-rose-500"}`}>
              {stats.profitFactor >= 99.99 ? "∞" : stats.profitFactor.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Objetivo Edgewonk: &gt; 1.50</span>
            </div>
          </div>
        </div>

        {/* 5. Operación Media */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Operación Media
            </span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isAvgPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${isAvgPositive ? "text-emerald-500" : "text-rose-500"}`}>
              {isAvgPositive ? "+$" : "-$"}{Math.abs(stats.averageTrade).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Esperanza matemática por trade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: Métricas Avanzadas de Riesgo y Rendimiento (Estilo FX Replay) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Max Drawdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Max Drawdown
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-rose-500">
              -${(stats.maxDrawdown || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Caída máxima: <span className="font-semibold text-rose-500">{(stats.maxDrawdownPercent || 0).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* 2. Ratio Riesgo/Recompensa (R:R) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ratio R:R Medio
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Scale className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              1 : {(stats.riskRewardRatio || 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <span>W: +${(stats.averageWinner || 0).toFixed(0)}</span>
              <span>&bull;</span>
              <span>L: -${(stats.averageLoser || 0).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* 3. Mejor vs Peor Trade */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Extremos (Best / Worst)
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-sm font-bold">
              <span className="text-emerald-500">+${(stats.largestWin || 0).toFixed(2)}</span>
              <span className="text-rose-500">-${Math.abs(stats.largestLoss || 0).toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>Mejor Trade</span>
              <span>Peor Trade</span>
            </div>
          </div>
        </div>

        {/* 4. Expectancy ($) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Expectancy (Esperanza)
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className={`text-xl font-bold font-mono tracking-tight ${(stats.expectancy || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {(stats.expectancy || 0) >= 0 ? "+$" : "-$"}{Math.abs(stats.expectancy || 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Beneficio esperado por trade
            </div>
          </div>
        </div>

        {/* 5. Rachas Máximas */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Rachas Máximas
            </span>
            <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-sm font-bold">
              <span className="text-emerald-500">{stats.maxConsecutiveWins || 0} Wins</span>
              <span className="text-rose-500">{stats.maxConsecutiveLosses || 0} Losses</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>Racha Ganadora</span>
              <span>Racha Perdedora</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
