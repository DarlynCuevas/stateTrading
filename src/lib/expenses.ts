import { createClient } from "@/lib/supabase/client";

export type ExpenseCategory =
  | "evaluacion"
  | "reset"
  | "activacion_pa"
  | "suscripcion"
  | "plataforma"
  | "otro";

export interface ExpenseRecord {
  id: string;
  userId: string;
  fecha: string; // YYYY-MM-DD
  empresa: string; // Apex, Topstep, TradeDay, FundedNext, etc.
  tipo: ExpenseCategory;
  cuentaId?: string;
  cuentaAlias?: string;
  monto: number; // en USD
  notas?: string;
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  userId: string;
  fecha: string; // YYYY-MM-DD
  empresa: string;
  cuentaId?: string;
  cuentaAlias?: string;
  monto: number; // en USD
  metodo?: string; // Transferencia, Wise, Cripto, Deel, etc.
  notas?: string;
  createdAt: string;
}

export interface FinanceSummary {
  totalExpenses: number;
  totalPayouts: number;
  netProfit: number;
  roiPercentage: number;
  recoveryRatio: number; // payouts / expenses
  byFirm: Record<
    string,
    {
      empresa: string;
      expenses: number;
      payouts: number;
      netProfit: number;
      roi: number;
      expensesCount: number;
      payoutsCount: number;
    }
  >;
  byCategory: Record<
    ExpenseCategory,
    {
      categoria: ExpenseCategory;
      label: string;
      total: number;
      count: number;
    }
  >;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  evaluacion: "Prueba / Evaluación",
  reset: "Reset de Cuenta",
  activacion_pa: "Cuota Activación / PA",
  suscripcion: "Suscripción Mensual",
  plataforma: "Software / Plataforma",
  otro: "Otro Gasto",
};

export const POPULAR_FIRMS = [
  "Apex Trader Funding",
  "Topstep",
  "TradeDay",
  "FundedNext",
  "MyFundedFutures",
  "Uprofit",
  "TakeProfit Trader",
  "Bulenox",
  "Fast Track Trading",
  "Otra",
];

// ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────

const getExpensesStorageKey = (userId: string) => `statetrading_expenses_${userId}`;
const getPayoutsStorageKey = (userId: string) => `statetrading_payouts_${userId}`;

export function loadLocalFinances(userId: string): {
  expenses: ExpenseRecord[];
  payouts: PayoutRecord[];
} {
  if (typeof window === "undefined" || !userId) {
    return { expenses: [], payouts: [] };
  }
  try {
    const rawExp = localStorage.getItem(getExpensesStorageKey(userId));
    const rawPay = localStorage.getItem(getPayoutsStorageKey(userId));

    const expenses: ExpenseRecord[] = rawExp ? JSON.parse(rawExp) : [];
    const payouts: PayoutRecord[] = rawPay ? JSON.parse(rawPay) : [];

    return { expenses, payouts };
  } catch (err) {
    console.error("Error reading finances from localStorage:", err);
    return { expenses: [], payouts: [] };
  }
}

export function saveLocalFinances(
  userId: string,
  expenses: ExpenseRecord[],
  payouts: PayoutRecord[]
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(getExpensesStorageKey(userId), JSON.stringify(expenses));
    localStorage.setItem(getPayoutsStorageKey(userId), JSON.stringify(payouts));
  } catch (err) {
    console.error("Error writing finances to localStorage:", err);
  }
}

// ─── SUPABASE SYNC (CON FALLBACK AUTOMÁTICO A LOCAL) ─────────────────

