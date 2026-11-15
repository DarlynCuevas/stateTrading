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
  Globe,
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

export type SessionTab = "all" | "asia" | "london" | "ny";

export const SESSION_CONFIG = {
  asia: {
    id: "asia" as const,
    name: "Sesión Asia",
    icon: "🌏",
    hours: "00:00 - 08:00",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    activeBg: "bg-purple-600 text-white shadow-purple-600/25",
    slots: [
      "00:00", "00:30", "01:00", "01:30", "02:00", "02:30",
      "03:00", "03:30", "04:00", "04:30", "05:00", "05:30",
      "06:00", "06:30", "07:00", "07:30"
    ],
  },
  london: {
    id: "london" as const,
    name: "Sesión Londres",
    icon: "🇬🇧",
    hours: "08:00 - 15:30",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    activeBg: "bg-sky-600 text-white shadow-sky-600/25",
    slots: [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
      "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00"
    ],
  },
  ny: {
    id: "ny" as const,
    name: "Sesión Nueva York",
    icon: "🇺🇸",
    hours: "15:30 - 22:00",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    activeBg: "bg-emerald-600 text-white shadow-emerald-600/25",
    slots: [
      "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
      "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
      "21:30", "22:00"
    ],
  },
};

const ALL_SLOTS = [
  ...SESSION_CONFIG.asia.slots,
  ...SESSION_CONFIG.london.slots,
  ...SESSION_CONFIG.ny.slots,
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

interface SessionStats {
  id: string;
  name: string;
  icon: string;
  hours: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Determina la sesión operativa (Horario España - CET/CEST) para un trade
 */
function getSessionForDate(date: Date): { id: string; name: string } {
  const h = date.getHours();
  const m = date.getMinutes();
  const mins = h * 60 + m; // Minutos transcurridos desde medianoche

  // 00:00 a 08:00 -> Asia (0 a 480 min)
  if (mins < 480) {
    return { id: "asia", name: "Asia (00:00-08:00)" };
  }
  // 08:00 a 15:30 -> Londres (480 a 930 min)
  if (mins < 930) {
    return { id: "london", name: "Londres (08:00-15:30)" };
  }
  // 15:30 a 17:30 -> Apertura NY (930 a 1050 min)
  if (mins < 1050) {
    return { id: "ny_open", name: "Apertura NY (15:30-17:30)" };
  }
  // 17:30 a 19:30 -> Mediodía NY (1050 a 1170 min)
  if (mins < 1170) {
    return { id: "ny_mid", name: "Mediodía NY (17:30-19:30)" };
  }
  // 19:30 a 22:00 -> Cierre NY (1170 a 1320 min)
  if (mins <= 1320) {
    return { id: "ny_close", name: "Cierre NY (19:30-22:00)" };
  }
  // 22:00 a 23:59 -> Post-cierre / Asia temprana
  return { id: "asia", name: "Asia (00:00-08:00)" };
}

export function SweetSpotHeatmap({ trades }: SweetSpotHeatmapProps) {
  const [viewMode, setViewMode] = React.useState<"pnl" | "winRate" | "count">("pnl");
  const [selectedSession, setSelectedSession] = React.useState<SessionTab>("all");
  const [hoveredCell, setHoveredCell] = React.useState<{
    day: string;
    slot: string;
    data: CellData;
  } | null>(null);

  // Franjas horarias activas según la sesión seleccionada
  const activeSlots = React.useMemo(() => {
    if (selectedSession === "asia") return SESSION_CONFIG.asia.slots;
    if (selectedSession === "london") return SESSION_CONFIG.london.slots;
    if (selectedSession === "ny") return SESSION_CONFIG.ny.slots;
    return ALL_SLOTS;
  }, [selectedSession]);

  // Estadísticas globales agrupadas por sesión operativa (Horario España)
  const sessionBreakdown = React.useMemo(() => {
    const stats: Record<string, SessionStats> = {
      asia: { id: "asia", name: "Asia", icon: "🌏", hours: "00:00 - 08:00", pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0 },
      london: { id: "london", name: "Londres", icon: "🇬🇧", hours: "08:00 - 15:30", pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0 },
      ny_open: { id: "ny_open", name: "Apertura NY", icon: "🇺🇸", hours: "15:30 - 17:30", pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0 },
      ny_mid: { id: "ny_mid", name: "Mediodía NY", icon: "🇺🇸", hours: "17:30 - 19:30", pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0 },
      ny_close: { id: "ny_close", name: "Cierre NY", icon: "🇺🇸", hours: "19:30 - 22:00", pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0 },
    };

    trades.forEach((t) => {
      if (!t.openTime) return;
      const date = new Date(t.openTime);
      if (isNaN(date.getTime())) return;

      const pnl = t.netPnl ?? t.pnl ?? 0;
      const sess = getSessionForDate(date);
      const target = stats[sess.id] || stats["asia"];

      target.trades += 1;
      target.pnl += pnl;
      if (pnl > 0) target.wins += 1;
      if (pnl < 0) target.losses += 1;
      target.winRate = target.trades > 0 ? (target.wins / target.trades) * 100 : 0;
    });

    return Object.values(stats);
  }, [trades]);

  // Mapear operaciones en la cuadrícula Día × Franja horaria
  const { matrix, maxPnl, minPnl, bestSlot, worstSlot } = React.useMemo(() => {
    const grid: Record<string, CellData> = {};

    let maxNetPnl = 0;
    let minNetPnl = 0;

    trades.forEach((t) => {
      if (!t.openTime) return;
      const date = new Date(t.openTime);
      if (isNaN(date.getTime())) return;

      let day = date.getDay(); // 0=Dom, 1=Lun..5=Vie, 6=Sab
      const hours = date.getHours();
      const minutes = date.getMinutes();

      // Si la operación fue domingo por la noche (apertura semanal de Asia en CME), se asigna al Lunes
      if (day === 0 && hours >= 22) {
        day = 1;
      }
      if (day < 1 || day > 5) return;

      // Redondear a la franja de media hora más cercana
      const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
      const adjustedHours = minutes >= 45 ? (hours + 1) % 24 : hours;

      const slotKey = `${String(adjustedHours).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;
      const cellKey = `${day}_${slotKey}`;

      if (!grid[cellKey]) {
        grid[cellKey] = { pnl: 0, tradesCount: 0, wins: 0, losses: 0, winRate: 0 };
      }

      const pnl = t.netPnl ?? t.pnl ?? 0;
      grid[cellKey].pnl += pnl;
      grid[cellKey].tradesCount += 1;
      if (pnl > 0) grid[cellKey].wins += 1;
      if (pnl < 0) grid[cellKey].losses += 1;
      grid[cellKey].winRate = (grid[cellKey].wins / grid[cellKey].tradesCount) * 100;
    });

    let best: SlotHighlight | null = null;
    let worst: SlotHighlight | null = null;

    DAYS.forEach(({ dayIndex, label }) => {
      activeSlots.forEach((slot) => {
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
  }, [trades, activeSlots]);

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
      {/* ─── HEADER: Título y Selector de Métrica ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span>Matriz de Rentabilidad Horaria (Sweet Spot Matrix)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Analiza tu rentabilidad por franjas horarias y sesiones operativas (Horario España - CET)
          </p>
        </div>

        {/* Toggle de Métrica: PnL, Win Rate o Cantidad */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("pnl")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === "pnl"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            PnL Neto ($)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("winRate")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === "winRate"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Win Rate (%)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("count")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === "count"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Volumen (Trades)
          </button>
        </div>
      </div>

      {/* ─── RESUMEN DE SESIONES OPERATIVAS (HORARIO ESPAÑA) ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>Rendimiento por Sesión (Horario España)</span>
          </span>
          <span className="text-[10px] text-slate-400">Haz clic en una sesión para enfocar su franja</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {sessionBreakdown.map((s) => {
            const isSelected =
              (selectedSession === "asia" && s.id === "asia") ||
              (selectedSession === "london" && s.id === "london") ||
              (selectedSession === "ny" && s.id.startsWith("ny"));

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === "asia") setSelectedSession(selectedSession === "asia" ? "all" : "asia");
                  else if (s.id === "london") setSelectedSession(selectedSession === "london" ? "all" : "london");
                  else setSelectedSession(selectedSession === "ny" ? "all" : "ny");
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-emerald-500 bg-white dark:bg-slate-900 shadow-md border-emerald-500/50"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span>{s.icon}</span>
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{s.hours}</span>
                </div>

                <div
                  className={`text-sm font-mono font-extrabold flex items-center gap-1 ${
                    s.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {s.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                  <span>WR: <strong className="text-slate-700 dark:text-slate-300">{s.winRate.toFixed(0)}%</strong></span>
                  <span>{s.trades} trades</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SELECTOR DE FILTRO DE SESIONES DEL HEATMAP ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setSelectedSession("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSession === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Todas las Sesiones (24h)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSession("asia")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSession === "asia"
                ? SESSION_CONFIG.asia.activeBg
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>🌏 Asia (00:00 - 08:00)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSession("london")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSession === "london"
                ? SESSION_CONFIG.london.activeBg
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>🇬🇧 Londres (08:00 - 15:30)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSession("ny")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSession === "ny"
                ? SESSION_CONFIG.ny.activeBg
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>🇺🇸 Nueva York (15:30 - 22:00)</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Mostrando <strong>{activeSlots.length}</strong> franjas horarias
        </span>
      </div>

      {/* ─── HEATMAP GRID CON SCROLL HORIZONTAL ─── */}
      <div className="overflow-x-auto pb-2 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/30 dark:bg-slate-950/20">
        <div style={{ minWidth: `${Math.max(680, activeSlots.length * 42 + 90)}px` }}>
          {/* Cabecera de Sesión agrupada (cuando se ven todas) */}
          {selectedSession === "all" && (
            <div
              className="grid gap-1 mb-1.5 text-[10px] font-bold text-center"
              style={{
                gridTemplateColumns: `80px repeat(${SESSION_CONFIG.asia.slots.length}, minmax(36px, 1fr)) repeat(${SESSION_CONFIG.london.slots.length}, minmax(36px, 1fr)) repeat(${SESSION_CONFIG.ny.slots.length}, minmax(36px, 1fr))`,
              }}
            >
              <div />
              <div
                className="py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 truncate"
                style={{ gridColumn: `span ${SESSION_CONFIG.asia.slots.length}` }}
              >
                🌏 Sesión Asia (00:00 - 08:00 España)
              </div>
              <div
                className="py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate"
                style={{ gridColumn: `span ${SESSION_CONFIG.london.slots.length}` }}
              >
                🇬🇧 Sesión Londres (08:00 - 15:30 España)
              </div>
              <div
                className="py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate"
                style={{ gridColumn: `span ${SESSION_CONFIG.ny.slots.length}` }}
              >
                🇺🇸 Sesión Nueva York (15:30 - 22:00 España)
              </div>
            </div>
          )}

          {/* Eje de Horas (Columnas) */}
          <div
            className="grid gap-1 mb-1 text-[10px] font-mono font-semibold text-slate-400 text-center"
            style={{
              gridTemplateColumns: `80px repeat(${activeSlots.length}, minmax(36px, 1fr))`,
            }}
          >
            <div className="text-left font-sans font-bold">Día (CET)</div>
            {activeSlots.map((slot) => (
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
                className="grid gap-1 items-center"
                style={{
                  gridTemplateColumns: `80px repeat(${activeSlots.length}, minmax(36px, 1fr))`,
                }}
              >
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {label}
                </div>
                {activeSlots.map((slot) => {
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

      {/* ─── DETALLE FLOTANTE (TOOLTIP) ─── */}
      {hoveredCell && (
        <div className="p-3 rounded-xl bg-slate-900 text-white dark:bg-slate-800 text-xs flex items-center justify-between gap-4 animate-fadeIn shadow-xl border border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-bold">
              {hoveredCell.day} a las {hoveredCell.slot} (Hora España)
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
              Trades:{" "}
              <strong>
                {hoveredCell.data.tradesCount} ({hoveredCell.data.wins}W / {hoveredCell.data.losses}L)
              </strong>
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
                  {bestSlot.day} a las {bestSlot.slot} (Hora España)
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
                  {worstSlot.day} a las {worstSlot.slot} (Hora España)
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
