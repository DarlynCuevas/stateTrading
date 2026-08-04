"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CsvUploader } from "@/components/csv-uploader";
import { KpiCards } from "@/components/kpi-cards";
import { PerformanceCharts } from "@/components/performance-charts";
import { TradesTable } from "@/components/trades-table";
import { ProfitCalendar } from "@/components/profit-calendar";
import { AuthForm } from "@/components/auth-form";
import { OvertradingAnalysis } from "@/components/overtrading-analysis";
import { PeriodReview } from "@/components/period-review";
import { RawTradingViewRow, ParsedTrade, AccountStats } from "@/lib/types";
import {
  parseTradingViewCsv,
  calculateAccountStats,
  generateEquityCurve,
  generateDailyDistribution,
  generateSymbolPerformance,
  generatePnlDistribution,
  generateHourlyPerformance,
} from "@/lib/core-logic";
import {
  saveTradeData,
  loadTradeData,
  clearTradeData,
} from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  Info,
  ArrowRight,
  CalendarDays,
  LogOut,
  Loader2,
} from "lucide-react";

// Datos de prueba: simulación semanal cuenta de fondeo $50k (Tradovate PDF)
const SAMPLE_TRADES_RAW: RawTradingViewRow[] = [
  {
    symbol: "MGCZ6",
    _priceFormat: "-1",
    _priceFormatType: "0",
    _tickSize: "0.1",
    buyFillId: "594472881977",
    sellFillId: "594472881948",
    qty: "1",
    buyPrice: "4113.2",
    sellPrice: "4113.2",
    pnl: "$0.00",
    boughtTimestamp: "08/03/2026 11:50:16",
    soldTimestamp: "08/03/2026 11:50:09",
    duration: "6sec"
  },
  {
    symbol: "MESU6",
    _priceFormat: "-2",
    _priceFormatType: "0",
    _tickSize: "0.25",
    buyFillId: "594472881990",
    sellFillId: "594472881895",
    qty: "1",
    buyPrice: "7567.25",
    sellPrice: "7559.00",
    pnl: "$(41.25)",
    boughtTimestamp: "08/03/2026 13:30:56",
    soldTimestamp: "08/03/2026 08:39:36",
    duration: "4h 51min 19sec"
  },
  {
    symbol: "MGCZ6",
    _priceFormat: "-1",
    _priceFormatType: "0",
    _tickSize: "0.1",
    buyFillId: "594472882093",
    sellFillId: "594472882002",
    qty: "1",
    buyPrice: "4094.8",
    sellPrice: "4115.3",
    pnl: "$205.00",
    boughtTimestamp: "08/03/2026 15:17:04",
    soldTimestamp: "08/03/2026 14:07:22",
    duration: "1h 9min 41sec"
  },
  {
    symbol: "MESU6",
    _priceFormat: "-2",
    _priceFormatType: "0",
    _tickSize: "0.25",
    buyFillId: "594472882173",
    sellFillId: "594472882057",
    qty: "1",
    buyPrice: "7562.50",
    sellPrice: "7562.50",
    pnl: "$0.00",
    boughtTimestamp: "08/03/2026 15:34:04",
    soldTimestamp: "08/03/2026 15:08:54",
    duration: "25min 10sec"
  },
  {
    symbol: "MESU6",
    _priceFormat: "-2",
    _priceFormatType: "0",
    _tickSize: "0.25",
    buyFillId: "594472882208",
    sellFillId: "594472882185",
    qty: "1",
    buyPrice: "7566.25",
    sellPrice: "7557.75",
    pnl: "$(42.50)",
    boughtTimestamp: "08/03/2026 15:35:44",
    soldTimestamp: "08/03/2026 15:34:53",
    duration: "50sec"
  },
  {
    symbol: "MESU6",
    _priceFormat: "-2",
    _priceFormatType: "0",
    _tickSize: "0.25",
    buyFillId: "594472882259",
    sellFillId: "594472882220",
    qty: "1",
    buyPrice: "7571.75",
    sellPrice: "7563.50",
    pnl: "$(41.25)",
    boughtTimestamp: "08/03/2026 15:45:06",
    soldTimestamp: "08/03/2026 15:42:15",
    duration: "2min 51sec"
  },
  {
    symbol: "MGCZ6",
    _priceFormat: "-1",
    _priceFormatType: "0",
    _tickSize: "0.1",
    buyFillId: "594472882276",
    sellFillId: "594472882102",
    qty: "1",
    buyPrice: "4090.4",
    sellPrice: "4091.9",
    pnl: "$15.00",
    boughtTimestamp: "08/03/2026 15:45:40",
    soldTimestamp: "08/03/2026 15:18:55",
    duration: "26min 44sec"
  },
  {
    symbol: "MGCZ6",
    _priceFormat: "-1",
    _priceFormatType: "0",
    _tickSize: "0.1",
    buyFillId: "594472882320",
    sellFillId: "594472882285",
    qty: "1",
    buyPrice: "4090.6",
    sellPrice: "4087.4",
    pnl: "$(32.00)",
    boughtTimestamp: "08/03/2026 16:02:34",
    soldTimestamp: "08/03/2026 15:59:04",
    duration: "3min 29sec"
  },
  {
    symbol: "MGCZ6",
    _priceFormat: "-1",
    _priceFormatType: "0",
    _tickSize: "0.1",
    buyFillId: "594472882379",
    sellFillId: "594472882332",
    qty: "2",
    buyPrice: "4092.4",
    sellPrice: "4092.4",
    pnl: "$0.00",
    boughtTimestamp: "08/03/2026 17:39:58",
    soldTimestamp: "08/03/2026 17:18:54",
    duration: "21min 3sec"
  }
];