export async function fetchUserFinances(userId: string): Promise<{
  expenses: ExpenseRecord[];
  payouts: PayoutRecord[];
}> {
  const local = loadLocalFinances(userId);
  if (!userId) return local;

  try {
    const supabase = createClient();

    // Intentamos consultar tabla de gastos en Supabase
    const { data: expData, error: expError } = await supabase
      .from("prop_firm_expenses")
      .select("*")
      .eq("user_id", userId)
      .order("fecha", { ascending: false });

    // Intentamos consultar tabla de retiros en Supabase
    const { data: payData, error: payError } = await supabase
      .from("prop_firm_payouts")
      .select("*")
      .eq("user_id", userId)
      .order("fecha", { ascending: false });

    if (expError || payError) {
      // Si las tablas no existen en Supabase aún, retornamos el estado local de forma segura
      return local;
    }

    const expenses: ExpenseRecord[] = (expData || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fecha: row.fecha,
      empresa: row.empresa,
      tipo: row.tipo,
      cuentaId: row.cuenta_id || undefined,
      cuentaAlias: row.cuenta_alias || undefined,
      monto: Number(row.monto) || 0,
      notas: row.notas || "",
      createdAt: row.created_at || new Date().toISOString(),
    }));

    const payouts: PayoutRecord[] = (payData || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fecha: row.fecha,
      empresa: row.empresa,
      cuentaId: row.cuenta_id || undefined,
      cuentaAlias: row.cuenta_alias || undefined,
      monto: Number(row.monto) || 0,
      metodo: row.metodo || "",
      notas: row.notas || "",
      createdAt: row.created_at || new Date().toISOString(),
    }));

    // Actualizamos cache local
    saveLocalFinances(userId, expenses, payouts);

    return { expenses, payouts };
  } catch (err) {
    console.warn("Could not fetch remote finances from Supabase, using local cache:", err);
    return local;
  }
}

export async function saveExpenseRecord(
  record: Omit<ExpenseRecord, "id" | "createdAt">,
  existingId?: string
): Promise<ExpenseRecord> {
  const id = existingId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullRecord: ExpenseRecord = {
    ...record,
    id,
    createdAt: new Date().toISOString(),
  };

  // 1. Guardar en LocalStorage
  const local = loadLocalFinances(record.userId);
  const existingIdx = local.expenses.findIndex((e) => e.id === id);
  if (existingIdx >= 0) {
    local.expenses[existingIdx] = fullRecord;
  } else {
    local.expenses.unshift(fullRecord);
  }
  saveLocalFinances(record.userId, local.expenses, local.payouts);

  // 2. Intentar guardar en Supabase
  try {
    const supabase = createClient();
    await supabase.from("prop_firm_expenses").upsert({
      id: fullRecord.id,
      user_id: fullRecord.userId,
      fecha: fullRecord.fecha,
      empresa: fullRecord.empresa,
      tipo: fullRecord.tipo,
      cuenta_id: fullRecord.cuentaId || null,
      cuenta_alias: fullRecord.cuentaAlias || null,
      monto: fullRecord.monto,
      notas: fullRecord.notas || null,
    });
  } catch (err) {
    console.warn("Supabase save expense error (local state preserved):", err);
  }

  return fullRecord;
}

export async function deleteExpenseRecord(userId: string, id: string): Promise<void> {
  // 1. Quitar de LocalStorage
  const local = loadLocalFinances(userId);
  local.expenses = local.expenses.filter((e) => e.id !== id);
  saveLocalFinances(userId, local.expenses, local.payouts);

  // 2. Quitar de Supabase si existe
  try {
    const supabase = createClient();
    await supabase.from("prop_firm_expenses").delete().eq("id", id).eq("user_id", userId);
  } catch (err) {
    console.warn("Supabase delete expense error:", err);
  }
}

