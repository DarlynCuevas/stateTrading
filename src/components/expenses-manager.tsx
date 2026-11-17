"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ExpenseRecord,
  PayoutRecord,
  ExpenseCategory,
  FinanceSummary,
  CATEGORY_LABELS,
  POPULAR_FIRMS,
  fetchUserFinances,
  saveExpenseRecord,
  deleteExpenseRecord,
  savePayoutRecord,
  deletePayoutRecord,
  calculateFinanceSummary,
} from "@/lib/expenses";
import { Account } from "@/lib/operations";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Tag,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Receipt,
  X,
  CreditCard,
  PiggyBank,
  ShieldCheck,
  Flame,
} from "lucide-react";

interface ExpensesManagerProps {
  userId: string;
  accounts: Account[];
  readOnly?: boolean;
  traderName?: string;
}

export function ExpensesManager({
  userId,
  accounts,
  readOnly = false,
  traderName,
}: ExpensesManagerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [expenses, setExpenses] = React.useState<ExpenseRecord[]>([]);
  const [payouts, setPayouts] = React.useState<PayoutRecord[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [showPayoutModal, setShowPayoutModal] = React.useState(false);

  // Form states for Expense
  const [expFecha, setExpFecha] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [expEmpresa, setExpEmpresa] = React.useState(POPULAR_FIRMS[0]);
  const [expEmpresaCustom, setExpEmpresaCustom] = React.useState("");
  const [expTipo, setExpTipo] = React.useState<ExpenseCategory>("evaluacion");
  const [expCuentaId, setExpCuentaId] = React.useState("");
  const [expMonto, setExpMonto] = React.useState("");
  const [expNotas, setExpNotas] = React.useState("");

  // Form states for Payout
  const [payFecha, setPayFecha] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [payEmpresa, setPayEmpresa] = React.useState(POPULAR_FIRMS[0]);
  const [payEmpresaCustom, setPayEmpresaCustom] = React.useState("");
  const [payCuentaId, setPayCuentaId] = React.useState("");
  const [payMonto, setPayMonto] = React.useState("");
  const [payMetodo, setPayMetodo] = React.useState("Transferencia Bancaria");
  const [payNotas, setPayNotas] = React.useState("");

  // Filter states
  const [activeTab, setActiveTab] = React.useState<"all" | "expenses" | "payouts">("all");
  const [selectedFirmFilter, setSelectedFirmFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Cargar datos
  const loadData = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchUserFinances(userId);
      setExpenses(data.expenses);
      setPayouts(data.payouts);
    } catch (err) {
      console.error("Error loading finances:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos consolidados
  const summary: FinanceSummary = React.useMemo(() => {
    return calculateFinanceSummary(expenses, payouts);
  }, [expenses, payouts]);

  // Handler para crear Gasto
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const amountNum = parseFloat(expMonto);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    const firm = expEmpresa === "Otra" ? expEmpresaCustom.trim() || "Otra" : expEmpresa;
    const matchingAccount = accounts.find((a) => a.id === expCuentaId);

    const saved = await saveExpenseRecord({
      userId,
      fecha: expFecha,
      empresa: firm,
      tipo: expTipo,
      cuentaId: expCuentaId || undefined,
      cuentaAlias: matchingAccount ? matchingAccount.alias || matchingAccount.nombre : undefined,
      monto: amountNum,
      notas: expNotas.trim() || undefined,
    });

    setExpenses((prev) => [saved, ...prev]);
    setShowExpenseModal(false);
    setExpMonto("");
    setExpNotas("");
    setExpCuentaId("");
  };

  // Handler para crear Payout
  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const amountNum = parseFloat(payMonto);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    const firm = payEmpresa === "Otra" ? payEmpresaCustom.trim() || "Otra" : payEmpresa;
    const matchingAccount = accounts.find((a) => a.id === payCuentaId);

    const saved = await savePayoutRecord({
      userId,
      fecha: payFecha,
      empresa: firm,
      cuentaId: payCuentaId || undefined,
      cuentaAlias: matchingAccount ? matchingAccount.alias || matchingAccount.nombre : undefined,
      monto: amountNum,
      metodo: payMetodo.trim() || undefined,
      notas: payNotas.trim() || undefined,
    });

    setPayouts((prev) => [saved, ...prev]);
    setShowPayoutModal(false);
    setPayMonto("");
    setPayNotas("");
    setPayCuentaId("");
  };

  // Handler eliminar Gasto
  const handleDeleteExpense = async (id: string) => {
    if (readOnly) return;
    if (!window.confirm("¿Seguro que deseas eliminar este registro de gasto?")) return;
    await deleteExpenseRecord(userId, id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Handler eliminar Payout
  const handleDeletePayout = async (id: string) => {
    if (readOnly) return;
    if (!window.confirm("¿Seguro que deseas eliminar este registro de cobro / payout?")) return;
    await deletePayoutRecord(userId, id);
    setPayouts((prev) => prev.filter((p) => p.id !== id));
  };

  // Lista combinada para la tabla unificada
  type UnifiedItem = {
    id: string;
    itemType: "expense" | "payout";
    fecha: string;
    empresa: string;
    tipoLabel: string;
    monto: number;
    cuentaAlias?: string;
    notas?: string;
  };

  const unifiedList: UnifiedItem[] = React.useMemo(() => {
    const list: UnifiedItem[] = [];

    if (activeTab === "all" || activeTab === "expenses") {
      expenses.forEach((e) => {
        list.push({
          id: e.id,
          itemType: "expense",
          fecha: e.fecha,
          empresa: e.empresa || "Sin Empresa",
          tipoLabel: CATEGORY_LABELS[e.tipo] || e.tipo,
          monto: e.monto,
          cuentaAlias: e.cuentaAlias,
          notas: e.notas,
        });
      });
    }

    if (activeTab === "all" || activeTab === "payouts") {
      payouts.forEach((p) => {
        list.push({
          id: p.id,
          itemType: "payout",
          fecha: p.fecha,
          empresa: p.empresa || "Sin Empresa",
          tipoLabel: p.metodo ? `Cobro (${p.metodo})` : "Retiro / Payout",
          monto: p.monto,
          cuentaAlias: p.cuentaAlias,
          notas: p.notas,
        });
      });
    }

    // Ordenar de más reciente a más antiguo
    list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return list.filter((item) => {
      if (selectedFirmFilter !== "all" && item.empresa !== selectedFirmFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchEmpresa = item.empresa.toLowerCase().includes(query);
        const matchTipo = item.tipoLabel.toLowerCase().includes(query);
        const matchCuenta = item.cuentaAlias?.toLowerCase().includes(query);
        const matchNotas = item.notas?.toLowerCase().includes(query);
        return matchEmpresa || matchTipo || matchCuenta || matchNotas;
      }
      return true;
    });
  }, [expenses, payouts, activeTab, selectedFirmFilter, searchQuery]);

  const uniqueFirms = React.useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.empresa && set.add(e.empresa));
    payouts.forEach((p) => p.empresa && set.add(p.empresa));
    return Array.from(set);
  }, [expenses, payouts]);

  return (
    <div className="space-y-6">
      {/* ReadOnly Alert Banner */}
      {readOnly && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Visualizando gastos y rentabilidad de <strong>{traderName || "otro trader"}</strong>. Modo solo lectura activado.
          </span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-500" />
            Gastos & Rentabilidad (ROI)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control exacto de tu inversión en cuentas de fondeo (pruebas, resets, activaciones) frente a tus retiros reales cobrados.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Gasto</span>
            </button>
            <button
              onClick={() => setShowPayoutModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 transition-all"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Registrar Cobro / Payout</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── Financial KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido (Gastos) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Inversión Total en Fondeo</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            ${summary.totalExpenses.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{expenses.length} registros de gasto</span>
            <span className="text-rose-500 font-semibold">Coste Total</span>
          </div>
        </div>

        {/* Total Cobrado (Payouts) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Total Cobrado (Payouts)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${summary.totalPayouts.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{payouts.length} retiros cobrados</span>
            <span className="text-emerald-500 font-semibold">En Tu Bolsillo</span>
          </div>
        </div>

        {/* Beneficio Neto Real */}
        <div
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden ${
            summary.netProfit >= 0
              ? "border-emerald-500/30 dark:border-emerald-500/20"
              : "border-amber-500/30 dark:border-amber-500/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Beneficio Neto Real</span>
            <div
              className={`p-1.5 rounded-lg ${
                summary.netProfit >= 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              summary.netProfit >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {summary.netProfit >= 0 ? "+" : ""}
            ${summary.netProfit.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Retiros - Gastos</span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                summary.netProfit >= 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
            >
              {summary.netProfit >= 0 ? "✓ Rentable" : "En Recuperación"}
            </span>
          </div>
        </div>

        {/* Retorno de Inversión (ROI) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Retorno de Inversión (ROI)</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              summary.roiPercentage >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.roiPercentage >= 0 ? "+" : ""}
            {summary.roiPercentage.toFixed(1)}%
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Factor Retorno:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
              ${summary.recoveryRatio.toFixed(2)} por $1
            </span>
          </div>
        </div>
      </div>

      {/* ─── Desgloses Visuales: Por Empresa y Por Tipo de Gasto ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Desglose por Empresa de Fondeo */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              Rentabilidad por Empresa (Prop Firm)
            </h3>
            <span className="text-[11px] text-slate-400">
              {Object.keys(summary.byFirm).length} empresas registradas
            </span>
          </div>

          {Object.keys(summary.byFirm).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay movimientos registrados para calcular el balance por empresa.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.values(summary.byFirm).map((firm) => {
                const isPositive = firm.netProfit >= 0;
                return (
                  <div
                    key={firm.empresa}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {firm.empresa}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isPositive ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {isPositive ? "+" : ""}${firm.netProfit.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] ml-1 opacity-70">
                          ({isPositive ? "+" : ""}{firm.roi.toFixed(0)}% ROI)
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-rose-500/5 border border-rose-500/10">
                        <span className="text-rose-500/80">Gastado ({firm.expensesCount}):</span>
                        <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                          ${firm.expenses.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-emerald-500/80">Cobrado ({firm.payoutsCount}):</span>
                        <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          ${firm.payouts.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desglose por Tipo de Gasto */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Tag className="h-4 w-4 text-rose-500" />
              Distribución de Gastos por Categoría
            </h3>
            <span className="text-[11px] text-slate-400">
              Total: ${summary.totalExpenses.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {summary.totalExpenses === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No se han registrado gastos de cuentas todavía.
            </div>
          ) : (
            <div className="space-y-2.5">
              {Object.values(summary.byCategory).map((cat) => {
                const percentage =
                  summary.totalExpenses > 0 ? (cat.total / summary.totalExpenses) * 100 : 0;
                return (
                  <div key={cat.categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                        {cat.label} ({cat.count})
                      </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                        ${cat.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                        <span className="text-slate-400 text-[10px] ml-1">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabla y Filtro de Movimientos ─── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs: Todos, Gastos, Cobros */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Todos ({expenses.length + payouts.length})
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "expenses"
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Solo Gastos ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab("payouts")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "payouts"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              Solo Payouts ({payouts.length})
            </button>
          </div>

          {/* Filtros de Empresa y Búsqueda */}
          <div className="flex items-center gap-2">
            {uniqueFirms.length > 0 && (
              <select
                value={selectedFirmFilter}
                onChange={(e) => setSelectedFirmFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas las Empresas</option>
                {uniqueFirms.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nota o cuenta..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        {unifiedList.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No hay movimientos que coincidan
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {readOnly
                ? "Este trader aún no ha registrado gastos de pruebas ni retiros cobrados."
                : "Comienza registrando tus compras de cuentas de fondeo o tus primeros retiros cobrados."}
            </p>
            {!readOnly && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                >
                  + Registrar Primer Gasto
                </button>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                >
                  + Registrar Primer Payout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Tipo / Concepto</th>
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">Cuenta Asociada</th>
                  <th className="py-2.5 px-3">Notas</th>
                  <th className="py-2.5 px-3 text-right">Monto ($)</th>
                  {!readOnly && <th className="py-2.5 px-3 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {unifiedList.map((item) => {
                  const isExpense = item.itemType === "expense";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {item.fecha}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isExpense
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isExpense ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {item.tipoLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {item.empresa}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {item.cuentaAlias || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {item.notas || "—"}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                          isExpense
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        ${item.monto.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!readOnly && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() =>
                              isExpense
                                ? handleDeleteExpense(item.id)
                                : handleDeletePayout(item.id)
                            }
                            title="Eliminar registro"
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: NUEVO GASTO ─── */}
      {showExpenseModal && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto"
          onClick={() => setShowExpenseModal(false)}
        >
          <div
            className="w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Registrar Gasto de Fondeo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Suma a tu inversión total y cálculo de ROI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Fecha e Importe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Fecha del Pago
                  </label>
                  <input
                    type="date"
                    required
                    value={expFecha}
                    onChange={(e) => setExpFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Importe ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ej: 35.00"
                    value={expMonto}
                    onChange={(e) => setExpMonto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Categoría / Concepto */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Concepto del Gasto *
                </label>
                <select
                  value={expTipo}
                  onChange={(e) => setExpTipo(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="evaluacion">Prueba / Evaluación (Compra de cuenta)</option>
                  <option value="reset">Reset de Cuenta (Reinicio por pérdida)</option>
                  <option value="activacion_pa">Cuota Activación / PA (Lifetime o mensual)</option>
                  <option value="suscripcion">Suscripción Mensual de Fondeo</option>
                  <option value="plataforma">Software / Plataforma / Data Feed</option>
                  <option value="otro">Otro Gasto</option>
                </select>
              </div>

              {/* Empresa / Prop Firm */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Empresa de Fondeo
                </label>
                <select
                  value={expEmpresa}
                  onChange={(e) => setExpEmpresa(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {POPULAR_FIRMS.map((firm) => (
                    <option key={firm} value={firm}>
                      {firm}
                    </option>
                  ))}
                </select>
                {expEmpresa === "Otra" && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre de la empresa..."
                    value={expEmpresaCustom}
                    onChange={(e) => setExpEmpresaCustom(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Cuenta vinculada (opcional) */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Vincular a Cuenta (Opcional)
                </label>
                <select
                  value={expCuentaId}
                  onChange={(e) => setExpCuentaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Sin vincular (Gasto general)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.alias || acc.nombre || acc.id} ({acc.broker || "Apex"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="ej: Cupón 80% descuento, cuenta 50k..."
                  value={expNotas}
                  onChange={(e) => setExpNotas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-sm shadow-rose-500/25"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─── MODAL: NUEVO PAYOUT / RETIRO ─── */}
      {showPayoutModal && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto"
          onClick={() => setShowPayoutModal(false)}
        >
          <div
            className="w-full max-w-md my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Registrar Cobro / Retiro (Payout)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Beneficio real cobrado que aumenta tu rentabilidad
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayout} className="space-y-4 text-xs">
              {/* Fecha e Importe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Fecha del Cobro
                  </label>
                  <input
                    type="date"
                    required
                    value={payFecha}
                    onChange={(e) => setPayFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">
                    Importe Cobrado ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ej: 1500.00"
                    value={payMonto}
                    onChange={(e) => setPayMonto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Empresa / Prop Firm */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Empresa Pagadora
                </label>
                <select
                  value={payEmpresa}
                  onChange={(e) => setPayEmpresa(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {POPULAR_FIRMS.map((firm) => (
                    <option key={firm} value={firm}>
                      {firm}
                    </option>
                  ))}
                </select>
                {payEmpresa === "Otra" && (
                  <input
                    type="text"
                    required
                    placeholder="Nombre de la empresa..."
                    value={payEmpresaCustom}
                    onChange={(e) => setPayEmpresaCustom(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Cuenta de Origen */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Cuenta de Origen
                </label>
                <select
                  value={payCuentaId}
                  onChange={(e) => setPayCuentaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Selecciona la cuenta fondeada...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.alias || acc.nombre || acc.id} ({acc.broker || "Apex"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Método de cobro */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Método de Cobro
                </label>
                <select
                  value={payMetodo}
                  onChange={(e) => setPayMetodo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Transferencia Bancaria">Transferencia Bancaria (Wire / ACH)</option>
                  <option value="Wise">Wise</option>
                  <option value="Cripto (USDT / USDC)">Cripto (USDT / USDC)</option>
                  <option value="Deel">Deel</option>
                  <option value="Revolut">Revolut</option>
                  <option value="Otro">Otro Método</option>
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Notas / Observaciones
                </label>
                <input
                  type="text"
                  placeholder="ej: Primer payout 100% split, recibido en 48h..."
                  value={payNotas}
                  onChange={(e) => setPayNotas(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/25"
                >
                  Guardar Cobro / Payout
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
