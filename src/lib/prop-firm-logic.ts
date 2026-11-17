import { Account, Operation } from "@/lib/operations";

export interface AccountRiskMetrics {
  accountId: string;
  alias: string;
  tipo: "evaluacion" | "fondeada" | string;
  balance: number;
  balanceInicial: number;
  nivelLiquidacion: number;
  distanciaDrawdown: number;
  distanciaDrawdownPct: number;
  drawdownMax: number;
  riskLevel: "safe" | "warning" | "critical" | "liquidated";
  pnlDia: number;
  dailyLossLimit: number;
  isDailyLossExceeded: boolean;
  dailyLossUsagePct: number;

  // Regla de Consistencia
  consistency: {
    totalProfit: number;
    bestDayProfit: number;
    bestDayDate: string | null;
    consistencyPct: number;
    thresholdPct: number;
    isConsistent: boolean;
    additionalProfitNeeded: number;
  };

  // Reglas de Payout (Cuentas Fondeadas / PA)
  payout: {
    isFunded: boolean;
    safetyThreshold: number;
    withdrawableAmount: number;
    activeTradingDays: number;
    profitableDays: number;
    requiredTradingDays: number;
    isEligible: boolean;
  };

  // Reglas de Evaluación (Pase de Prueba y Tiempo)
  evaluation: {
    isEvaluation: boolean;
    profitTarget: number;
    currentProfit: number;
    progressPct: number;
    remainingToTarget: number;
    isTargetReached: boolean;
    // Control temporal de evaluación
    fechaInicio: string;
    fechaFin: string;
    diasTotales: number;
    diasRestantes: number;
    diasTranscurridos: number;
    tiempoUsadoPct: number;
    ritmoDiarioNecesario: number;
    urgenciaTiempo: "normal" | "proximo" | "critico" | "vencido";
  };
}

/**
 * Retorna el drawdown máximo estándar según el tamaño de cuenta si no está especificado
 */
export function getDefaultDrawdownMax(tamano: number): number {
  if (tamano <= 25000) return 1500;
  if (tamano <= 50000) return 2500;
  if (tamano <= 100000) return 3000;
  if (tamano <= 150000) return 4500;
  if (tamano <= 250000) return 6000;
  return 2500;
}

/**
 * Retorna el objetivo de beneficio estándar de evaluación según tamaño
 */
export function getDefaultProfitTarget(tamano: number): number {
  if (tamano <= 25000) return 1500;
  if (tamano <= 50000) return 3000;
  if (tamano <= 100000) return 6000;
  if (tamano <= 150000) return 9000;
  return 3000;
}

/**
 * Calcula todas las métricas de riesgo, consistencia y payouts para una cuenta
 */