export async function savePayoutRecord(
  record: Omit<PayoutRecord, "id" | "createdAt">,
  existingId?: string
): Promise<PayoutRecord> {
  const id = existingId || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullRecord: PayoutRecord = {
    ...record,
    id,
    createdAt: new Date().toISOString(),
  };

  // 1. Guardar en LocalStorage
  const local = loadLocalFinances(record.userId);
  const existingIdx = local.payouts.findIndex((p) => p.id === id);
  if (existingIdx >= 0) {
    local.payouts[existingIdx] = fullRecord;
  } else {
    local.payouts.unshift(fullRecord);
  }
  saveLocalFinances(record.userId, local.expenses, local.payouts);

  // 2. Intentar guardar en Supabase
  try {
    const supabase = createClient();
    await supabase.from("prop_firm_payouts").upsert({
      id: fullRecord.id,
      user_id: fullRecord.userId,
      fecha: fullRecord.fecha,
      empresa: fullRecord.empresa,
      cuenta_id: fullRecord.cuentaId || null,
      cuenta_alias: fullRecord.cuentaAlias || null,
      monto: fullRecord.monto,
      metodo: fullRecord.metodo || null,
      notas: fullRecord.notas || null,
    });
  } catch (err) {
    console.warn("Supabase save payout error (local state preserved):", err);
  }

  return fullRecord;
}

export async function deletePayoutRecord(userId: string, id: string): Promise<void> {
  // 1. Quitar de LocalStorage
  const local = loadLocalFinances(userId);
  local.payouts = local.payouts.filter((p) => p.id !== id);
  saveLocalFinances(userId, local.expenses, local.payouts);

  // 2. Quitar de Supabase si existe
  try {
    const supabase = createClient();
    await supabase.from("prop_firm_payouts").delete().eq("id", id).eq("user_id", userId);
  } catch (err) {
    console.warn("Supabase delete payout error:", err);
  }
}

// ─── CÁLCULOS ESTADÍSTICOS Y MÉTRICAS DE RENTABILIDAD ────────────────

export function calculateFinanceSummary(
  expenses: ExpenseRecord[],
  payouts: PayoutRecord[]
): FinanceSummary {
  const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalPayouts = payouts.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const netProfit = totalPayouts - totalExpenses;
  const roiPercentage =
    totalExpenses > 0 ? ((totalPayouts - totalExpenses) / totalExpenses) * 100 : totalPayouts > 0 ? 100 : 0;
  const recoveryRatio = totalExpenses > 0 ? totalPayouts / totalExpenses : totalPayouts > 0 ? 999 : 0;

  // Desglose por Empresa
  const byFirm: FinanceSummary["byFirm"] = {};

  const allFirms = Array.from(
    new Set([...expenses.map((e) => e.empresa || "Sin Empresa"), ...payouts.map((p) => p.empresa || "Sin Empresa")])
  );

  allFirms.forEach((firm) => {
    const firmExpenses = expenses
      .filter((e) => (e.empresa || "Sin Empresa") === firm)
      .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    const firmExpensesCount = expenses.filter((e) => (e.empresa || "Sin Empresa") === firm).length;

    const firmPayouts = payouts
      .filter((p) => (p.empresa || "Sin Empresa") === firm)
      .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const firmPayoutsCount = payouts.filter((p) => (p.empresa || "Sin Empresa") === firm).length;

    const firmNet = firmPayouts - firmExpenses;
    const firmRoi =
      firmExpenses > 0 ? ((firmPayouts - firmExpenses) / firmExpenses) * 100 : firmPayouts > 0 ? 100 : 0;

    byFirm[firm] = {
      empresa: firm,
      expenses: firmExpenses,
      payouts: firmPayouts,
      netProfit: firmNet,
      roi: firmRoi,
      expensesCount: firmExpensesCount,
      payoutsCount: firmPayoutsCount,
    };
  });

  // Desglose por Categoría de Gasto
  const categories: ExpenseCategory[] = [
    "evaluacion",
    "reset",
    "activacion_pa",
    "suscripcion",
    "plataforma",
    "otro",
  ];

  const byCategory: FinanceSummary["byCategory"] = {} as any;

  categories.forEach((cat) => {
    const matching = expenses.filter((e) => e.tipo === cat);
    const total = matching.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    byCategory[cat] = {
      categoria: cat,
      label: CATEGORY_LABELS[cat] || cat,
      total,
      count: matching.length,
    };
  });

  return {
    totalExpenses,
    totalPayouts,
    netProfit,
    roiPercentage,
    recoveryRatio,
    byFirm,
    byCategory,
  };
}
