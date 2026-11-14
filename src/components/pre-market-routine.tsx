"use client";

import * as React from "react";
import { Operation } from "@/lib/operations";
import { getTodayNewsStatus } from "@/lib/economic-calendar";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Brain,
  Target,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  Smile,
  Zap,
  BatteryMedium,
  Coffee,
  Check,
  RotateCcw,
} from "lucide-react";

export interface DailyRoutineData {
  date: string; // YYYY-MM-DD
  mentalState: "enfocado" | "calmado" | "energetico" | "ansioso" | "cansado";
  session: string;
  maxTrades: number;
  maxDailyRiskUsd: number;
  mainSetup: string;
  acknowledgedNews: boolean;
  notes?: string;
  // Post-market
  postMarketCompleted?: boolean;
  followedPlan?: boolean | null;
  debriefNotes?: string;
}

interface PreMarketRoutineProps {
  todayOperations: Operation[];
  todayPnl: number;
}

const MENTAL_STATES = [
  { id: "enfocado", label: "Enfocado", icon: Brain, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "calmado", label: "Calmado / Zen", icon: Smile, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "energetico", label: "Enérgico", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "cansado", label: "Cansado", icon: BatteryMedium, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  { id: "ansioso", label: "Ansioso / Impaciente", icon: Flame, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" },
] as const;

export function PreMarketRoutine({ todayOperations, todayPnl }: PreMarketRoutineProps) {
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const storageKey = `statetrading_routine_${todayStr}`;

  const [routine, setRoutine] = React.useState<DailyRoutineData | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [debriefModalOpen, setDebriefModalOpen] = React.useState(false);

  // Form states para Pre-Market
  const [mentalState, setMentalState] = React.useState<DailyRoutineData["mentalState"]>("enfocado");
  const [session, setSession] = React.useState("Apertura NY (09:30-11:30)");
  const [maxTrades, setMaxTrades] = React.useState(2);
  const [maxDailyRiskUsd, setMaxDailyRiskUsd] = React.useState(200);
  const [mainSetup, setMainSetup] = React.useState("FVG / Imbalance");
  const [acknowledgedNews, setAcknowledgedNews] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  // Form states para Post-Market
  const [followedPlan, setFollowedPlan] = React.useState<boolean | null>(null);
  const [debriefNotes, setDebriefNotes] = React.useState("");

  // Noticias de hoy para mostrar en el checklist
  const newsStatus = React.useMemo(() => getTodayNewsStatus(), []);

  // Cargar rutina de localStorage al montar
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRoutine(parsed);
        setMentalState(parsed.mentalState || "enfocado");
        setSession(parsed.session || "Apertura NY (09:30-11:30)");
        setMaxTrades(parsed.maxTrades || 2);
        setMaxDailyRiskUsd(parsed.maxDailyRiskUsd || 200);
        setMainSetup(parsed.mainSetup || "FVG / Imbalance");
        setFollowedPlan(parsed.followedPlan ?? null);
        setDebriefNotes(parsed.debriefNotes || "");
      }
    } catch {
      // Ignorar error de parsing
    }
  }, [storageKey]);

  const handleSavePreMarket = () => {
    const data: DailyRoutineData = {
      date: todayStr,
      mentalState,
      session,
      maxTrades,
      maxDailyRiskUsd,
      mainSetup,
      acknowledgedNews,
      notes: notes.trim() || undefined,
      postMarketCompleted: routine?.postMarketCompleted || false,
      followedPlan: routine?.followedPlan ?? null,
      debriefNotes: routine?.debriefNotes || undefined,
    };
    setRoutine(data);
    localStorage.setItem(storageKey, JSON.stringify(data));
    setModalOpen(false);
  };

  const handleSaveDebrief = () => {
    if (!routine) return;
    const updated: DailyRoutineData = {
      ...routine,
      postMarketCompleted: true,
      followedPlan,
      debriefNotes: debriefNotes.trim() || undefined,
    };
    setRoutine(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setDebriefModalOpen(false);
  };

  const tradesCount = todayOperations.length;
  const isOverTradesLimit = routine ? tradesCount > routine.maxTrades : false;
  const isOverRiskLimit = routine && todayPnl < 0 ? Math.abs(todayPnl) >= routine.maxDailyRiskUsd : false;

  return (
    <>
      {/* ─── TARJETA PRINCIPAL DEL DASHBOARD ─── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        {!routine ? (
          /* Estado 1: No ha completado la rutina pre-mercado */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Planifica tu Sesión de Hoy (Rutina Pre-Mercado)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Pendiente
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fija tu estado mental, límite de operaciones y stop diario antes de pulsar un botón en el mercado.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Completar Pre-Mercado (60 seg)</span>
            </button>
          </div>
        ) : (
          /* Estado 2: Rutina completada, muestra el plan activo y progreso del día */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Plan de Trading Activo • {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Pre-Mercado Listo
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Estado: <strong className="capitalize text-slate-700 dark:text-slate-200">{routine.mentalState}</strong></span>
                    <span>•</span>
                    <span>Sesión: <strong>{routine.session.split(" ")[0]}</strong></span>
                    <span>•</span>
                    <span>Setup: <strong>{routine.mainSetup}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Editar Plan
                </button>
                <button
                  type="button"
                  onClick={() => setDebriefModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    routine.postMarketCompleted
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{routine.postMarketCompleted ? "Ver Debrief Cierre" : "Cierre de Sesión"}</span>
                </button>
              </div>
            </div>

            {/* Fila de Controles de Límites en Vivo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Límite de Trades */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isOverTradesLimit
                  ? "bg-rose-500/10 border-rose-300 dark:border-rose-900/60 text-rose-600"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Trades Hoy / Límite
                  </div>
                  <div className="text-base font-mono font-bold mt-0.5">
                    {tradesCount} / {routine.maxTrades} trades
                  </div>
                </div>
                {isOverTradesLimit ? (
                  <AlertTriangle className="h-5 w-5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              {/* Límite de Riesgo Diario */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isOverRiskLimit
                  ? "bg-rose-500/10 border-rose-300 dark:border-rose-900/60 text-rose-600"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    PnL Hoy / Riesgo Máx
                  </div>
                  <div className={`text-base font-mono font-bold mt-0.5 ${todayPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)} / -${routine.maxDailyRiskUsd}
                  </div>
                </div>
                {isOverRiskLimit ? (
                  <Flame className="h-5 w-5 text-rose-500 animate-pulse" />
                ) : (
                  <Shield className="h-5 w-5 text-emerald-500" />
                )}
              </div>

              {/* Resultado del Cierre (Debrief) si ya se completó */}
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-slate-700 dark:text-slate-300">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Disciplina del Plan
                  </div>
                  <div className="text-xs font-bold mt-1">
                    {routine.postMarketCompleted ? (
                      routine.followedPlan ? (
                        <span className="text-emerald-500 font-bold">✓ 100% Plan Respetado</span>
                      ) : (
                        <span className="text-rose-500 font-bold">⚠️ Se rompió la disciplina</span>
                      )
                    ) : (
                      <span className="text-slate-400">Pendiente de cierre de sesión</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: RUTINA PRE-MERCADO ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Rutina Pre-Mercado (Definición del Día)
                  </h3>
                  <p className="text-[11px] text-slate-500">Tómate 60 segundos antes de abrir gráficos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* 1. Estado mental */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-emerald-500" />
                  <span>¿Cómo te sientes mental y emocionalmente hoy?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MENTAL_STATES.map((st) => {
                    const isSelected = mentalState === st.id;
                    const Icon = st.icon;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setMentalState(st.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? `${st.bg} font-bold ring-1 ring-emerald-500 shadow-sm`
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${st.color}`} />
                        <span className="text-xs text-slate-700 dark:text-slate-200">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sesión & Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Sesión Objetivo
                  </label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  >
                    <option value="Apertura NY (09:30-11:30)">Apertura NY (09:30-11:30)</option>
                    <option value="Mediodía NY (11:30-13:30)">Mediodía NY (11:30-13:30)</option>
                    <option value="Cierre NY (13:30-16:00)">Cierre NY (13:30-16:00)</option>
                    <option value="Londres (03:00-09:00)">Londres (03:00-09:00)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Setup Principal
                  </label>
                  <input
                    type="text"
                    value={mainSetup}
                    onChange={(e) => setMainSetup(e.target.value)}
                    placeholder="ej: FVG / Break & Retest"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* 3. Límites estricto de hoy */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Reglas de Parada (Stop Diarios)</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Máximo de Trades Hoy
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxTrades}
                      onChange={(e) => setMaxTrades(parseInt(e.target.value) || 2)}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Riesgo Máximo Permitido ($)
                    </span>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={maxDailyRiskUsd}
                      onChange={(e) => setMaxDailyRiskUsd(parseInt(e.target.value) || 200)}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Verificación de Noticias */}
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    Noticias Rojas de Hoy
                  </span>
                </div>
                {newsStatus.todayEvents.length > 0 ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Hoy hay {newsStatus.todayEvents.length} eventos de alto impacto:{" "}
                    <strong>{newsStatus.todayEvents.map((e) => `${e.title} (${e.timeFormatted})`).join(", ")}</strong>.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No hay eventos de impacto rojo programados para hoy en USD.
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acknowledgedNews}
                    onChange={(e) => setAcknowledgedNews(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Me comprometo a no tener órdenes abiertas en la publicación
                  </span>
                </label>
              </div>

              {/* 5. Notas opcionales */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Nota / Intención para hoy
                </label>
                <input
                  type="text"
                  placeholder="ej: Paciencia extrema, esperar confirmación de volumen en el FVG..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePreMarket}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Confirmar Plan del Día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DEBRIEF / CIERRE DE SESIÓN ─── */}
      {debriefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500" />
                <span>Cierre de Sesión & Debrief Diario</span>
              </h3>
              <button
                type="button"
                onClick={() => setDebriefModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  ¿Respetaste tu plan de trading y tus límites de parada hoy?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(true)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all ${
                      followedPlan === true
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    ✓ Sí, 100% disciplinado
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedPlan(false)}
                    className={`p-3 rounded-xl border text-center font-bold transition-all ${
                      followedPlan === false
                        ? "bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    ✗ No, cometí errores
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Conclusión / Lección de la sesión de hoy
                </label>
                <textarea
                  rows={3}
                  value={debriefNotes}
                  onChange={(e) => setDebriefNotes(e.target.value)}
                  placeholder="¿Cómo te sentiste? ¿Qué ejecutaste bien? ¿Qué corregirás mañana?"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDebriefModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveDebrief}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Guardar Cierre de Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
