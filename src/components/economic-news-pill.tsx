"use client";

import * as React from "react";
import {
  EconomicEvent,
  getTodayNewsStatus,
  getWeeklyEconomicEvents,
} from "@/lib/economic-calendar";
import {
  Flame,
  AlertTriangle,
  Clock,
  Calendar,
  X,
  ShieldAlert,
  Info,
  ChevronRight,
} from "lucide-react";

export function EconomicNewsPill() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [status, setStatus] = React.useState(() => getTodayNewsStatus());
  const [allWeeklyEvents, setAllWeeklyEvents] = React.useState<EconomicEvent[]>([]);

  // Actualizar el estado del reloj y eventos cada 30 segundos
  React.useEffect(() => {
    const update = () => {
      setStatus(getTodayNewsStatus());
      setAllWeeklyEvents(getWeeklyEconomicEvents());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const { todayEvents, nextEvent, minutesToNext, isImminent, isInHighRiskWindow } = status;

  return (
    <>
      {/* Píldora compacta en el Navbar */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
          isInHighRiskWindow
            ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30"
            : isImminent
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
            : todayEvents.length > 0
            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80"
            : "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60"
        }`}
        title="Calendario Económico de Noticias de Alto Impacto (USD)"
      >
        {isInHighRiskWindow ? (
          <>
            <Flame className="h-3.5 w-3.5" />
            <span>
              {nextEvent?.title.split(" ")[0]} • ¡RIESGO EXTREMO!
            </span>
          </>
        ) : isImminent && minutesToNext !== null ? (
          <>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="font-mono">
              🔴 {nextEvent?.title.split(" ")[0]} en {minutesToNext}m
            </span>
          </>
        ) : todayEvents.length > 0 ? (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              {todayEvents.length} {todayEvents.length === 1 ? "noticia roja" : "noticias rojas"} hoy
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Sin noticias rojas</span>
          </>
        )}
      </button>

      {/* Modal / Panel del Calendario Económico */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Noticias de Alto Impacto (Filtro Anti-Slippage)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold">
                      USD
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evita operar 5 minutos antes y después de estas noticias para proteger tu cuenta de fondeo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Alerta de regla de fondeo */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Regla de oro de cuentas de fondeo:</strong> Apex y Tradovate sufren
                  ensanchamiento brusco de spreads y deslices de Stop Loss durante eventos de alto impacto.
                  La recomendación profesional es estar 100% plano (sin posiciones abiertas) durante la publicación.
                </div>
              </div>

              {/* Eventos de Hoy */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  <span>Noticias de Hoy ({new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })})</span>
                </h4>

                {todayEvents.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center text-slate-400">
                    No hay eventos de impacto rojo programados para hoy. Condiciones limpias de volatilidad normal.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              {ev.timeFormatted} Madrid
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {ev.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {ev.description}
                          </p>
                        </div>
                        {ev.forecast && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                              Prev: {ev.previous || "--"}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              Previsión: {ev.forecast}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Eventos de Toda la Semana */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  <span>Calendario Completo de la Semana</span>
                </h4>
                <div className="space-y-2">
                  {allWeeklyEvents.map((ev) => {
                    const eventDate = new Date(ev.dateTime);
                    const dayLabel = eventDate.toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-slate-400 w-16 capitalize">
                            {dayLabel}
                          </span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {ev.timeFormatted}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {ev.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 uppercase">
                          Alto Impacto
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Horarios ajustados automáticamente a Europa/Madrid
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
