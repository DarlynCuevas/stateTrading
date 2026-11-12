"use client";

import * as React from "react";
import { Account, Operation } from "@/lib/operations";
import { updateAccountStatus } from "@/lib/team-sync";
import {
  Wallet,
  Flame,
  Ban,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Archive,
  RotateCcw,
} from "lucide-react";

interface AccountsManagerProps {
  accounts: Account[];
  operations: Operation[];
  userId: string;
  onAccountStatusChanged: () => Promise<void> | void;
}

export function AccountsManager({
  accounts,
  operations,
  userId,
  onAccountStatusChanged,
}: AccountsManagerProps) {
  const [filter, setFilter] = React.useState<"all" | "active" | "burned">("active");
  const [loadingAccId, setLoadingAccId] = React.useState<string | null>(null);

  // Estadísticas globales de cuentas
  const activeAccounts = accounts.filter(
    (a) => a.activa !== false && a.estado !== "quemada" && a.estado !== "cancelada"
  );
  const burnedAccounts = accounts.filter(
    (a) => a.estado === "quemada" || (a.activa === false && a.estado !== "cancelada")
  );
  const canceledAccounts = accounts.filter((a) => a.estado === "cancelada");
  const passedAccounts = accounts.filter((a) => a.estado === "superada");

  // Saldo total vivo
  const totalActiveBalance = activeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  // Cuentas según el filtro
  const displayedAccounts = accounts.filter((a) => {
    const isActiva = a.activa !== false && a.estado !== "quemada" && a.estado !== "cancelada";
    if (filter === "active") return isActiva;
    if (filter === "burned") return !isActiva;
    return true;
  });

  const handleStatusChange = async (
    accountId: string,
    newStatus: "activa" | "quemada" | "cancelada" | "superada"
  ) => {
    const confirmMessage =
      newStatus === "quemada"
        ? "¿Estás seguro de marcar esta cuenta como QUEMADA? Ya no se sumará a tus balances ni KPIs activos."
        : newStatus === "cancelada"
        ? "¿Estás seguro de marcar esta cuenta como CANCELADA?"
        : "¿Deseas reactivar esta cuenta para que vuelva a sumarse a tus balances activos?";

    if (!window.confirm(confirmMessage)) return;

    setLoadingAccId(accountId);
    try {
      await updateAccountStatus(accountId, userId, newStatus);
      await onAccountStatusChanged();
    } finally {
      setLoadingAccId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cuentas Activas</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-500 font-bold">
              {activeAccounts.length}
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            ${totalActiveBalance.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400">Suman en Dashboard y KPIs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cuentas Quemadas</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-rose-500">
            {burnedAccounts.length}
          </div>
          <p className="text-[10px] text-slate-400">Archivadas sin sumar</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Canceladas / Bajas</span>
            <Ban className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-700 dark:text-slate-300">
            {canceledAccounts.length}
          </div>
          <p className="text-[10px] text-slate-400">No renovadas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Superadas / Aprobadas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-500">
            {passedAccounts.length}
          </div>
          <p className="text-[10px] text-slate-400">Fases pasadas a fondeo</p>
        </div>
      </div>

      {/* Control bar / Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === "active"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            🟢 Activas ({activeAccounts.length})
          </button>
          <button
            onClick={() => setFilter("burned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === "burned"
                ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            🔥 Quemadas / Archivadas ({burnedAccounts.length + canceledAccounts.length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Todas ({accounts.length})
          </button>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          💡 Las cuentas quemadas o canceladas <b>no se borran</b> de la base de datos para auditoría, pero <b>no suman en tu Dashboard</b>.
        </p>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedAccounts.map((acc) => {
          const isActiva = acc.activa !== false && acc.estado !== "quemada" && acc.estado !== "cancelada";
          const opsCuenta = operations.filter((op) => op.cuentaId === acc.id);
          const pnlTotal = opsCuenta.reduce((sum, op) => sum + (op.netPnl ?? op.pnl ?? 0), 0);
          const esFondeada = acc.id.toLowerCase().includes("paapex") || acc.tipo === "fondeada";

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition-all space-y-4 bg-white dark:bg-slate-900 ${
                isActiva
                  ? "border-slate-200 dark:border-slate-800 hover:border-emerald-500/40"
                  : "border-rose-200/80 dark:border-rose-950/50 bg-rose-500/[0.02]"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {acc.nombre || acc.alias || acc.id}
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{acc.id}</p>
                </div>

                {/* Badge de estado */}
                {isActiva ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Activa
                  </span>
                ) : acc.estado === "cancelada" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                    <Ban className="h-3 w-3" />
                    Cancelada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <Flame className="h-3 w-3" />
                    Quemada
                  </span>
                )}
              </div>

              {/* Balances & Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Saldo Actual</span>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    ${acc.balance?.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">PnL Acumulado</span>
                  <span
                    className={`font-mono font-bold text-sm flex items-center gap-0.5 ${
                      pnlTotal >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {pnlTotal >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {pnlTotal >= 0 ? "+" : ""}
                    ${pnlTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Drawdown info */}
              {isActiva && acc.distanciaDrawdown != null && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Colchón Drawdown:</span>
                  <span
                    className={`font-mono font-bold ${
                      acc.distanciaDrawdown > 500 ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    ${acc.distanciaDrawdown.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Footer info: Trades count */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{opsCuenta.length} operaciones registradas</span>
                <span>{esFondeada ? "Fondeada 50k" : "Evaluación 25k"}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {isActiva ? (
                  <>
                    <button
                      onClick={() => handleStatusChange(acc.id, "quemada")}
                      disabled={loadingAccId === acc.id}
                      title="Marcar como quemada (tocó drawdown)"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      <span>Quemar Cuenta</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(acc.id, "cancelada")}
                      disabled={loadingAccId === acc.id}
                      title="Marcar como cancelada o no renovada"
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleStatusChange(acc.id, "activa")}
                    disabled={loadingAccId === acc.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reactivar Cuenta en Dashboard</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
