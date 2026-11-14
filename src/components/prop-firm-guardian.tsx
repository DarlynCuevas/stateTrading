"use client";

import * as React from "react";
import { Account, Operation } from "@/lib/operations";
import {
  calculateAccountRiskMetrics,
  AccountRiskMetrics,
} from "@/lib/prop-firm-logic";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Lock,
  Unlock,
  Target,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";

interface PropFirmGuardianProps {
  accounts: Account[];
  operations: Operation[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

export function PropFirmGuardian({
  accounts,
  operations,
  selectedAccountId,
  onSelectAccount,
}: PropFirmGuardianProps) {
  // Filtrar cuentas activas
  const activeAccounts = React.useMemo(() => {
    return accounts.filter(
      (a) => a.activa !== false && a.estado !== "quemada" && a.estado !== "cancelada"
    );
  }, [accounts]);

  // Métricas calculadas para cada cuenta activa
  const metricsList = React.useMemo(() => {
    return activeAccounts.map((a) => calculateAccountRiskMetrics(a, operations));
  }, [activeAccounts, operations]);

  // Cuenta enfocada (o la primera activa si no hay selección)
  const currentAccountMetrics = React.useMemo(() => {
    if (selectedAccountId && selectedAccountId !== "all" && selectedAccountId !== "active") {
      return (
        metricsList.find((m) => m.accountId === selectedAccountId) ||
        metricsList[0] ||
        null
      );
    }
    return metricsList[0] || null;
  }, [metricsList, selectedAccountId]);

  // Cuentas en estado crítico o warning
  const criticalAccounts = metricsList.filter((m) => m.riskLevel === "critical");
  const warningAccounts = metricsList.filter((m) => m.riskLevel === "warning");
  const dailyLossBreached = metricsList.filter((m) => m.isDailyLossExceeded);

  if (activeAccounts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-400">
        <ShieldAlert className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No hay cuentas activas registradas
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Sincroniza tus cuentas de Apex / Tradovate con el agente de escritorio para activar el Guardián de Riesgo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. BANNERS DE ALERTA DE RIESGO GLOBAL ─── */}
      {dailyLossBreached.length > 0 && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-rose-500/10 dark:bg-rose-950/40 p-4 sm:p-5 flex items-start gap-4 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span>¡ALERTA DE LÍMITE DE PÉRDIDA DIARIA ALCANZADO!</span>
            </h4>
            <p className="text-xs text-rose-600/90 dark:text-rose-400 mt-1 leading-relaxed">
              Has alcanzado tu límite de stop diario en{" "}
              <strong>{dailyLossBreached.map((a) => a.alias).join(", ")}</strong>. Para
              proteger tu cuenta y evitar el bloqueo automático del broker, detén tu operativa por hoy.
            </p>
          </div>
        </div>
      )}

      {criticalAccounts.length > 0 && dailyLossBreached.length === 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-500/10 dark:bg-amber-950/40 p-4 sm:p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
              Precaución: Colchón de Drawdown Crítico
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
              La cuenta <strong>{criticalAccounts[0].alias}</strong> está a solo{" "}
              <span className="font-mono font-bold underline">
                ${criticalAccounts[0].distanciaDrawdown.toFixed(2)}
              </span>{" "}
              de su nivel de liquidación. Reduce el número de contratos o arriesga menos de 0.25R.
            </p>
          </div>
        </div>
      )}

