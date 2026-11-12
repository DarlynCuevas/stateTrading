"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { KpiCards } from "@/components/kpi-cards";
import { PerformanceCharts } from "@/components/performance-charts";
import { TradesTable } from "@/components/trades-table";
import { ProfitCalendar } from "@/components/profit-calendar";
import { AuthForm } from "@/components/auth-form";
import { OvertradingAnalysis } from "@/components/overtrading-analysis";
import { PeriodReview } from "@/components/period-review";
import { ParsedTrade, AccountStats } from "@/lib/types";
import {
  calculateAccountStats,
  generateEquityCurve,
  generateDailyDistribution,
  generateSymbolPerformance,
  generatePnlDistribution,
  generateHourlyPerformance,
} from "@/lib/core-logic";
import { getAuditData, Operation, Account } from "@/lib/operations";
import { getTeamMembers, loadUserDataFromSupabase, syncLocalStateToSupabase, UserProfile } from "@/lib/team-sync";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  CalendarDays,
  LogOut,
  Loader2,
  Wallet,
  Users,
  CloudUpload,
  RefreshCw,
  KeyRound,
  Download,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { SyncDesktopModal } from "@/components/sync-desktop-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { AccountsManager } from "@/components/accounts-manager";

// ─── Convierte una Operation del JSON a ParsedTrade para los gráficos/stats ───
function operationToParsedTrade(op: Operation): ParsedTrade {
  const openMs = op.openTime ? new Date(op.openTime).getTime() : Date.now();
  const closeMs = op.closeTime ? new Date(op.closeTime).getTime() : openMs;
  const holdingTimeMinutes = Math.max(0, Math.round((closeMs - openMs) / 60000));

  const netPnl = typeof op.netPnl === "number" ? op.netPnl : typeof op.pnl === "number" ? op.pnl : 0;
  const pnl = typeof op.pnl === "number" ? op.pnl : netPnl;

  return {
    id: op.id,
    symbol: op.symbol || "UNKNOWN",
    type: op.type || "COMPRA",
    openTime: op.openTime || new Date().toISOString(),
    closeTime: op.closeTime || undefined,
    entryPrice: typeof op.entryPrice === "number" ? op.entryPrice : 0,
    exitPrice: typeof op.exitPrice === "number" ? op.exitPrice : 0,
    pnl: pnl,
    commission: typeof op.commission === "number" ? op.commission : 0,
    netPnl: netPnl,
    quantity: typeof op.quantity === "number" ? op.quantity : 1,
    holdingTimeMinutes,
  };
}

// ─── Helper: semana ISO ─────────────────────────────────────────────
function getWeekRange() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { now, weekAgo };
}

