"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ShieldAlert,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ParsedTrade, DailyFrequencyBucket, HoldingTimeStats } from "@/lib/types";
import {
  generateDailyFrequencyAnalysis,
  calculateHoldingTimeStats,
} from "@/lib/core-logic";

interface OvertradingAnalysisProps {
  trades: ParsedTrade[];
}

export function OvertradingAnalysis({ trades }: OvertradingAnalysisProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const frequencyData = React.useMemo(() => {
    return generateDailyFrequencyAnalysis(trades);
  }, [trades]);

  const holdingStats = React.useMemo(() => {
    return calculateHoldingTimeStats(trades);
  }, [trades]);

  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";

  if (!mounted) {
    return (
      <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
    );
  }

  // Buscar tramos específico para generar diagnósticos
  const selectiveBucket = frequencyData.find((b) => b.bucketLabel.includes("1-2"));
  const overtradingBucket = frequencyData.find((b) => b.bucketLabel.includes("6+"));

  const hasOvertradingRisk =
    overtradingBucket &&
    overtradingBucket.daysCount > 0 &&
    (overtradingBucket.averageDailyPnl < 0 ||
      (selectiveBucket && overtradingBucket.winRate < selectiveBucket.winRate));

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m > 0 ? `${m}m` : ""}`;
  };

  return (
    <div className="space-y-4">
      {/* Alerta inteligente de diagnóstico */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3.5 transition-all ${
          hasOvertradingRisk
            ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"
            : "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
        }`}
      >
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            hasOvertradingRisk
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {hasOvertradingRisk ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>
        <div className="text-xs leading-relaxed">
          <div className="font-semibold text-sm mb-0.5 flex items-center gap-2">
            <span>
              {hasOvertradingRisk
                ? "Detección de Sobreoperativa (Overtrading Alert)"
                : "Excelente Disciplina de Ejecución"}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            {hasOvertradingRisk ? (
              <>
                Los días con <strong>6 o más operaciones</strong> muestran un deterioro en tu rentabilidad (
                <span className="text-rose-500 font-semibold">
                  ${overtradingBucket?.averageDailyPnl.toFixed(2)}/día
                </span>{" "}
                y Win Rate del <strong>{overtradingBucket?.winRate}%</strong>), frente a los días selectivos de 1 a 2
                operaciones (
                <span className="text-emerald-500 font-semibold">
                  +${selectiveBucket?.averageDailyPnl.toFixed(2)}/día
                </span>
                ). Reducir la frecuencia operativa protegerá tu cuenta.
              </>
            ) : (
              <>
                Tu operativa mantiene un equilibrio saludable entre selectividad y frecuencia. No se detecta sesgo
                de sobreoperativa o revancha en los días con mayor número de transacciones.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Grid de KPIs de Frecuencia y Holding Time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. PnL en Días Selectivos (1-2 trades) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              1-2 Trades/Día (Selectivo)
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl font-bold font-mono tracking-tight ${
                (selectiveBucket?.averageDailyPnl || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {(selectiveBucket?.averageDailyPnl || 0) >= 0 ? "+" : ""}
              ${(selectiveBucket?.averageDailyPnl || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <span className="text-xs font-normal text-slate-400 ml-1">/ día</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{selectiveBucket?.daysCount || 0} días evaluados</span>
              <span className="font-semibold text-emerald-500">
                WR {selectiveBucket?.winRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. PnL en Días de Sobreoperativa (6+ trades) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              6+ Trades/Día (Sobreoperativa)
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-xl font-bold font-mono tracking-tight ${
                (overtradingBucket?.averageDailyPnl || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {(overtradingBucket?.averageDailyPnl || 0) >= 0 ? "+" : ""}
              ${(overtradingBucket?.averageDailyPnl || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <span className="text-xs font-normal text-slate-400 ml-1">/ día</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
              <span>{overtradingBucket?.daysCount || 0} días evaluados</span>
              <span
                className={`font-semibold ${
                  (overtradingBucket?.winRate || 0) >= 50 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                WR {overtradingBucket?.winRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* 3. Duración Media en Mercado (Holding Time) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tiempo en Mercado (Holding Time)
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            {holdingStats.hasTimeData ? (
              <>
                <div className="flex items-center justify-between font-mono text-sm font-bold">
                  <span className="text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Win: {formatMinutes(holdingStats.avgWinnerMinutes)}
                  </span>
                  <span className="text-rose-500 flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Loss: {formatMinutes(holdingStats.avgLoserMinutes)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
                  <span>Tiempo medio total</span>
                  <span className="font-mono font-medium">
                    {formatMinutes(holdingStats.avgTotalMinutes)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 font-mono">
                  Sin datos de duración
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Incluye columna &quot;Duración&quot; en tu CSV
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos de Frecuencia Operativa */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span>PnL Medio Diario según Frecuencia de Operaciones</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparativa del rendimiento en días de baja vs alta actividad (Overtrading Analysis)
            </p>
          </div>
        </div>

        <div className="h-[250px] w-full">
          {frequencyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              Sin datos suficientes para analizar sobreoperativa
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={frequencyData}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="bucketLabel"
                  tick={{ fill: textColor, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  tick={{ fill: textColor, fontSize: 11, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <ReferenceLine y={0} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, name, props) => {
                    const item = props.payload as DailyFrequencyBucket;
                    return [
                      `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })} / día (${item.daysCount} días | WR ${item.winRate}%)`,
                      "PnL Medio por Día",
                    ];
                  }}
                />
                <Bar dataKey="averageDailyPnl" radius={[6, 6, 0, 0]}>
                  {frequencyData.map((entry, index) => (
                    <Cell
                      key={`freq-${index}`}
                      fill={entry.averageDailyPnl >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
