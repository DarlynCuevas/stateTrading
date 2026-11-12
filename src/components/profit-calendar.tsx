"use client";

import * as React from "react";
import { ParsedTrade } from "@/lib/types";
import { generateCalendarData, detectTradesMonth, CalendarDayData } from "@/lib/core-logic";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface ProfitCalendarProps {
  trades: ParsedTrade[];
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function ProfitCalendar({ trades }: ProfitCalendarProps) {
  const detected = React.useMemo(() => detectTradesMonth(trades), [trades]);
  const [viewYear, setViewYear] = React.useState(detected.year);
  const [viewMonth, setViewMonth] = React.useState(detected.month);

  // Re-sync when trades change (e.g. new file loaded)
  React.useEffect(() => {
    const d = detectTradesMonth(trades);
    setViewYear(d.year);
    setViewMonth(d.month);
  }, [trades]);

  const calendarData = React.useMemo(
    () => generateCalendarData(trades, viewYear, viewMonth),
    [trades, viewYear, viewMonth]
  );

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Summary stats for the visible month
  const monthStats = React.useMemo(() => {
    const currentDays = calendarData.days.filter((d) => d.isCurrentMonth && d.tradesCount > 0);
    const totalPnl = currentDays.reduce((sum, d) => sum + d.pnl, 0);
    const totalTrades = currentDays.reduce((sum, d) => sum + d.tradesCount, 0);
    const winDays = currentDays.filter((d) => d.pnl > 0).length;
    const lossDays = currentDays.filter((d) => d.pnl < 0).length;
    return { totalPnl, totalTrades, winDays, lossDays, tradingDays: currentDays.length };
  }, [calendarData]);

  const weeks: CalendarDayData[][] = [];
  for (let i = 0; i < calendarData.days.length; i += 7) {
    weeks.push(calendarData.days.slice(i, i + 7));
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Calendar className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Profit Calendar
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Rendimiento diario visualizado en calendario
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-[160px] text-center">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
          </div>
          <button
            onClick={goToNextMonth}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month Summary Bar */}
      {monthStats.tradingDays > 0 && (
        <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">PnL del mes:</span>
            <span className={`font-bold font-mono ${monthStats.totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {monthStats.totalPnl >= 0 ? "+$" : "-$"}{Math.abs(monthStats.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Trades:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{monthStats.totalTrades}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Días ganadores:</span>
            <span className="font-bold text-emerald-500">{monthStats.winDays}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Días perdedores:</span>
            <span className="font-bold text-rose-500">{monthStats.lossDays}</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarData.days.map((day, idx) => {
            const hasTrades = day.tradesCount > 0;
            const isPositive = day.pnl > 0;
            const isNegative = day.pnl < 0;
            const isWeekend = idx % 7 >= 5; // Sáb (5) y Dom (6)

            return (
              <div
                key={day.date}
                className={`relative rounded-lg border p-2.5 min-h-[90px] flex flex-col justify-between transition-all duration-150 group ${
                  !day.isCurrentMonth
                    ? "opacity-35 border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30"
                    : hasTrades
                    ? isPositive
                      ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700/60"
                      : isNegative
                      ? "border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-700/60"
                      : "border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50"
                    : isWeekend
                    ? "border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/40"
                    : "border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-200 dark:hover:border-slate-700"
                }`}
              >
                {/* Day Number */}
                <div className="flex items-start justify-between">
                  <span
                    className={`text-[11px] font-semibold ${
                      !day.isCurrentMonth
                        ? "text-slate-300 dark:text-slate-600"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                </div>

                {/* Content */}
                {day.isCurrentMonth && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5 my-1">
                    {hasTrades ? (
                      <>
                        <span
                          className={`text-sm font-bold font-mono leading-tight ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isNegative
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {isPositive ? "+$" : isNegative ? "-$" : "$"}{Math.abs(day.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {day.tradesCount} {day.tradesCount === 1 ? "trade" : "trades"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600 font-medium italic">
                        No Trades
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom PnL Bar */}
                {day.isCurrentMonth && hasTrades && (
                  <div className="mt-auto">
                    <div
                      className={`h-[3px] rounded-full w-full ${
                        isPositive
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : isNegative
                          ? "bg-rose-500 dark:bg-rose-400"
                          : "bg-slate-400 dark:bg-slate-500"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