export default function Home() {
  // ─── Auth state ───────────────────────────────────────────────────
  const [user, setUser] = React.useState<User | null>(null);
  const [authChecking, setAuthChecking] = React.useState(true);
  const supabase = React.useMemo(() => createClient(), []);

  // ─── Team & User Multi-profile state ──────────────────────────────
  const [teamMembers, setTeamMembers] = React.useState<UserProfile[]>([]);
  const [selectedTraderId, setSelectedTraderId] = React.useState<string>("me");
  const [syncing, setSyncing] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<string | null>(null);
  const [syncingTV, setSyncingTV] = React.useState(false);
  const [showSyncModal, setShowSyncModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);

  const handleRefreshData = async () => {
    if (!user?.id) return;
    setSyncingTV(true);
    setSyncStatus("Actualizando...");
    try {
      const refreshed = await loadUserDataFromSupabase(user.id);
      setAuditData(refreshed);
      setSyncStatus("✓ Datos actualizados");
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncingTV(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleSyncTradingViewDesktop = async () => {
    setSyncingTV(true);
    setSyncStatus(null);
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      if (isLocal) {
        try {
          const res = await fetch("/api/tradingview/sync", { method: "POST" });
          const data = await res.json();
          if (data && data.message) {
            setSyncStatus(data.message);
          }
        } catch {
          // Si falla en local, continúa refrescando desde Supabase
        }
      }

      if (user?.id) {
        const refreshed = await loadUserDataFromSupabase(user.id);
        setAuditData(refreshed);
        const opsCount = refreshed.operations.length;
        const accCount = refreshed.accounts.length;
        setSyncStatus(`✓ Sincronizado: ${accCount} cuentas y ${opsCount} trades`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncingTV(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // ─── Audit data: leemos DIRECTAMENTE desde Supabase ───────────────
  const [auditData, setAuditData] = React.useState<{
    accounts: Account[];
    operations: Operation[];
    accountIds: string[];
    byAccount: Record<string, Operation[]>;
    accountMap: Record<string, Account>;
  }>({
    accounts: [],
    operations: [],
    accountIds: [],
    byAccount: {},
    accountMap: {},
  });
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Al abrir la app y detectar usuario logueado:
  // 1. Sincroniza automáticamente el archivo JSON a Supabase
  // 2. Carga los datos finales leyendo DIRECTAMENTE desde Supabase
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function initAndSync() {
      setIsLoadingData(true);
      try {
        // Cargar los miembros del equipo
        const members = await getTeamMembers();
        if (!cancelled) setTeamMembers(members);

        // Leer datos directamente de la base de datos de Supabase
        const targetUserId = selectedTraderId === "me" ? user?.id : selectedTraderId;
        const dbData = await loadUserDataFromSupabase(targetUserId);

        if (!cancelled) {
          setAuditData(dbData);
        }
      } catch (err) {
        console.error("Error al sincronizar y cargar desde Supabase:", err);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }

    initAndSync();

    return () => {
      cancelled = true;
    };
  }, [user, selectedTraderId]);

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const res = await syncLocalStateToSupabase();
    setSyncing(false);
    setSyncStatus(res.message);
    if (res.success && user?.id) {
      const refreshed = await loadUserDataFromSupabase(user.id);
      setAuditData(refreshed);
      getTeamMembers().then((members) => setTeamMembers(members));
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // ─── Cuenta seleccionada (por defecto "active" = solo cuentas vivas) ──
  const [selectedAccount, setSelectedAccount] = React.useState<string>("active");

  // Cuentas activas vs inactivas (quemadas o canceladas)
  const isAccountBurned = React.useCallback((a: Account) => {
    if (a.activa === false || a.estado === "quemada" || a.estado === "cancelada") {
      return true;
    }
    // Auto-detectar si el saldo o colchón de drawdown ha perforado el límite de liquidación
    if (a.distanciaDrawdown != null && a.distanciaDrawdown <= 0) {
      return true;
    }
    if (a.nivelLiquidacion != null && a.balance != null && a.balance > 0 && a.balance <= a.nivelLiquidacion) {
      return true;
    }
    return false;
  }, []);

  const activeAccounts = React.useMemo(() => {
    return auditData.accounts.filter((a) => !isAccountBurned(a));
  }, [auditData.accounts, isAccountBurned]);

  const activeAccountIds = React.useMemo(() => {
    return activeAccounts.map((a) => a.id);
  }, [activeAccounts]);

  const inactiveAccounts = React.useMemo(() => {
    return auditData.accounts.filter((a) => isAccountBurned(a));
  }, [auditData.accounts, isAccountBurned]);

  // Operaciones filtradas según la cuenta seleccionada
  const filteredOps: Operation[] = React.useMemo(() => {
    if (selectedAccount === "active") {
      // SOLO operaciones de cuentas vivas (no suma cuentas quemadas/canceladas)
      return auditData.operations.filter(
        (op) => !op.cuentaId || activeAccountIds.includes(op.cuentaId)
      );
    }
    if (selectedAccount === "all") {
      // Todas las operaciones (incluyendo cuentas quemadas/archivadas)
      return auditData.operations;
    }
    return auditData.byAccount[selectedAccount] ?? [];
  }, [auditData, selectedAccount, activeAccountIds]);

  // Balance real e inicial de la cuenta seleccionada
  const { realBalance, realInitialBalance } = React.useMemo(() => {
    if (selectedAccount === "active") {
      // Suma SOLO de cuentas vivas / activas
      const totalBalance = activeAccounts.reduce(
        (sum, a) => sum + (a.balance || 0),
        0
      );
      const totalInitial = activeAccounts.reduce(
        (sum, a) => sum + (a.balanceInicial || 0),
        0
      );
      return { realBalance: totalBalance, realInitialBalance: totalInitial };
    }
    if (selectedAccount === "all") {
      // Suma histórica de todas las cuentas
      const totalBalance = auditData.accounts.reduce(
        (sum, a) => sum + (a.balance || 0),
        0,
      );
      const totalInitial = auditData.accounts.reduce(
        (sum, a) => sum + (a.balanceInicial || 0),
        0,
      );
      return { realBalance: totalBalance, realInitialBalance: totalInitial };
    }
    const cuenta = auditData.accountMap[selectedAccount];
    return {
      realBalance: cuenta?.balance ?? 0,
      realInitialBalance: cuenta?.balanceInicial ?? 0,
    };
  }, [auditData, selectedAccount, activeAccounts]);

  // ─── Convertir a ParsedTrade para gráficos / KPIs ─────────────────
  const parsedTrades: ParsedTrade[] = React.useMemo(
    () => filteredOps.map(operationToParsedTrade),
    [filteredOps],
  );

  // ─── Balance inicial configurable ─────────────────────────────────
  const [initialBalance, setInitialBalance] = React.useState<number>(50000);

  // ─── Tab activo ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<
    "dashboard" | "review" | "calendar" | "table" | "accounts"
  >("dashboard");

  // ─── Verificar sesión al montar + escuchar cambios ────────────────
  React.useEffect(() => {
    // Si la URL contiene parámetros de recuperación de contraseña o código de auth
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (
        hash.includes("type=recovery") ||
        search.includes("type=recovery") ||
        search.includes("code=")
      ) {
        window.location.replace(`/reset-password${search}${hash}`);
        return;
      }
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        if (typeof window !== "undefined") {
          window.location.replace("/reset-password");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // ─── Logout ───────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ─── Cálculos estadísticos ────────────────────────────────────────
  const stats: AccountStats = React.useMemo(() => {
    const base = calculateAccountStats(parsedTrades, realInitialBalance);
    // Sobreescribimos currentBalance con el balance real del JSON
    return { ...base, currentBalance: realBalance, initialBalance: realInitialBalance };
  }, [parsedTrades, realBalance, realInitialBalance]);

  const equityData = React.useMemo(
    () => generateEquityCurve(parsedTrades, realInitialBalance),
    [parsedTrades, realInitialBalance],
  );

  const dailyData = React.useMemo(
    () => generateDailyDistribution(parsedTrades),
    [parsedTrades],
  );

  const symbolData = React.useMemo(
    () => generateSymbolPerformance(parsedTrades),
    [parsedTrades],
  );

  const pnlDistribution = React.useMemo(
    () => generatePnlDistribution(parsedTrades),
    [parsedTrades],
  );

  const hourlyData = React.useMemo(
    () => generateHourlyPerformance(parsedTrades),
    [parsedTrades],
  );

  // ─── Resumen semanal ──────────────────────────────────────────────
  const weekSummary = React.useMemo(() => {
    const { weekAgo } = getWeekRange();
    let total = 0;
    const byAccount: Record<string, number> = {};

    filteredOps.forEach((op) => {
      const timeStr = op.closeTime || op.openTime;
      if (!timeStr) return;
      const close = new Date(timeStr);
      if (close >= weekAgo) {
        total += op.netPnl ?? 0;
        const cId = op.cuentaId || "sin_asignar";
        byAccount[cId] = (byAccount[cId] ?? 0) + (op.netPnl ?? 0);
      }
    });

    return { total, byAccount };
  }, [filteredOps]);

  // ─── Auth loading ─────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Verificando sesión...
          </span>
        </div>
      </div>
    );
  }

  // ─── Auth gate ────────────────────────────────────────────────────
  if (!user) {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (hash.includes("type=recovery") || search.includes("type=recovery") || search.includes("code=")) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Redirigiendo a restablecer contraseña...
              </span>
            </div>
          </div>
        );
      }
    }

    return (
      <AuthForm
        onAuthenticated={() =>
          supabase.auth
            .getUser()
            .then(({ data: { user: u } }) => setUser(u))
        }
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col justify-between shrink-0 transition-colors">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-sm">
                State<span className="text-emerald-500">Trading</span>
              </span>
            </div>
          </div>

          {/* Selector de cuenta */}
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              Cuenta
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="active">🟢 Cuentas Activas ({activeAccounts.length})</option>
              <option value="all">📋 Todas (Histórico Global)</option>
              {activeAccounts.length > 0 && (
                <optgroup label="── Cuentas Activas ──">
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      · {a.nombre || a.alias || a.id}
                    </option>
                  ))}
                </optgroup>
              )}
              {inactiveAccounts.length > 0 && (
                <optgroup label="── Archivadas / Quemadas ──">
                  {inactiveAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.estado === "cancelada" ? "🚫" : "🔥"} {a.nombre || a.alias || a.id} ({a.estado || "quemada"})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              {filteredOps.length} operaciones
            </div>
          </div>

          {/* Resumen semanal por cuenta (en sidebar) */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Esta semana
            </div>
            <div
              className={`text-lg font-bold font-mono ${weekSummary.total >= 0 ? "text-emerald-500" : "text-rose-500"}`}
            >
              {weekSummary.total >= 0 ? "+" : ""}
              {weekSummary.total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                style: "currency",
                currency: "USD",
              })}
            </div>
            {/* Desglose por cuenta si es "all" */}
            {selectedAccount === "all" &&
              Object.entries(weekSummary.byAccount).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(weekSummary.byAccount).map(
                    ([acc, pnl]) => (
                      <div
                        key={acc}
                        className="flex justify-between items-center text-[10px]"
                      >
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                          {auditData.accountMap[acc]?.nombre ?? acc}
                        </span>
                        <span
                          className={`font-mono font-semibold ${pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {pnl.toFixed(2)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {(
              [
                {
                  id: "dashboard",
                  label: "Dashboard & KPIs",
                  Icon: LayoutDashboard,
                  color: "text-emerald-500",
                },
                {
                  id: "review",
                  label: "Resumen Semanal & Mensual",
                  Icon: TrendingUp,
                  color: "text-emerald-500",
                },
                {
                  id: "calendar",
                  label: "Profit Calendar",
                  Icon: CalendarDays,
                  color: "text-amber-500",
                },
                {
                  id: "table",
                  label: "Diario de Operaciones",
                  Icon: FileSpreadsheet,
                  color: "text-emerald-500",
                },
                {
                  id: "accounts",
                  label: "Historial de Cuentas",
                  Icon: ShieldAlert,
                  color: "text-rose-500",
                },
              ] as const
            ).map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === id
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${activeTab === id ? color : "text-slate-400"}`}
                />
                <span>{label}</span>
                {id === "table" && parsedTrades.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {parsedTrades.length}
                  </span>
                )}
                {id === "accounts" && inactiveAccounts.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    {inactiveAccounts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {/* Capital real de la cuenta */}
          <div className="px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-emerald-500" />
                Balance Real
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {realBalance.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Inicial:{" "}
              {realInitialBalance.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              })}
            </div>
          </div>

          {/* Usuario + contraseña + logout */}
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div
              className="text-[11px] text-slate-500 dark:text-slate-400 truncate"
              title={user.email}
            >
              {user.email}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                title="Cambiar contraseña de tu cuenta"
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <KeyRound className="h-3 w-3 text-emerald-500" />
                <span>Contraseña</span>
              </button>
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="flex items-center justify-center p-1.5 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2 mr-2">
              <div className="h-7 w-7 rounded-md bg-emerald-500 flex items-center justify-center text-white">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>StateTrading</span>
              <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                Trading Journal
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Trader del Equipo */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
              <select
                value={selectedTraderId}
                onChange={(e) => {
                  setSelectedTraderId(e.target.value);
                  setSelectedAccount("all");
                }}
                className="text-xs bg-transparent text-slate-800 dark:text-slate-200 pr-2 py-1 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="me">👤 Mi Perfil</option>
                {teamMembers
                  .filter((m) => m.id !== user.id)
                  .map((trader) => (
                    <option key={trader.id} value={trader.id}>
                      👨‍💻 {trader.nombre || trader.email}
                    </option>
                  ))}
              </select>
            </div>

            {/* Botones de Sincronización y Descarga */}
            {selectedTraderId === "me" && (
              <div className="flex items-center gap-2">
                {/* 1. Botón para sincronizar en vivo cuando el archivo ya está abierto */}
                <button
                  onClick={handleSyncTradingViewDesktop}
                  disabled={syncingTV}
                  title="Sincronizar y actualizar las órdenes en vivo (cuando el sincronizador ya está abierto en tu ordenador)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm shadow-emerald-500/20 disabled:opacity-60"
                >
                  {syncingTV ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  <span>{syncingTV ? "Actualizando..." : "Sincronizar TradingView"}</span>
                </button>

                {/* 2. Botón para usuarios primerizos que necesitan descargar el archivo */}
                <button
                  onClick={() => setShowSyncModal(true)}
                  title="Descargar el sincronizador de 1 clic para tu ordenador (Windows o Mac)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Descargar Archivo</span>
                  <span className="sm:hidden">Descargar</span>
                </button>
              </div>
            )}

            {syncStatus && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {syncStatus}
              </span>
            )}

            <SyncDesktopModal
              isOpen={showSyncModal}
              onClose={() => setShowSyncModal(false)}
              onRefresh={handleRefreshData}
              refreshing={syncingTV}
            />

            <ChangePasswordModal
              isOpen={showChangePasswordModal}
              onClose={() => setShowChangePasswordModal(false)}
              userEmail={user?.email}
            />

            {/* Selector móvil de cuenta */}
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="md:hidden text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">🟢 Activas ({activeAccounts.length})</option>
              <option value="all">📋 Todas (Histórico)</option>
              {activeAccounts.length > 0 && (
                <optgroup label="── Activas ──">
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      · {a.nombre || a.alias || a.id}
                    </option>
                  ))}
                </optgroup>
              )}
              {inactiveAccounts.length > 0 && (
                <optgroup label="── Quemadas / Canceladas ──">
                  {inactiveAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.estado === "cancelada" ? "🚫" : "🔥"} {a.nombre || a.alias || a.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ThemeToggle />
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cambiar Contraseña"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">

          {/* Mobile tabs */}
          <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 pb-2 gap-4 text-xs font-semibold overflow-x-auto">
            {(["dashboard", "review", "calendar", "table", "accounts"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 border-b-2 whitespace-nowrap transition-colors capitalize ${
                    activeTab === tab
                      ? "border-emerald-500 text-emerald-500"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {tab === "review"
                    ? "Resumen"
                    : tab === "table"
                      ? `Diario (${parsedTrades.length})`
                      : tab === "accounts"
                        ? `Cuentas (${inactiveAccounts.length})`
                        : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>

          {/* ─── TAB: DASHBOARD ─── */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fadeIn">

              {/* KPI Cards */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                      1
                    </span>
                    <span>Métricas Clave de Rendimiento (KPIs)</span>
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                    {selectedAccount === "all"
                      ? "Todas las cuentas"
                      : selectedAccount}{" "}
                    · {parsedTrades.length} ops
                  </span>
                </div>
                <KpiCards stats={stats} />
              </section>

              {/* Resumen semanal por cuenta */}
              {selectedAccount === "all" && auditData.accounts.length > 1 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold">
                      ★
                    </span>
                    <span>Resumen Esta Semana por Cuenta</span>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {auditData.accounts.map((cuenta) => {
                      const pnl = weekSummary.byAccount[cuenta.id] ?? 0;
                      return (
                        <button
                          key={cuenta.id}
                          onClick={() => setSelectedAccount(cuenta.id)}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm text-left hover:border-emerald-400 transition-all"
                        >
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mb-1">
                            {cuenta.nombre ?? cuenta.id}
                          </div>
                          <div
                            className={`text-lg font-bold font-mono ${pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                          >
                            {pnl >= 0 ? "+" : ""}
                            {pnl.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                              style: "currency",
                              currency: "USD",
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Balance: {cuenta.balance.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Period Review */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                      2
                    </span>
                    <span>Resumen Semanal & Mensual</span>
                  </h2>
                  <button
                    onClick={() => setActiveTab("review")}
                    className="text-xs font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Pantalla completa</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <PeriodReview trades={parsedTrades} />
              </section>

              {/* Overtrading */}
              <section className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold">
                    3
                  </span>
                  <span>Detección de Sobreoperativa & Holding Time</span>
                </h2>
                <OvertradingAnalysis trades={parsedTrades} />
              </section>

              {/* Profit Calendar */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold">
                      4
                    </span>
                    <span>Profit Calendar</span>
                  </h2>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className="text-xs font-medium text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Vista completa</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <ProfitCalendar trades={parsedTrades} />
              </section>

              {/* Charts */}
              <section className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
                    5
                  </span>
                  <span>Visualización Gráfica y Tendencias</span>
                </h2>
                <PerformanceCharts
                  equityData={equityData}
                  dailyData={dailyData}
                  symbolData={symbolData}
                  pnlDistribution={pnlDistribution}
                  hourlyData={hourlyData}
                  initialBalance={realInitialBalance}
                />
              </section>

              {/* Recent trades */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 text-xs font-bold">
                      6
                    </span>
                    <span>Últimas Operaciones Registradas</span>
                  </h2>
                  <button
                    onClick={() => setActiveTab("table")}
                    className="text-xs font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Ver todas ({parsedTrades.length})</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <TradesTable trades={parsedTrades.slice(0, 5)} />
              </section>
            </div>
          )}

          {/* ─── TAB: REVIEW ─── */}
          {activeTab === "review" && (
            <section className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Resumen Semanal & Mensual
                </h2>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Volver a Dashboard
                </button>
              </div>
              <PeriodReview trades={parsedTrades} />
            </section>
          )}

          {/* ─── TAB: CALENDAR ─── */}
          {activeTab === "calendar" && (
            <section className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Profit Calendar
                </h2>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Volver a Dashboard
                </button>
              </div>
              <ProfitCalendar trades={parsedTrades} />
            </section>
          )}

          {/* ─── TAB: TABLE ─── */}
          {activeTab === "table" && (
            <section className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Diario Cronológico de Operaciones
                </h2>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Volver a Dashboard
                </button>
              </div>
              <TradesTable trades={parsedTrades} />
            </section>
          )}

          {/* ─── TAB: ACCOUNTS ─── */}
          {activeTab === "accounts" && (
            <section className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-500" />
                    <span>Historial & Gestión de Cuentas</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Gestiona cuentas activas, audita cuentas quemadas o canceladas y aísla sus balances del dashboard.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Volver a Dashboard
                </button>
              </div>
              <AccountsManager
                accounts={auditData.accounts}
                operations={auditData.operations}
                userId={user.id}
                onAccountStatusChanged={async () => {
                  const refreshed = await loadUserDataFromSupabase(user.id);
                  setAuditData(refreshed);
                }}
              />
            </section>
          )}
        </main>
      </div>


    </div>
  );
}
