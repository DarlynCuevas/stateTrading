"use client";

import * as React from "react";
import { ParsedTrade } from "@/lib/types";
import {
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  BookOpen,
  DollarSign,
  Maximize2,
  Trash2,
  ExternalLink,
  Save,
  Check,
  Target,
  Shield,
  Sparkles,
} from "lucide-react";

interface TradeDetailModalProps {
  trade: ParsedTrade | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tradeId: string, updates: Partial<ParsedTrade>) => Promise<void>;
  accountName?: string;
}

const COMMON_SETUPS = [
  "FVG / Imbalance",
  "Break & Retest",
  "Order Block",
  "Liquidity Sweep",
  "Trend Following",
  "Reversión",
  "Ruptura de Rango",
  "Apertura NY",
  "Scalp Momentum",
];

const COMMON_ERRORS = [
  "FOMO / Entrada tarde",
  "Revenge Trading",
  "Mover / Quitar Stop Loss",
  "Salida prematura por miedo",
  "Sobreapalancamiento",
  "Operar fuera de sesión",
  "Entrada anticipada (Sin confirmación)",
  "Ignorar plan de trading",
  "Perseguir precio",
];

const COMMON_WINS = [
  "Respetó el Stop Loss",
  "Paciencia en la entrada",
  "Gestión de riesgo impecable",
  "Esperó confirmación técnica",
  "Take Profit según plan",
  "Excelente ratio R:R",
];

const SESSIONS = [
  "Apertura NY (09:30-11:30)",
  "Mediodía NY (11:30-13:30)",
  "Cierre NY (13:30-16:00)",
  "Londres (03:00-09:00)",
  "Asia (18:00-02:00)",
];