export function calculateAccountRiskMetrics(
  account: Account,
  operations: Operation[]
): AccountRiskMetrics {
  const balance = account.balance || account.balanceInicial || 50000;
  const balanceInicial = account.balanceInicial || 50000;
  const drawdownMax = account.reglas?.drawdownMax || getDefaultDrawdownMax(balanceInicial);

  // 1. Nivel de Liquidación y Distancia al Drawdown
  let nivelLiquidacion = account.nivelLiquidacion;
  if (nivelLiquidacion == null) {
    nivelLiquidacion = balanceInicial - drawdownMax;
  }

  let distanciaDrawdown = account.distanciaDrawdown;
  if (distanciaDrawdown == null) {
    distanciaDrawdown = balance - nivelLiquidacion;
  }

  const distanciaDrawdownPct = Math.min(
    100,
    Math.max(0, (distanciaDrawdown / drawdownMax) * 100)
  );

  let riskLevel: "safe" | "warning" | "critical" | "liquidated" = "safe";
  if (distanciaDrawdown <= 0) {
    riskLevel = "liquidated";
  } else if (distanciaDrawdown < 400 || distanciaDrawdownPct < 20) {
    riskLevel = "critical";
  } else if (distanciaDrawdownPct < 50) {
    riskLevel = "warning";
  } else {
    riskLevel = "safe";
  }

  // 2. Pérdida Diaria (Daily Loss Limit)
  const pnlDia = account.pnlDia || 0;
  const dailyLossLimit = account.reglas?.drawdownMax
    ? Math.round(account.reglas.drawdownMax * 0.4) // Por defecto el 40% del drawdown total
    : 1000;

  const isDailyLossExceeded = pnlDia < 0 && Math.abs(pnlDia) >= dailyLossLimit;
  const dailyLossUsagePct = pnlDia < 0 ? Math.min(100, (Math.abs(pnlDia) / dailyLossLimit) * 100) : 0;

  // 3. Agrupar trades de esta cuenta por día para consistencia y días de operativa
  const accountOps = operations.filter(
    (op) => !op.cuentaId || op.cuentaId === account.id
  );

  const dailyPnlMap: Record<string, number> = {};
  accountOps.forEach((op) => {
    const timeStr = op.closeTime || op.openTime;
    if (!timeStr) return;
    const dayKey = timeStr.slice(0, 10);
    const pnl = op.netPnl ?? op.pnl ?? 0;
    dailyPnlMap[dayKey] = (dailyPnlMap[dayKey] || 0) + pnl;
  });

  const dailyEntries = Object.entries(dailyPnlMap);
  const activeTradingDays = dailyEntries.length;
  const profitableDays = dailyEntries.filter(([, pnl]) => pnl >= 100).length;

  let totalProfit = 0;
  let bestDayProfit = 0;
  let bestDayDate: string | null = null;

  dailyEntries.forEach(([day, pnl]) => {
    if (pnl > 0) {
      totalProfit += pnl;
      if (pnl > bestDayProfit) {
        bestDayProfit = pnl;
        bestDayDate = day;
      }
    }
  });

  const thresholdPct = account.reglas?.reglaConsistenciaPct || 30; // 30% regla Apex
  const consistencyPct = totalProfit > 0 ? (bestDayProfit / totalProfit) * 100 : 0;
  const isConsistent = totalProfit === 0 || consistencyPct <= thresholdPct;

  // ¿Cuánto profit adicional en otros días se necesita para que el mejor día sea <= 30%?
  // bestDay / (totalProfit + X) = thresholdPct / 100
  // totalProfit + X = bestDay / (thresholdPct / 100)
  // X = (bestDay / (thresholdPct / 100)) - totalProfit
  const additionalProfitNeeded =
    !isConsistent && thresholdPct > 0
      ? Math.max(0, (bestDayProfit / (thresholdPct / 100)) - totalProfit)
      : 0;

  // 4. Reglas de Payout (Cuentas Fondeadas / PA)
  const isFunded =
    account.tipo?.toLowerCase().includes("fond") ||
    account.tipo?.toLowerCase() === "pa" ||
    account.id.startsWith("PA");

  // Apex Safety Threshold = SaldoInicial + DrawdownMax + 100
  const safetyThreshold = balanceInicial + drawdownMax + 100;
  const withdrawableAmount = isFunded
    ? Math.max(0, balance - safetyThreshold)
    : 0;
  const requiredTradingDays = 10; // Apex requiere 10 días activos en PA
  const isEligible =
    isFunded &&
    activeTradingDays >= requiredTradingDays &&
    withdrawableAmount > 0 &&
    isConsistent;

  // 5. Reglas de Evaluación y Control de Tiempo
  const isEvaluation = !isFunded;
  const profitTarget = account.reglas?.objetivoBeneficio || getDefaultProfitTarget(balanceInicial);
  const currentProfit = Math.max(0, balance - balanceInicial);
  const progressPct = Math.min(100, Math.max(0, (currentProfit / profitTarget) * 100));
  const remainingToTarget = Math.max(0, profitTarget - currentProfit);
  const isTargetReached = currentProfit >= profitTarget;

  // Cálculo de Tiempo Límite de Evaluación
  let fechaInicioStr = account.fechaCompra || "";
  if (!fechaInicioStr) {
    const accountOps = operations
      .filter((op) => op.cuentaId === account.id && op.openTime)
      .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime());
    if (accountOps.length > 0 && accountOps[0].openTime) {
      fechaInicioStr = accountOps[0].openTime.slice(0, 10);
    } else {
      fechaInicioStr = new Date().toISOString().slice(0, 10);
    }
  }

  const diasTotales = account.diasValidez || 30;
  const startDate = new Date(fechaInicioStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + diasTotales);

  const now = new Date();
  const nowMs = now.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const diffMs = endMs - nowMs;
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diasTranscurridos = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
  const tiempoUsadoPct = Math.min(100, Math.max(0, (diasTranscurridos / diasTotales) * 100));

  let urgenciaTiempo: "normal" | "proximo" | "critico" | "vencido" = "normal";
  if (diasRestantes < 0) {
    urgenciaTiempo = "vencido";
  } else if (diasRestantes <= 3) {
    urgenciaTiempo = "critico";
  } else if (diasRestantes <= 8) {
    urgenciaTiempo = "proximo";
  } else {
    urgenciaTiempo = "normal";
  }

  const ritmoDiarioNecesario =
    isTargetReached || diasRestantes <= 0
      ? 0
      : Math.round(remainingToTarget / Math.max(1, diasRestantes));

  return {
    accountId: account.id,
    alias: account.alias || account.nombre || account.id,
    tipo: isFunded ? "fondeada" : "evaluacion",
    balance,
    balanceInicial,
    nivelLiquidacion,
    distanciaDrawdown,
    distanciaDrawdownPct,
    drawdownMax,
    riskLevel,
    pnlDia,
    dailyLossLimit,
    isDailyLossExceeded,
    dailyLossUsagePct,
    consistency: {
      totalProfit,
      bestDayProfit,
      bestDayDate,
      consistencyPct,
      thresholdPct,
      isConsistent,
      additionalProfitNeeded,
    },
    payout: {
      isFunded,
      safetyThreshold,
      withdrawableAmount,
      activeTradingDays,
      profitableDays,
      requiredTradingDays,
      isEligible,
    },
    evaluation: {
      isEvaluation,
      profitTarget,
      currentProfit,
      progressPct,
      remainingToTarget,
      isTargetReached,
      fechaInicio: fechaInicioStr,
      fechaFin: endDate.toISOString().slice(0, 10),
      diasTotales,
      diasRestantes,
      diasTranscurridos,
      tiempoUsadoPct,
      ritmoDiarioNecesario,
      urgenciaTiempo,
    },
  };
}