      {/* ─── 2. TERMÓMETROS DE DRAWDOWN MULTI-CUENTA (GRID) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span>Termómetros de Trailing Drawdown en Tiempo Real</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Supervisión continua del colchón restante antes del nivel de liquidación
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {activeAccounts.length} {activeAccounts.length === 1 ? "cuenta activa" : "cuentas activas"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricsList.map((m) => {
            const isCritical = m.riskLevel === "critical" || m.riskLevel === "liquidated";
            const isWarning = m.riskLevel === "warning";
            const isSafe = m.riskLevel === "safe";

            const isSelected = currentAccountMetrics?.accountId === m.accountId;

            return (
              <div
                key={m.accountId}
                onClick={() => onSelectAccount && onSelectAccount(m.accountId)}
                className={`rounded-2xl border p-5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-500/80 dark:border-emerald-500/80 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {m.alias}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            m.tipo === "fondeada"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {m.accountId}
                      </div>
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1 ${
                        isCritical
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isCritical ? (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Peligro</span>
                        </>
                      ) : isWarning ? (
                        <>
                          <Info className="h-3.5 w-3.5" />
                          <span>Atención</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Segura</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Saldo y PnL del Día */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Saldo Actual
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                        ${m.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        PnL Hoy
                      </div>
                      <div
                        className={`text-base font-bold font-mono ${
                          m.pnlDia >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {m.pnlDia >= 0 ? "+" : ""}${m.pnlDia.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Termómetro de Colchón */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span>Colchón Restante:</span>
                        <span
                          className={`font-mono font-bold ${
                            isCritical
                              ? "text-rose-500"
                              : isWarning
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }`}
                        >
                          ${m.distanciaDrawdown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {m.distanciaDrawdownPct.toFixed(0)}% del buffer
                      </span>
                    </div>

                    {/* Barra visual de Drawdown */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical
                            ? "bg-rose-500 shadow-sm shadow-rose-500/50"
                            : isWarning
                            ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                            : "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                        }`}
                        style={{ width: `${Math.max(4, m.distanciaDrawdownPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Liquidación: ${m.nivelLiquidacion.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      <span>Drawdown Máx: ${m.drawdownMax.toLocaleString("en-US")}</span>
                    </div>
                  </div>
                </div>

                {/* Footer de la tarjeta con meta o payout */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {m.tipo === "fondeada" ? (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Unlock className="h-3.5 w-3.5 text-purple-500" />
                      <span>Retirable:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        ${m.payout.withdrawableAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Target className="h-3.5 w-3.5 text-blue-500" />
                      <span>Meta Pase:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {m.evaluation.progressPct.toFixed(0)}%
                      </span>
                    </div>
                  )}

                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5 hover:underline">
                    Ver análisis
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. ANÁLISIS DETALLADO DE LA CUENTA SELECCIONADA ─── */}
      {currentAccountMetrics && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Auditoría de Reglas: {currentAccountMetrics.alias}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {currentAccountMetrics.accountId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluación técnica de cumplimiento de reglas de fondeo (Consistencia, Pérdida Diaria y Retiros)
              </p>
            </div>

            {/* Selector rápido si hay varias cuentas */}
            {activeAccounts.length > 1 && onSelectAccount && (
              <select
                value={currentAccountMetrics.accountId}
                onChange={(e) => onSelectAccount(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alias || a.nombre || a.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3.1 MONITOR DE REGLA DE CONSISTENCIA */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Regla de Consistencia ({currentAccountMetrics.consistency.thresholdPct}%)
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Ningún día debe superar el {currentAccountMetrics.consistency.thresholdPct}% de las ganancias totales
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    currentAccountMetrics.consistency.isConsistent
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {currentAccountMetrics.consistency.isConsistent
                    ? "✓ Consistente"
                    : "⚠️ Requiere dilución"}
                </span>
              </div>

              {/* Barra de progreso de Consistencia */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Peso del Mejor Día:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {currentAccountMetrics.consistency.consistencyPct.toFixed(1)}% / Máx {currentAccountMetrics.consistency.thresholdPct}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      currentAccountMetrics.consistency.isConsistent
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (currentAccountMetrics.consistency.consistencyPct / currentAccountMetrics.consistency.thresholdPct) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Estadísticas de consistencia */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Mejor Día ({currentAccountMetrics.consistency.bestDayDate || "--"})
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-500 mt-0.5">
                    +${currentAccountMetrics.consistency.bestDayProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Ganancia Total Acumulada
                  </div>
                  <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    ${currentAccountMetrics.consistency.totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Consejo si no es consistente */}
              {!currentAccountMetrics.consistency.isConsistent && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Acción requerida:</strong> Tu mejor día representa el{" "}
                  {currentAccountMetrics.consistency.consistencyPct.toFixed(1)}% del profit total.
                  Necesitas generar aproximadamente{" "}
                  <strong className="underline">
                    +${currentAccountMetrics.consistency.additionalProfitNeeded.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </strong>{" "}
                  en otros días de operativa para reducir el porcentaje por debajo del{" "}
                  {currentAccountMetrics.consistency.thresholdPct}% y cumplir el requisito de retiro.
                </div>
              )}
            </div>

            {/* 3.2 TRACKER DE RETIROS (PAYOUTS) O PROGRESO DE EVALUACIÓN */}
            {currentAccountMetrics.payout.isFunded ? (
              /* Fondeada: Reglas de Payout */
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Elegibilidad de Retiros (Payout Tracker)
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Apex Performance Account (PA)
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      currentAccountMetrics.payout.isEligible
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {currentAccountMetrics.payout.isEligible
                      ? "✓ Elegible para Payout"
                      : "En Acumulación"}
                  </span>
                </div>

                {/* Métricas clave de payout */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Monto Retirable Disponible
                    </div>
                    <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                      ${currentAccountMetrics.payout.withdrawableAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Por encima del colchón de seguridad
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Días Operados
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {currentAccountMetrics.payout.activeTradingDays} / {currentAccountMetrics.payout.requiredTradingDays}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {currentAccountMetrics.payout.profitableDays} días con &gt;$100 profit
                    </div>
                  </div>
                </div>

                {/* Checklist de requisitos para retirar */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {currentAccountMetrics.payout.withdrawableAmount > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">
                      Saldo supera el umbral de seguridad (\$
                      {currentAccountMetrics.payout.safetyThreshold.toLocaleString("en-US")})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentAccountMetrics.payout.activeTradingDays >= currentAccountMetrics.payout.requiredTradingDays ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">
                      Completados {currentAccountMetrics.payout.requiredTradingDays} días de trading (Faltan:{" "}
                      {Math.max(0, currentAccountMetrics.payout.requiredTradingDays - currentAccountMetrics.payout.activeTradingDays)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentAccountMetrics.consistency.isConsistent ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">
                      Cumple regla de consistencia del 30%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Evaluación: Meta de Aprobación */
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Meta de Aprobación de Evaluación
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Objetivo: +${currentAccountMetrics.evaluation.profitTarget.toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      currentAccountMetrics.evaluation.isTargetReached
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {currentAccountMetrics.evaluation.isTargetReached
                      ? "✓ ¡PRUEBA SUPERADA!"
                      : `${currentAccountMetrics.evaluation.progressPct.toFixed(1)}% completado`}
                  </span>
                </div>

                {/* Barra de progreso hacia la meta */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Progreso de Ganancia:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ${currentAccountMetrics.evaluation.currentProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })} / ${currentAccountMetrics.evaluation.profitTarget.toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${currentAccountMetrics.evaluation.progressPct}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Beneficio Restante
                    </div>
                    <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      ${currentAccountMetrics.evaluation.remainingToTarget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Días Operados
                    </div>
                    <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {currentAccountMetrics.payout.activeTradingDays} días
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
