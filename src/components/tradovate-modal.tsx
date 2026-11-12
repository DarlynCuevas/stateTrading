"use client";

import * as React from "react";
import { KeyRound, RefreshCw, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TradovateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: () => void;
}

export function TradovateModal({ isOpen, onClose, onSyncSuccess }: TradovateModalProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [appId, setAppId] = React.useState("StateTrading");
  const [cid, setCid] = React.useState("");
  const [sec, setSec] = React.useState("");
  const [isLive, setIsLive] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ text: string; error?: boolean } | null>(null);

  // Cargar credenciales previas si existen
  React.useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("tradovate_credentials")
        .select("username, app_id, is_live, cid, sec")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUsername(data.username || "");
            setAppId(data.app_id || "StateTrading");
            setCid(data.cid || "");
            setSec(data.sec || "");
            setIsLive(data.is_live ?? true);
          }
        });
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage({ text: "Debes iniciar sesión primero", error: true });
        setLoading(false);
        return;
      }

      // 1. Guardar o actualizar credenciales en Supabase de forma privada
      const { error: dbError } = await supabase.from("tradovate_credentials").upsert({
        user_id: user.id,
        username,
        password,
        app_id: appId,
        cid: cid ? cid.trim() : null,
        sec: sec ? sec.trim() : null,
        is_live: isLive,
        updated_at: new Date().toISOString(),
      });

      if (dbError) {
        throw new Error("No se pudieron guardar las credenciales en la base de datos.");
      }

      // 2. Invocar la sincronización directa con Tradovate API
      const res = await fetch("/api/tradovate/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          app_id: appId,
          cid: cid ? cid.trim() : undefined,
          sec: sec ? sec.trim() : undefined,
          is_live: isLive,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Fallo al conectar con la API de Tradovate");
      }

      setStatusMessage({ text: data.message });
      setTimeout(() => {
        onSyncSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Conexión Automática Tradovate
            </h3>
            <p className="text-xs text-slate-500">
              Exporta balances y trades directo a Supabase sin archivos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>Tus datos viajan seguros y solo tu usuario puede utilizarlos para la sincronización.</span>
        </div>

        <form onSubmit={handleSaveAndSync} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Usuario de Tradovate / Apex
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario en Tradovate"
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contraseña de Tradovate
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CID (Client ID)
              </label>
              <input
                type="text"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                placeholder="Ej: 12345"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Secret (SEC)
              </label>
              <input
                type="password"
                value={sec}
                onChange={(e) => setSec(e.target.value)}
                placeholder="Clave API Secret"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Entorno</label>
              <select
                value={isLive ? "live" : "demo"}
                onChange={(e) => setIsLive(e.target.value === "live")}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="live">Live / Apex Fondeo</option>
                <option value="demo">Demo / Simulación</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.error
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {statusMessage.error ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Conectando con Tradovate...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Sincronizar Tradovate Ahora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
