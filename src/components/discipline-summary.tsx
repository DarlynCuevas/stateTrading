"use client";

import * as React from "react";
import { ParsedTrade } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Percent,
} from "lucide-react";

interface DisciplineSummaryProps {
  trades: ParsedTrade[];
}

export function DisciplineSummary({ trades }: DisciplineSummaryProps) {
  const stats = React.useMemo(() => {
    let auditedCount = 0;
    let cleanTradesCount = 0;
    let errorTradesCount = 0;
    let cleanWins = 0;
    let errorWins = 0;

    let cleanPnl = 0;
    let errorCost = 0; // Total perdido en trades con errores
    let totalErrorPnl = 0; // PnL neto de todos los trades con errores

    const errorCounts: Record<string, { count: number; loss: number }> = {};

    trades.forEach((t) => {
      const hasErrors = t.errores && t.errores.length > 0;
      const hasWins = t.aciertos && t.aciertos.length > 0;
      const isAudited = hasErrors || hasWins || !!t.setup || !!t.leccion || !!t.captura;

      if (isAudited) auditedCount++;

      if (hasErrors) {
        errorTradesCount++;
        totalErrorPnl += t.netPnl;
        if (t.netPnl < 0) {
          errorCost += Math.abs(t.netPnl);
        }
        if (t.netPnl > 0) errorWins++;

        t.errores?.forEach((err) => {
          if (!errorCounts[err]) errorCounts[err] = { count: 0, loss: 0 };
          errorCounts[err].count++;
          if (t.netPnl < 0) {
            errorCounts[err].loss += Math.abs(t.netPnl);
          }
        });
      } else if (isAudited) {
        cleanTradesCount++;
        cleanPnl += t.netPnl;
        if (t.netPnl > 0) cleanWins++;
      }
    });

    const cleanWinRate =
      cleanTradesCount > 0 ? (cleanWins / cleanTradesCount) * 100 : 0;
    const errorWinRate =
      errorTradesCount > 0 ? (errorWins / errorTradesCount) * 100 : 0;

    const topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1].loss - a[1].loss)
      .slice(0, 3);

    return {
      total: trades.length,
      auditedCount,
      cleanTradesCount,
      errorTradesCount,
      cleanWinRate,
      errorWinRate,
      cleanPnl,
      errorCost,
      totalErrorPnl,
      topErrors,
    };
  }, [trades]);

  // Si no hay operaciones, no mostrar nada
  if (trades.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Coste Total de Indisciplina */}
      <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Coste de Errores
          </span>
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            -${stats.errorCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Pérdidas acumuladas en {stats.errorTradesCount} trades con fallos de ejecución
          </div>
        </div>
      </div>

      {/* 2. Win Rate Limpio vs Con Errores */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Efecto Disciplina
          </span>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-500">
              {stats.cleanTradesCount > 0 ? `${stats.cleanWinRate.toFixed(1)}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">vs</span>
            <span className="text-sm font-bold font-mono text-rose-500">
              {stats.errorTradesCount > 0 ? `${stats.errorWinRate.toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Win Rate: trades limpios vs trades con fallos
          </div>
        </div>
      </div>

      {/* 3. Progreso de Auditoría */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Trades Auditados
          </span>
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {stats.auditedCount}
            </span>
            <span className="text-xs text-slate-400">/ {stats.total}</span>
            <span className="text-xs font-mono font-semibold text-blue-500 ml-auto">
              {stats.total > 0 ? Math.round((stats.auditedCount / stats.total) * 100) : 0}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? (stats.auditedCount / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Error Más Costoso */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Fallo Más Costoso
          </span>
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div>
          {stats.topErrors.length > 0 ? (
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {stats.topErrors[0][0]}
              </div>
              <div className="text-[11px] font-mono text-rose-500 font-semibold mt-0.5">
                -${stats.topErrors[0][1].loss.toLocaleString("en-US", { minimumFractionDigits: 0 })} perdidos ({stats.topErrors[0][1].count}x)
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-1">
              {stats.auditedCount > 0 ? "¡Excelente! Sin errores registrados" : "Audita tus trades haciendo clic en la tabla"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