export function TradeDetailModal({
  trade,
  isOpen,
  onClose,
  onSave,
  accountName,
}: TradeDetailModalProps) {
  if (!isOpen || !trade) return null;

  const [setup, setSetup] = React.useState<string>(trade.setup || "");
  const [customSetup, setCustomSetup] = React.useState<string>("");
  const [sesion, setSesion] = React.useState<string>(trade.sesion || "");
  const [resultado, setResultado] = React.useState<string>(
    trade.resultado || (trade.netPnl > 0 ? "TP" : trade.netPnl < 0 ? "SL" : "BE")
  );
  const [sl, setSl] = React.useState<string>(trade.sl ? String(trade.sl) : "");
  const [tp, setTp] = React.useState<string>(trade.tp ? String(trade.tp) : "");
  const [riesgoUsd, setRiesgoUsd] = React.useState<string>(
    trade.riesgoUsd ? String(trade.riesgoUsd) : ""
  );
  const [rMultiple, setRMultiple] = React.useState<string>(
    trade.rMultiple ? String(trade.rMultiple) : ""
  );
  const [errores, setErrores] = React.useState<string[]>(trade.errores || []);
  const [aciertos, setAciertos] = React.useState<string[]>(trade.aciertos || []);
  const [leccion, setLeccion] = React.useState<string>(trade.leccion || "");
  const [captura, setCaptura] = React.useState<string>(trade.captura || "");
  const [capturaPreviewOpen, setCapturaPreviewOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Sincronizar estado cuando cambia el trade
  React.useEffect(() => {
    if (trade) {
      setSetup(trade.setup || "");
      setCustomSetup("");
      setSesion(trade.sesion || "");
      setResultado(
        trade.resultado || (trade.netPnl > 0 ? "TP" : trade.netPnl < 0 ? "SL" : "BE")
      );
      setSl(trade.sl ? String(trade.sl) : "");
      setTp(trade.tp ? String(trade.tp) : "");
      setRiesgoUsd(trade.riesgoUsd ? String(trade.riesgoUsd) : "");
      setRMultiple(trade.rMultiple ? String(trade.rMultiple) : "");
      setErrores(trade.errores || []);
      setAciertos(trade.aciertos || []);
      setLeccion(trade.leccion || "");
      setCaptura(trade.captura || "");
      setSavedSuccess(false);
    }
  }, [trade]);

  // Soporte para pegar imágenes directamente desde el portapapeles (Cmd/Ctrl + V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setCaptura(String(event.target.result));
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Cerrar con Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (capturaPreviewOpen) {
          setCapturaPreviewOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, capturaPreviewOpen]);

  // Cálculo automático sugerido de R-Multiple si hay riesgo en USD
  const calculatedR = React.useMemo(() => {
    const risk = parseFloat(riesgoUsd);
    if (!isNaN(risk) && risk > 0) {
      const r = trade.netPnl / risk;
      return (r >= 0 ? "+" : "") + r.toFixed(2) + "R";
    }
    return null;
  }, [riesgoUsd, trade.netPnl]);

  const toggleError = (err: string) => {
    setErrores((prev) =>
      prev.includes(err) ? prev.filter((e) => e !== err) : [...prev, err]
    );
  };

  const toggleAcierto = (ac: string) => {
    setAciertos((prev) =>
      prev.includes(ac) ? prev.filter((a) => a !== ac) : [...prev, ac]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCaptura(String(ev.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedSl = sl.trim() !== "" ? parseFloat(sl) : null;
      const parsedTp = tp.trim() !== "" ? parseFloat(tp) : null;
      const parsedRisk = riesgoUsd.trim() !== "" ? parseFloat(riesgoUsd) : null;
      const parsedR =
        rMultiple.trim() !== ""
          ? parseFloat(rMultiple)
          : parsedRisk && parsedRisk > 0
          ? Number((trade.netPnl / parsedRisk).toFixed(2))
          : null;

      await onSave(trade.id, {
        setup: setup.trim() || null,
        sesion: sesion.trim() || null,
        resultado: resultado.trim() || null,
        sl: parsedSl,
        tp: parsedTp,
        riesgoUsd: parsedRisk,
        rMultiple: parsedR,
        errores,
        aciertos,
        leccion: leccion.trim() || null,
        captura: captura.trim() || null,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error guardando trade:", err);
    } finally {
      setSaving(false);
    }
  };

  const isPositive = trade.netPnl >= 0;
  const isShort =
    trade.type.includes("SHORT") ||
    trade.type.includes("VENTA") ||
    trade.type === "SELL";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {trade.symbol}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isShort
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {trade.type}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    #{trade.id}
                  </span>
                  {accountName && (
                    <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium">
                      {accountName}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{trade.openTime}</span>
                  {trade.holdingTimeMinutes !== undefined && (
                    <span>• {trade.holdingTimeMinutes} min de duración</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div
                  className={`text-xl sm:text-2xl font-mono font-bold ${
                    isPositive ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isPositive ? "+" : "-"}$
                  {Math.abs(trade.netPnl).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  PnL Neto
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body scrolleable */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* 1. Métricas de Ejecución */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                  Precio Entrada
                </div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {trade.entryPrice > 0 ? trade.entryPrice.toFixed(2) : "-"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                  Precio Salida
                </div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {trade.exitPrice > 0 ? trade.exitPrice.toFixed(2) : "-"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                  Contratos / Cant.
                </div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {trade.quantity ?? 1}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                  Comisión
                </div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  ${(trade.commission || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* 2. Setup & Estrategia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Setup / Estrategia Utilizada</span>
                </label>
                {setup && (
                  <button
                    onClick={() => setSetup("")}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Borrar selección
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SETUPS.map((s) => {
                  const isSelected = setup === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSetup(isSelected ? "" : s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/70"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {/* Input personalizado si el setup no está en la lista */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="O escribe otro setup personalizado..."
                  value={customSetup}
                  onChange={(e) => setCustomSetup(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customSetup.trim()) {
                      e.preventDefault();
                      setSetup(customSetup.trim());
                      setCustomSetup("");
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customSetup.trim()) {
                      setSetup(customSetup.trim());
                      setCustomSetup("");
                    }
                  }}
                  disabled={!customSetup.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium disabled:opacity-40 transition-colors"
                >
                  Asignar
                </button>
              </div>
            </div>

            {/* 3. Sesión de Mercado & Resultado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>Sesión Operativa</span>
                </label>
                <select
                  value={sesion}
                  onChange={(e) => setSesion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar sesión...</option>
                  {SESSIONS.map((sess) => (
                    <option key={sess} value={sess}>
                      {sess}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                  <Target className="h-3.5 w-3.5 text-amber-500" />
                  <span>Resultado Técnico</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["TP", "SL", "BE", "Manual"].map((res) => {
                    const isSelected = resultado === res;
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setResultado(res)}
                        className={`py-1.5 rounded-lg font-bold transition-all text-center ${
                          isSelected
                            ? res === "TP"
                              ? "bg-emerald-500 text-white"
                              : res === "SL"
                              ? "bg-rose-500 text-white"
                              : "bg-blue-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {res}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Plan de Riesgo (R:R, SL, TP) */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Plan de Riesgo & R-Multiple</span>
                </span>
                {calculatedR && (
                  <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    R Calculado: {calculatedR}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Stop Loss Planeado
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="ej: 21450"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Take Profit Planeado
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="ej: 21520"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Riesgo Planeado ($)
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="ej: 250"
                    value={riesgoUsd}
                    onChange={(e) => setRiesgoUsd(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    R-Multiple Real
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={calculatedR || "ej: 2.5"}
                    value={rMultiple}
                    onChange={(e) => setRMultiple(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. Auditoría de Psicología & Errores */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Errores de Ejecución y Psicología</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    (Haz clic para marcar lo que ocurrió)
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ERRORS.map((err) => {
                    const isSelected = errores.includes(err);
                    return (
                      <button
                        key={err}
                        type="button"
                        onClick={() => toggleError(err)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                        }`}
                      >
                        {err}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Aciertos & Buena Disciplina</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_WINS.map((win) => {
                    const isSelected = aciertos.includes(win);
                    return (
                      <button
                        key={win}
                        type="button"
                        onClick={() => toggleAcierto(win)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                        }`}
                      >
                        {win}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 6. Captura de Pantalla / Gráfico */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Captura del Gráfico (TradingView)</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Tip: Puedes pegar con <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono">Cmd+V</kbd>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL de imagen o TradingView (https://www.tradingview.com/x/...)"
                  value={captura.startsWith("data:") ? "[Imagen pegada desde portapapeles]" : captura}
                  onChange={(e) => {
                    if (!captura.startsWith("data:")) {
                      setCaptura(e.target.value);
                    }
                  }}
                  disabled={captura.startsWith("data:")}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-xs focus:ring-1 focus:ring-emerald-500"
                />
                <label className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer transition-colors shrink-0">
                  <span>Subir Archivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {captura && (
                  <button
                    type="button"
                    onClick={() => setCaptura("")}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar captura"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Vista previa miniatura de la captura */}
              {captura && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 max-h-56 group">
                  <img
                    src={captura}
                    alt="Captura del trade"
                    className="w-full h-auto max-h-56 object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCapturaPreviewOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-sm"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Ver Completa</span>
                    </button>
                    {!captura.startsWith("data:") && (
                      <a
                        href={captura}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 shadow-lg backdrop-blur-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 7. Notas del Diario & Lección Aprendida */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                <span>Diario & Lección Aprendida</span>
              </label>
              <textarea
                rows={3}
                placeholder="¿Qué viste antes de entrar? ¿Qué sentiste durante el trade? ¿Qué lección de disciplina o ejecución te deja esta operación?"
                value={leccion}
                onChange={(e) => setLeccion(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Footer con Guardar */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 animate-fadeIn">
                  <Check className="h-4 w-4" />
                  <span>¡Operación guardada con éxito!</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Los cambios se sincronizan con Supabase y tu diario.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Pantalla Completa de la Imagen */}
      {capturaPreviewOpen && captura && (
        <div
          onClick={() => setCapturaPreviewOpen(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <button
            onClick={() => setCapturaPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={captura}
            alt="Captura ampliada"
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