export default function Home() {
  // ─── Auth state ───
  const [user, setUser] = React.useState<User | null>(null);
  const [authChecking, setAuthChecking] = React.useState(true);
  const supabase = React.useMemo(() => createClient(), []);

  // ─── Data state ───
  const [rawRows, setRawRows] = React.useState<RawTradingViewRow[]>([]);
  const [parsedTrades, setParsedTrades] = React.useState<ParsedTrade[]>([]);
  const [fileNames, setFileNames] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "review" | "calendar" | "table">("dashboard");
  const [dataSource, setDataSource] = React.useState<"none" | "supabase" | "csv" | "sample">("none");
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // ─── Verificar sesión al montar + escuchar cambios ───
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // ─── Auto-cargar datos desde Supabase cuando el usuario se autentica ───
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchData() {
      const persisted = await loadTradeData();
      if (cancelled) return;
      if (persisted && persisted.rawRows.length > 0) {
        setRawRows(persisted.rawRows);
        setFileNames(persisted.fileNames);
        setDataSource("supabase");
        setLastSaved(persisted.savedAt);
      }
      setIsHydrated(true);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  // Procesar datos cada vez que cambien los registros crudos
  React.useEffect(() => {
    if (rawRows.length > 0) {
      const trades = parseTradingViewCsv(rawRows);
      setParsedTrades(trades);
    } else {
      setParsedTrades([]);
    }
  }, [rawRows]);

  // ─── Auto-guardar en Supabase cada vez que cambien los datos ───
  React.useEffect(() => {
    if (!isHydrated || !user) return;
    if (rawRows.length > 0 && fileNames.length > 0) {
      setIsSaving(true);
      saveTradeData(rawRows, fileNames).then((success) => {
        if (success) {
          setLastSaved(new Date().toISOString());
        }
        setIsSaving(false);
      });
    }
  }, [rawRows, fileNames, isHydrated, user]);

  const handleDataLoaded = (
    rows: RawTradingViewRow[],
    _headers: string[],
    names: string[]
  ) => {
    setRawRows(rows);
    setFileNames(names);
    setDataSource("csv");
  };

  const handleReset = () => {
    setRawRows([]);
    setParsedTrades([]);
    setFileNames([]);
    setDataSource("none");
    setLastSaved(null);
    clearTradeData();
  };

  const loadSampleData = () => {
    setRawRows(SAMPLE_TRADES_RAW);
    setFileNames(["simulacion_semanal_50k.csv (Datos de prueba)"]);
    setDataSource("sample");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRawRows([]);
    setParsedTrades([]);
    setFileNames([]);
    setDataSource("none");
    setLastSaved(null);
    setIsHydrated(false);
    setUser(null);
  };

  // ─── Cálculos estadísticos y series para gráficos (SIEMPRE antes de retornos condicionales según Rules of Hooks) ───
  const stats: AccountStats = React.useMemo(() => {
    return calculateAccountStats(parsedTrades, 50000);
  }, [parsedTrades]);

  const equityData = React.useMemo(() => {
    return generateEquityCurve(parsedTrades, 50000);
  }, [parsedTrades]);

  const dailyData = React.useMemo(() => {
    return generateDailyDistribution(parsedTrades);
  }, [parsedTrades]);

  const symbolData = React.useMemo(() => {
    return generateSymbolPerformance(parsedTrades);
  }, [parsedTrades]);

  const pnlDistribution = React.useMemo(() => {
    return generatePnlDistribution(parsedTrades);
  }, [parsedTrades]);

  const hourlyData = React.useMemo(() => {
    return generateHourlyPerformance(parsedTrades);
  }, [parsedTrades]);

  // ─── Auth loading screen ───
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  // ─── Auth gate: show login if not authenticated ───
  if (!user) {
    return <AuthForm onAuthenticated={() => supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))} />;
  }

  const hasData = fileNames.length > 0 || parsedTrades.length > 0;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* ═══════════════ SIDEBAR ═══════════════ */}
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

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${activeTab === "dashboard" ? "text-emerald-500" : "text-slate-400"}`} />
              <span>Dashboard & KPIs</span>
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "review"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <TrendingUp className={`h-4 w-4 ${activeTab === "review" ? "text-emerald-500" : "text-slate-400"}`} />
              <span>Resumen Semanal & Mensual</span>
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "calendar"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <CalendarDays className={`h-4 w-4 ${activeTab === "calendar" ? "text-amber-500" : "text-slate-400"}`} />
              <span>Profit Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "table"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={`h-4 w-4 ${activeTab === "table" ? "text-emerald-500" : "text-slate-400"}`} />
                <span>Diario de Operaciones</span>
              </div>
              {parsedTrades.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {parsedTrades.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Auditoría Fondeo
              </span>
              <span className="text-slate-400 font-mono">Sim</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Capital Inicial:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">$50,000.00</span>
            </div>
          </div>

          {/* User info + Logout */}
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1.5" title={user.email}>
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
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
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Trading Journal</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando...
              </span>
            )}
            {!hasData && (
              <button
                onClick={loadSampleData}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Datos de prueba</span>
              </button>
            )}
            <ThemeToggle />
            {/* Mobile logout */}
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
          {/* ─── EMPTY STATE ─── */}
          {!hasData ? (
            <div className="space-y-8 animate-fadeIn">
              <div className="text-center max-w-2xl mx-auto py-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auditoría de Cuentas de Fondeo &bull; Tradovate
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
                  State<span className="text-emerald-500">Trading</span> Journal
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sube tu <strong>reporte de desempeño en PDF</strong> exportado desde Tradovate. El motor extraerá automáticamente tus operaciones, ganancias y calculará las comisiones reales.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={loadSampleData}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Cargar datos de prueba ($50k Simulación)</span>
                  </button>
                </div>
              </div>

              {/* Multi CSV Uploader */}
              <CsvUploader
                onDataLoaded={handleDataLoaded}
                onReset={handleReset}
                fileNames={fileNames.length > 0 ? fileNames : undefined}
                rowCount={rawRows.length}
                dataSource={dataSource}
                lastSaved={lastSaved}
              />

              {/* Info */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm mb-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>¿Cómo funciona la extracción de datos?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Tradovate exporta un reporte en PDF que incluye las métricas globales y el detalle de cada operación. StateTrading procesa este archivo para calcular tus estadísticas reales:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">1. Extracción de PnL Bruto</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Se extraen las ganancias y pérdidas brutas (Gross PnL) directamente de la tabla de operaciones.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">2. Cálculo de Comisiones</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Se detecta el total de comisiones y se prorratea equitativamente según la cantidad de contratos operados.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">3. PnL Neto Real</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Al restar la comisión a cada trade, obtenemos la rentabilidad neta exacta que ves en tu reporte de fondeo.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── DASHBOARD WITH DATA ─── */
            <div className="space-y-8 animate-fadeIn">
              {/* Compact uploader bar */}
              <CsvUploader
                onDataLoaded={handleDataLoaded}
                onReset={handleReset}
                fileNames={fileNames}
                rowCount={rawRows.length}
                dataSource={dataSource}
                lastSaved={lastSaved}
              />

              {/* Mobile tab selector */}
              <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 pb-2 gap-4 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`pb-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === "dashboard" ? "border-emerald-500 text-emerald-500" : "border-transparent text-slate-500"}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("review")}
                  className={`pb-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === "review" ? "border-emerald-500 text-emerald-500" : "border-transparent text-slate-500"}`}
                >
                  Resumen Sem/Mes
                </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`pb-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === "calendar" ? "border-amber-500 text-amber-500" : "border-transparent text-slate-500"}`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setActiveTab("table")}
                  className={`pb-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === "table" ? "border-emerald-500 text-emerald-500" : "border-transparent text-slate-500"}`}
                >
                  Diario ({parsedTrades.length})
                </button>
              </div>

              {/* ─── TAB: DASHBOARD ─── */}
              {activeTab === "dashboard" && (
                <>
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
                        Auditoría: <strong className="text-slate-700 dark:text-slate-200">${stats.initialBalance.toLocaleString()}</strong> inicial
                      </span>
                    </div>
                    <KpiCards stats={stats} />
                  </section>

                  {/* Resumen Semanal & Mensual (Comparativa Periodo a Periodo) */}
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                          2
                        </span>
                        <span>Resumen Semanal & Mensual (Comparativa Periodo a Periodo)</span>
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

                  {/* Overtrading & Holding Time Analysis */}
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold">
                          3
                        </span>
                        <span>Detección de Sobreoperativa & Holding Time (Overtrading Analysis)</span>
                      </h2>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
                          5
                        </span>
                        <span>Visualización Gráfica y Tendencias</span>
                      </h2>
                    </div>
                    <PerformanceCharts
                      equityData={equityData}
                      dailyData={dailyData}
                      symbolData={symbolData}
                      pnlDistribution={pnlDistribution}
                      hourlyData={hourlyData}
                    />
                  </section>

                  {/* Recent Trades preview */}
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
                </>
              )}

              {/* ─── TAB: REVIEW (Resumen Semanal & Mensual) ─── */}
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
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Volver a Dashboard
                    </button>
                  </div>
                  <TradesTable trades={parsedTrades} />
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
