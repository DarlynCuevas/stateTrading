"use client";

import * as React from "react";
import { X, RefreshCw, Monitor, ShieldCheck, Download, CheckCircle2, Terminal } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Descargar Sincronizador de Escritorio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Para usuarios primerizos de Windows y Mac
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Explicación amigable */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>¿Por qué se necesita este archivo?</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            TradingView Desktop se ejecuta de forma local en tu ordenador. Este pequeño sincronizador lee tus órdenes directamente de tu TradingView y las sube de forma segura a tu cuenta de StateTrading.
          </p>
        </div>

        {/* Tarjetas de Descarga directa */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Descarga según tu sistema operativo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Windows Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-500/50 transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🪟</span>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    Para Windows
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Compatible con Windows 10 y 11. Abre TradingView automáticamente.
                </p>
              </div>

              <a
                href="/Sincronizar-Trading-Windows.bat"
                download="Sincronizar-Trading-Windows.bat"
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar (.bat)</span>
              </a>
            </div>

            {/* Mac Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-500/50 transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🍏</span>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    Para macOS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Compatible con macOS Intel y Apple Silicon (M1/M2/M3/M4).
                </p>
              </div>

              <a
                href="/Sincronizar-Trading-Mac.command"
                download="Sincronizar-Trading-Mac.command"
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar (.command)</span>
              </a>
            </div>
          </div>

          {/* Pack ZIP opcional */}
          <div className="text-center pt-1">
            <a
              href="/StateTrading-Sync.zip"
              download="StateTrading-Sync.zip"
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline font-medium"
            >
              <Download className="h-3 w-3" /> Descargar pack completo para todo el equipo (.zip)
            </a>
          </div>
        </div>

        {/* Pasos rápidos */}
        <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            ¿Cómo usarlo una vez descargado?
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-500 dark:text-slate-400">
            <li>Guarda el archivo en tu <b>Escritorio</b>.</li>
            <li>Haz doble clic sobre el archivo para abrirlo.</li>
            <li>Introduce tu email y contraseña de StateTrading (solo la primera vez).</li>
            <li>¡Listo! Tus operaciones se sincronizarán solas.</li>
          </ol>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            ¿Ya lo abriste en tu equipo?
          </span>
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
  );
}
