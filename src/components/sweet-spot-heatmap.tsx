"use client";

import * as React from "react";
import { ParsedTrade } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  AlertTriangle,
  Award,
  Calendar,
  Layers,
  Info,
} from "lucide-react";

interface SweetSpotHeatmapProps {
  trades: ParsedTrade[];
}

const DAYS = [
  { dayIndex: 1, label: "Lunes" },
  { dayIndex: 2, label: "Martes" },
  { dayIndex: 3, label: "Miércoles" },
  { dayIndex: 4, label: "Jueves" },
  { dayIndex: 5, label: "Viernes" },
];

const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

interface CellData {
  pnl: number;
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface SlotHighlight {
  day: string;
  slot: string;
  pnl: number;
  winRate: number;
  trades: number;
}

export function SweetSpotHeatmap({ trades }: SweetSpotHeatmapProps) {
  const [viewMode, setViewMode] = React.useState<"pnl" | "winRate" | "count">("pnl");
  const [hoveredCell, setHoveredCell] = React.useState<{
    day: string;
    slot: string;
    data: CellData;
  } | null>(null);

  // Mapear operaciones en la cuadrícula Día × Franja horaria
  const { matrix, maxPnl, minPnl, bestSlot, worstSlot } = React.useMemo(() => {
    const grid: Record<string, CellData> = {};

    let maxNetPnl = 0;
    let minNetPnl = 0;

    trades.forEach((t) => {
      if (!t.openTime) return;
      const date = new Date(t.openTime);
      if (isNaN(date.getTime())) return;

      const day = date.getDay(); // 1=Mon..5=Fri
      if (day < 1 || day > 5) return;

      const hours = date.getHours();
      const minutes = date.getMinutes();

      // Redondear a la franja de media hora más cercana
      const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
      const adjustedHours = minutes >= 45 ? (hours + 1) % 24 : hours;

      const slotKey = `${String(adjustedHours).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;
      const cellKey = `${day}_${slotKey}`;

      if (!grid[cellKey]) {
        grid[cellKey] = { pnl: 0, tradesCount: 0, wins: 0, losses: 0, winRate: 0 };
      }

      const pnl = t.netPnl ?? 0;
      grid[cellKey].pnl += pnl;
      grid[cellKey].tradesCount += 1;
      if (pnl > 0) grid[cellKey].wins += 1;
      if (pnl < 0) grid[cellKey].losses += 1;
      grid[cellKey].winRate = (grid[cellKey].wins / grid[cellKey].tradesCount) * 100;
    });

    let best: SlotHighlight | null = null;
    let worst: SlotHighlight | null = null;

    DAYS.forEach(({ dayIndex, label }) => {
      TIME_SLOTS.forEach((slot) => {
        const cell = grid[`${dayIndex}_${slot}`];
        if (cell && cell.tradesCount > 0) {
          if (cell.pnl > maxNetPnl) maxNetPnl = cell.pnl;
          if (cell.pnl < minNetPnl) minNetPnl = cell.pnl;

          if (!best || cell.pnl > best.pnl) {
            best = { day: label, slot, pnl: cell.pnl, winRate: cell.winRate, trades: cell.tradesCount };
          }
          if (!worst || cell.pnl < worst.pnl) {
            worst = { day: label, slot, pnl: cell.pnl, winRate: cell.winRate, trades: cell.tradesCount };
          }
        }
      });
    });

    return {
      matrix: grid,
      maxPnl: maxNetPnl,
      minPnl: minNetPnl,
      bestSlot: best as SlotHighlight | null,
      worstSlot: worst as SlotHighlight | null,
    };
  }, [trades]);

  // Función para determinar el color de cada celda
  const getCellColor = (data?: CellData) => {
    if (!data || data.tradesCount === 0) {
      return "bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/40 text-slate-300 dark:text-slate-600";
    }

    if (viewMode === "winRate") {
      if (data.winRate >= 70) return "bg-emerald-500/80 text-white font-bold";
      if (data.winRate >= 50) return "bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold";
      if (data.winRate >= 30) return "bg-rose-500/20 text-rose-700 dark:text-rose-300";
      return "bg-rose-500/80 text-white font-bold";
    }

    if (viewMode === "count") {
      return "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border-blue-500/30";
    }

    // Modo PnL
    if (data.pnl > 0) {
      if (data.pnl >= 300) return "bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30";
      if (data.pnl >= 100) return "bg-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-semibold";
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    } else if (data.pnl < 0) {
      if (data.pnl <= -300) return "bg-rose-600 text-white font-bold shadow-sm shadow-rose-600/30";
      if (data.pnl <= -100) return "bg-rose-500/40 text-rose-800 dark:text-rose-200 font-semibold";
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    }

    return "bg-slate-100 dark:bg-slate-800 text-slate-500";
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
      {/* Header y Filtro de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span>Matriz de Rentabilidad Horaria (Sweet Spot Matrix)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Descubre con precisión matemática en qué días y franjas horarias ganas dinero y en cuáles sangras capital
          </p>
        </div>

        {/* Toggle de Modo: PnL, Win Rate o Cantidad */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("pnl")}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === "pnl"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            PnL Neto ($)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("winRate")}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === "winRate"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Win Rate (%)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("count")}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === "count"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Volumen (Trades)
          </button>
        </div>
      </div>

      {/* Heatmap Grid con scroll horizontal */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          {/* Eje de Horas (Columnas) */}
          <div className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 mb-1 text-[10px] font-mono font-semibold text-slate-400 text-center">
            <div className="text-left font-sans">Día</div>
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="truncate">
                {slot}
              </div>
            ))}
          </div>

          {/* Filas de Días */}
          <div className="space-y-1">
            {DAYS.map(({ dayIndex, label }) => (
              <div
                key={dayIndex}
                className="grid grid-cols-[80px_repeat(17,1fr)] gap-1 items-center"
              >
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {label}
                </div>
                {TIME_SLOTS.map((slot) => {
                  const cell = matrix[`${dayIndex}_${slot}`];
                  const hasData = cell && cell.tradesCount > 0;

                  return (
                    <div
                      key={slot}
                      onMouseEnter={() =>
                        hasData && setHoveredCell({ day: label, slot, data: cell })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-9 rounded-md flex flex-col items-center justify-center text-[10px] font-mono border transition-all cursor-pointer relative ${getCellColor(
                        cell
                      )} hover:scale-105 hover:z-10`}
                    >
                      {hasData ? (
                        viewMode === "pnl" ? (
                          <span>
                            {cell.pnl >= 0 ? "+" : ""}
                            {Math.round(cell.pnl)}
                          </span>
                        ) : viewMode === "winRate" ? (
                          <span>{Math.round(cell.winRate)}%</span>
                        ) : (
                          <span>{cell.tradesCount}x</span>
                        )
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detalle flotante al pasar el ratón (Tooltip) */}
      {hoveredCell && (
        <div className="p-3 rounded-xl bg-slate-900 text-white dark:bg-slate-800 text-xs flex items-center justify-between gap-4 animate-fadeIn shadow-xl border border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-bold">
              {hoveredCell.day} a las {hoveredCell.slot}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>
              PnL:{" "}
              <strong
                className={hoveredCell.data.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}
              >
                {hoveredCell.data.pnl >= 0 ? "+" : ""}${hoveredCell.data.pnl.toFixed(2)}
              </strong>
            </span>
            <span>
              Win Rate: <strong>{hoveredCell.data.winRate.toFixed(1)}%</strong>
            </span>
            <span>
              Trades: <strong>{hoveredCell.data.tradesCount} ({hoveredCell.data.wins}W / {hoveredCell.data.losses}L)</strong>
            </span>
          </div>
        </div>
      )}

      {/* ─── INSIGHTS AUTOMÁTICOS: SWEET SPOT VS ZONA DE PELIGRO ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Tu Sweet Spot */}
        <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Tu Sweet Spot Operativo (Máxima Eficiencia)
            </div>
            {bestSlot ? (
              <div className="mt-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {bestSlot.day} a las {bestSlot.slot}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Has generado{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    +${bestSlot.pnl.toFixed(2)}
                  </strong>{" "}
                  con un Win Rate del{" "}
                  <strong>{bestSlot.winRate.toFixed(0)}%</strong> en {bestSlot.trades} trades.
                  ¡Aquí es donde tienes tu mayor ventaja estadística!
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Registra más trades para identificar tu franja dorada.</p>
            )}
          </div>
        </div>

        {/* Fuga de Capital / Zona Peligrosa */}
        <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              Fuga de Capital (Zona a Evitar)
            </div>
            {worstSlot && worstSlot.pnl < 0 ? (
              <div className="mt-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {worstSlot.day} a las {worstSlot.slot}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Has perdido{" "}
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">
                    -${Math.abs(worstSlot.pnl).toFixed(2)}
                  </strong>{" "}
                  (Win Rate de solo {worstSlot.winRate.toFixed(0)}%). Considera apagar pantallas
                  o no tomar operaciones en este horario.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">¡Enhorabuena! No tienes franjas horarias con pérdidas graves acumuladas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
