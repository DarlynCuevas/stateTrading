import tradingState from '@/data/trading-state.json';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface AccountRule {
  drawdownTipo?: string;
  drawdownMax?: number;
  objetivoBeneficio?: number | null;
  contratosMax?: number | null;
  reglaConsistenciaPct?: number | null;
}

export interface Account {
  id: string;
  nombre: string;
  alias?: string;
  usuarioEmail?: string;  // Email del trader propietario en Supabase
  broker: string;
  tipo: string;
  balance: number;        // Saldo actual
  balanceInicial: number; // Saldo inicial
  nivelLiquidacion?: number;
  distanciaDrawdown?: number;
  pnlDia?: number;
  reglas?: AccountRule;
  activa?: boolean;
  estado?: "activa" | "quemada" | "cancelada" | "superada";
  fechaBaja?: string;
  motivoBaja?: string;
}

export interface OperationPlan {
  sl?: number | null;
  tp?: number | null;
  valorPunto?: number;
  riesgoUsd?: number | null;
}

export interface Operation {
  id: string;
  cuentaId: string | null;
  real: boolean;
  symbol: string;
  type: string;
  openTime: string;
  closeTime?: string | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  quantity?: number | null;
  pnl?: number | null;
  commission?: number | null;
  netPnl?: number | null;
  plan?: OperationPlan;
  rMultiple?: number | null;
  resultado?: string;
  sesion?: string | null;
  setup?: string;
  auditor?: string | null;
  errores?: string[];
  aciertos?: string[];
  leccion?: string;
  captura?: string | null;
  pendiente?: string;
}

interface RawAccount {
  id: string;
  alias?: string;
  usuarioEmail?: string;
  broker?: string;
  tipo?: string;
  tamano?: number;
  saldoInicial?: number;
  balance?: number;
  balanceInicial?: number;
  nombre?: string;
  reglas?: AccountRule;
  activa?: boolean;
  estado?: "activa" | "quemada" | "cancelada" | "superada";
  fechaBaja?: string;
  motivoBaja?: string;
}

interface RawAccountState {
  cuentaId: string;
  fecha?: string;
  saldo?: number;
  pnlDia?: number;
  nivelLiquidacion?: number;
  distanciaDrawdown?: number;
}

interface RawTradingState {
  cuentas?: RawAccount[];
  estadoCuentas?: RawAccountState[];
  operaciones?: Operation[];
}

// ─── Parseo y normalización del JSON ─────────────────────────────────────────

const raw = tradingState as unknown as RawTradingState;

// Mapa de estadoCuentas por cuentaId
const estadoMap: Record<string, RawAccountState> = {};
if (Array.isArray(raw.estadoCuentas)) {
  raw.estadoCuentas.forEach((est) => {
    if (est?.cuentaId) {
      estadoMap[est.cuentaId] = est;
    }
  });
}

// Normalización de cuentas
const allAccounts: Account[] = (raw.cuentas || []).map((c) => {
  const est = estadoMap[c.id];
  const saldoActual = est?.saldo ?? c.balance ?? c.tamano ?? c.saldoInicial ?? 0;
  const saldoInicial = c.saldoInicial ?? c.tamano ?? c.balanceInicial ?? saldoActual;

  // Extraer los últimos 2 dígitos del ID (ej: "APEX...08" -> "08", "PAAPEX...01" -> "01")
  const ultimosDosDigitos = c.id.slice(-2);

  // Formatear el tipo / tamaño: "Evaluación 25k" o "Fondeada 50k"
  const tipoLabel = (c.tipo === "evaluacion" || c.alias?.toLowerCase().includes("evaluaci"))
    ? "Evaluación"
    : "Fondeada";
  const tamanoK = c.tamano ? `${Math.round(c.tamano / 1000)}k` : "";
  
  // Nombre final: ej. "Evaluación 25k (08)" o "Fondeada 50k (01)"
  const nombreFormateado = `${tipoLabel} ${tamanoK} (${ultimosDosDigitos})`.trim();

  return {
    id: c.id,
    nombre: nombreFormateado,
    alias: c.alias,
    usuarioEmail: c.usuarioEmail?.trim().toLowerCase(),
    broker: c.broker || "Apex",
    tipo: c.tipo || "fondeo",
    balance: saldoActual,
    balanceInicial: saldoInicial,
    nivelLiquidacion: est?.nivelLiquidacion,
    distanciaDrawdown: est?.distanciaDrawdown,
    pnlDia: est?.pnlDia,
    reglas: c.reglas,
    activa: c.activa ?? true,
  };
});

const allOperations: Operation[] = (raw.operaciones || []).map((op) => ({
  ...op,
  netPnl: op.netPnl ?? op.pnl ?? 0,
  pnl: op.pnl ?? 0,
  commission: op.commission ?? 0,
  entryPrice: op.entryPrice ?? 0,
  exitPrice: op.exitPrice ?? 0,
  quantity: op.quantity ?? 1,
}));

// ─── Funciones públicas ──────────────────────────────────────────────────────

/** Devuelve todas las cuentas con su balance real y estado */
export function loadAccounts(): Account[] {
  return allAccounts;
}

/** Devuelve todas las operaciones */
export function loadOperations(): Operation[] {
  return allOperations;
}

/** Mapa rápido cuentaId → Account para acceder al balance real */
export function getAccountMap(): Record<string, Account> {
  return allAccounts.reduce(
    (acc, cuenta) => ({ ...acc, [cuenta.id]: cuenta }),
    {} as Record<string, Account>,
  );
}

/** Agrupa las operaciones por cuentaId */
export function groupOperationsByAccount(
  ops: Operation[],
): Record<string, Operation[]> {
  return ops.reduce(
    (acc, op) => {
      const key = op.cuentaId || "sin_asignar";
      if (!acc[key]) acc[key] = [];
      acc[key].push(op);
      return acc;
    },
    {} as Record<string, Operation[]>,
  );
}

/** Lista de IDs de cuentas (a partir de la lista oficial de cuentas) */
export function listAccountIds(): string[] {
  return allAccounts.map((c) => c.id);
}

/**
 * Función principal: devuelve todo lo necesario para la UI.
 */
export function getAuditData() {
  const operations = loadOperations();
  const accounts = loadAccounts();
  const accountIds = listAccountIds();
  const byAccount = groupOperationsByAccount(operations);
  const accountMap = getAccountMap();

  return { accounts, operations, accountIds, byAccount, accountMap };
}
