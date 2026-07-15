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
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Target,
  Percent,
  Layers,
  ChevronDown,
} from "lucide-react";
import { ParsedTrade, PeriodSummary } from "@/lib/types";
import { generatePeriodSummaries } from "@/lib/core-logic";

interface PeriodReviewProps {
  trades: ParsedTrade[];
}

export function PeriodReview({ trades }: PeriodReviewProps) {
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = React.useState<"week" | "month">("week");
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const periodList: PeriodSummary[] = React.useMemo(() => {
    return generatePeriodSummaries(trades, mode);
  }, [trades, mode]);

  // Al cambiar el listado, por defecto seleccionamos el periodo más reciente
  React.useEffect(() => {
    if (periodList.length > 0) {
      setSelectedIdx(periodList.length - 1);
    } else {
      setSelectedIdx(null);
    }
  }, [periodList]);

  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";

  if (!mounted) {
    return (
      <div className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
    );
  }

  if (periodList.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Sin operaciones para generar resumen periódico
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Sube tus archivos CSV de TradingView o carga los datos de prueba
        </p>
      </div>
    );
  }

  const idx = selectedIdx !== null && selectedIdx < periodList.length ? selectedIdx : periodList.length - 1;
  const current = periodList[idx];
  const previous = idx > 0 ? periodList[idx - 1] : null;

  // Diferencias periodo sobre periodo
  const diffPnl = previous ? current.netPnl - previous.netPnl : 0;
  const diffWinRate = previous ? current.winRate - previous.winRate : 0;
  const diffPf = previous ? current.profitFactor - previous.profitFactor : 0;
  const diffTrades = previous ? current.tradesCount - previous.tradesCount : 0;

  const modeLabel = mode === "week" ? "Semana" : "Mes";
  const prevModeLabel = mode === "week" ? "semana anterior" : "mes anterior";

  return (
    <div className="space-y-6">
      {/* Cabecera con Toggle Semanal/Mensual y Selector de Periodo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Auditoría Periódica y Comparativa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluación {mode === "week" ? "semana a semana" : "mes a mes"} estilo Edgewonk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector Semanal vs Mensual */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setMode("week")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                mode === "week"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                mode === "month"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Mensual
            </button>
          </div>

          {/* Selector de Periodo Específico */}
          <div className="relative">
            <select
              value={idx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-2 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {periodList.map((p, i) => (
                <option key={p.periodId} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Banner de Evolución y Diagnóstico Comparativo */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          current.netPnl >= 0
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
            : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold ${
              current.netPnl >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {current.netPnl >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <span>Resumen de {current.label}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/50 dark:bg-black/20 border border-current/20">
                {current.tradesCount} operaciones
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {previous ? (
                <>
                  Comparado con {previous.label}: PnL{" "}
                  <strong
                    className={
                      diffPnl >= 0 ? "text-emerald-500" : "text-rose-500"
                    }
                  >
                    {diffPnl >= 0 ? "+" : ""}
                    ${diffPnl.toFixed(2)}
                  </strong>{" "}
                  y Win Rate{" "}
                  <strong
                    className={
                      diffWinRate >= 0 ? "text-emerald-500" : "text-rose-500"
                    }
                  >
                    {diffWinRate >= 0 ? "+" : ""}
                    {diffWinRate.toFixed(1)}%
                  </strong>
                </>
              ) : (
                "Primer periodo registrado en el historial auditao."
              )}
            </p>
          </div>
        </div>

        {/* Badge destacado de evolución */}
        {previous && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border ${
              diffPnl >= 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            {diffPnl >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>
              {diffPnl >= 0 ? "Mejora de" : "Diferencia de"} ${Math.abs(diffPnl).toFixed(2)} vs {prevModeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Grid de 4 KPIs del Periodo con Comparativa vs Anterior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. PnL del Periodo */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              PnL Neto ({modeLabel})
            </span>
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                current.netPnl >= 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                current.netPnl >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {current.netPnl >= 0 ? "+" : ""}
              ${current.netPnl.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            {previous ? (
              <div
                className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
                  diffPnl >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {diffPnl >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>
                  {diffPnl >= 0 ? "+" : ""}
                  ${diffPnl.toFixed(2)} vs {prevModeLabel}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 mt-1">
                Periodo base inicial
              </div>
            )}
          </div>
        </div>

        {/* 2. Win Rate del Periodo */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Win Rate (% Acierto)
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                current.winRate >= 50
                  ? "text-emerald-500"
                  : current.winRate >= 35
                  ? "text-amber-500"
                  : "text-rose-500"
              }`}
            >
              {current.winRate}%
            </div>
            {previous ? (
              <div
                className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
                  diffWinRate >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {diffWinRate >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>
                  {diffWinRate >= 0 ? "+" : ""}
                  {diffWinRate.toFixed(1)}% vs {prevModeLabel} ({current.winTrades}W /{" "}
                  {current.lossTrades}L)
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 mt-1">
                {current.winTrades} ganadoras &bull; {current.lossTrades} perdedoras
              </div>
            )}
          </div>
        </div>

        {/* 3. Profit Factor del Periodo */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Profit Factor
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Target className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                current.profitFactor >= 1.5
                  ? "text-emerald-500"
                  : current.profitFactor >= 1.0
                  ? "text-blue-500"
                  : "text-rose-500"
              }`}
            >
              {current.profitFactor >= 99.99 ? "∞" : current.profitFactor}
            </div>
            {previous ? (
              <div
                className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
                  diffPf >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {diffPf >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>
                  {diffPf >= 0 ? "+" : ""}
                  {diffPf.toFixed(2)} vs {prevModeLabel}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 mt-1">
                Objetivo Edgewonk &gt; 1.50
              </div>
            )}
          </div>
        </div>

        {/* 4. Consistencia en Días Operados */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Días Ganadores
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {current.winDays} <span className="text-sm text-slate-400 font-normal">/ {current.totalDays} días</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between font-mono">
              <span className="text-emerald-500">Mejor: +${current.bestDayPnl.toFixed(0)}</span>
              <span className="text-rose-500">Peor: ${current.worstDayPnl.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico comparativo de todos los periodos auditaos */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Historial y Evolución de Todos los {mode === "week" ? "Semanas" : "Meses"}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haz clic en una columna para seleccionar y comparar ese periodo
            </p>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={periodList}
              margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
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
                  const item = props.payload as PeriodSummary;
                  return [
                    `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${item.tradesCount} trades | WR ${item.winRate}%)`,
                    "PnL Neto",
                  ];
                }}
              />
              <Bar
                dataKey="netPnl"
                radius={[6, 6, 0, 0]}
                onClick={(data, idx) => setSelectedIdx(idx)}
                cursor="pointer"
              >
                {periodList.map((entry, i) => (
                  <Cell
                    key={`period-${i}`}
                    fill={entry.netPnl >= 0 ? "#10b981" : "#f43f5e"}
                    opacity={i === idx ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
