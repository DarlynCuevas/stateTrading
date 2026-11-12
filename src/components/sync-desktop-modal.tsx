"use client";

import * as React from "react";
import { X, RefreshCw, Terminal, CheckCircle2, Monitor, ShieldCheck, ArrowRight } from "lucide-react";

interface SyncDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean;
}

export function SyncDesktopModal({
  isOpen,
  onClose,
  onRefresh,
  refreshing = false,
}: SyncDesktopModalProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Sincronizar TradingView Desktop
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conecta tus operaciones y cuentas en 1 clic
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Explicación amigable */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Sincronización segura directa desde tu equipo</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            Como tu TradingView Desktop se ejecuta en tu propio ordenador (no en la nube), el sincronizador lee tus órdenes locales de forma 100% privada y las envía a tu cuenta de StateTrading.
          </p>
        </div>

        {/* Pasos de ejecución */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Instrucciones (1 solo clic)
          </h3>

          <div className="space-y-2.5">
            {/* Opción Mac */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-850 dark:text-slate-100">
                  🍏 En macOS:
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
                  scripts/Sincronizar-Trading-Mac.command
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Haz doble clic sobre el archivo <code className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Sincronizar-Trading-Mac.command</code> en la carpeta de tu proyecto.
              </p>
            </div>

            {/* Opción Windows */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-850 dark:text-slate-100">
                  🪟 En Windows:
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium">
                  scripts/Sincronizar-Trading-Windows.bat
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Haz doble clic sobre el archivo <code className="font-mono text-blue-600 dark:text-blue-400 font-semibold">Sincronizar-Trading-Windows.bat</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ¿Ya ejecutaste el archivo?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRefresh();
                onClose();
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Actualizar datos en pantalla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
