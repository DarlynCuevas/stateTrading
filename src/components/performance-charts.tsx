"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { TrendingUp, BarChart2, PieChart, Clock, Layers } from "lucide-react";
import { SymbolPerformance, PnlDistributionBucket, HourlyPerformance } from "@/lib/types";

interface EquityDataPoint {
  tradeNumber: number;
  time: string;
  balance: number;
  pnl: number;
  symbol: string;
}

interface DailyDataPoint {
  day: string;
  pnl: number;
  tradesCount: number;
  wins?: number;
  losses?: number;
}

interface PerformanceChartsProps {
  equityData: EquityDataPoint[];
  dailyData: DailyDataPoint[];
  symbolData?: SymbolPerformance[];
  pnlDistribution?: PnlDistributionBucket[];
  hourlyData?: HourlyPerformance[];
}

export function PerformanceCharts({
  equityData,
  dailyData,
  symbolData = [],
  pnlDistribution = [],
  hourlyData = [],
}: PerformanceChartsProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  // Colores dinámicos para grid y textos
  const gridColor = isDark ? "#1e293b" : "#e2e8f0"; // slate-800 vs slate-200
  const textColor = isDark ? "#94a3b8" : "#64748b"; // slate-400 vs slate-500
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";

  // Determinar si el balance final está en verde o en rojo respecto a 50k
  const finalBalance = equityData.length > 0 ? equityData[equityData.length - 1].balance : 50000;
  const isEquityPositive = finalBalance >= 50000;
  const strokeColor = isEquityPositive ? "#10b981" : "#f43f5e"; // emerald-500 vs rose-500

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 h-80 rounded-xl bg-slate-100 dark:bg-slate-800/50" />
        <div className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fila superior: Equity Curve (2 col) + Distribución por Día (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Gráfico de Equity Curve */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Equity Curve (Evolución del Saldo)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Progresión trade a trade desde el capital inicial ($50,000)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
                Saldo Actual
              </span>
              <div className={`text-lg font-bold font-mono ${isEquityPositive ? "text-emerald-500" : "text-rose-500"}`}>
                ${finalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {equityData.length <= 1 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No hay suficientes operaciones procesadas para dibujar la curva.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.3 : 0.2} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="tradeNumber"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    tickFormatter={(val) => `T#${val}`}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: textColor, fontSize: 11, fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                  />
                  <ReferenceLine y={50000} stroke="#64748b" strokeDasharray="3 3" label={{ value: "$50k", fill: textColor, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Saldo"]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const item = payload[0].payload as EquityDataPoint;
                        return `Trade #${label} (${item.time}) - ${item.symbol}`;
                      }
                      return `Trade #${label}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#equityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Gráfico de Distribución Diaria */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              <span>Distribución por Día</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rendimiento neto acumulado por día de la semana
            </p>
          </div>

          <div className="h-[280px] w-full">
            {dailyData.every((d) => d.tradesCount === 0) ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                Sin datos diarios disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    tickFormatter={(val) => val.slice(0, 3)}
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
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: any, name, props) => {
                      const item = props.payload as DailyDataPoint;
                      return [
                        <span key="1" className={Number(value) >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                          {Number(value) >= 0 ? "+" : ""}${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          <span className="text-slate-400 text-[10px] font-normal ml-1">({item.tradesCount} trades)</span>
                        </span>,
                        "PnL Neto",
                      ];
                    }}
                    labelFormatter={(label) => `Día: ${label}`}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior: Gráficos de Símbolo, Histograma PnL y Rendimiento por Hora */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Rendimiento por Símbolo / Instrumento */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              <span>Rendimiento por Símbolo</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              PnL neto y operaciones por activo operado
            </p>
          </div>

          <div className="h-[240px] w-full">
            {symbolData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                Sin datos por símbolo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolData} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: textColor, fontSize: 11, fontFamily: "monospace" }} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <ReferenceLine x={0} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name, props) => {
                      const item = props.payload as SymbolPerformance;
                      return [
                        `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${item.trades} trades | WR ${item.winRate}%)`,
                        "PnL",
                      ];
                    }}
                  />
                  <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
                    {symbolData.map((entry, index) => (
                      <Cell key={`sym-${index}`} fill={entry.netPnl >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 4. Histograma de Distribución PnL */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-500" />
              <span>Distribución de Resultados</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Frecuencia de operaciones por rango de PnL
            </p>
          </div>

          <div className="h-[240px] w-full">
            {pnlDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                Sin datos de distribución
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="rangeLabel"
                    tick={{ fill: textColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name, props) => {
                      const item = props.payload as PnlDistributionBucket;
                      return [`${value} trades (Total: $${item.pnlTotal})`, "Frecuencia"];
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 5. Rendimiento por Hora del Día */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Rendimiento por Hora</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              PnL neto por hora del día (Detección de edge horario)
            </p>
          </div>

          <div className="h-[240px] w-full">
            {hourlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                Sin datos horarios
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <YAxis tick={{ fill: textColor, fontSize: 11, fontFamily: "monospace" }} tickLine={false} axisLine={{ stroke: gridColor }} />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name, props) => {
                      const item = props.payload as HourlyPerformance;
                      return [
                        `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })} (${item.trades} trades | WR ${item.winRate}%)`,
                        "PnL",
                      ];
                    }}
                  />
                  <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={`hour-${index}`} fill={entry.netPnl >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
