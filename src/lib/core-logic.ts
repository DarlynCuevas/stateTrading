import {
  RawTradingViewRow,
  ParsedTrade,
  AccountStats,
  SymbolPerformance,
  PnlDistributionBucket,
  HourlyPerformance,
  DailyFrequencyBucket,
  HoldingTimeStats,
  PeriodSummary,
} from "./types";

/**
 * Convierte cualquier valor string/number (ej: "500,00 USD", "-0.8741", "1.14401") en número limpio.
 */
export function parseCleanNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    // Quitar letras, monedas y símbolos, dejando dígitos, puntos, comas y signos
    let clean = val.replace(/[^\d.,+-]/g, "").trim();
    if (!clean) return 0;

    // Manejar separadores de miles y decimales
    if (clean.includes(",") && clean.includes(".")) {
      if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
        // Ej: 1.500,50 -> 1500.50
        clean = clean.replace(/\./g, "").replace(",", ".");
      } else {
        // Ej: 1,500.50 -> 1500.50
        clean = clean.replace(/,/g, "");
      }
    } else if (clean.includes(",")) {
      // Ej: 500,00 -> 500.00 o -0,87 -> -0.87
      clean = clean.replace(",", ".");
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function parseDurationToMinutes(val: string | number | undefined | null): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "number" && !isNaN(val)) return val > 0 ? val : undefined;
  const str = String(val).trim().toLowerCase();
  if (!str) return undefined;

  let totalMins = 0;
  const dayMatch = str.match(/(\d+)\s*d/);
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*m/);
  const secMatch = str.match(/(\d+)\s*s/);

  if (dayMatch) totalMins += parseInt(dayMatch[1]) * 1440;
  if (hourMatch) totalMins += parseInt(hourMatch[1]) * 60;
  if (minMatch) totalMins += parseInt(minMatch[1]);
  if (secMatch && !minMatch && totalMins === 0) totalMins += parseInt(secMatch[1]) / 60;

  if (totalMins > 0) return totalMins;

  // Si es un número en string
  const plainNum = parseFloat(str);
  if (!isNaN(plainNum) && plainNum > 0) return plainNum;

  return undefined;
}

/**
 * Parsea el CSV exportado de TradingView, soportando de forma flexible:
 * - Histórico de saldo (donde la info viene en "PyG realizadas (valor)" y "Acción")
 * - Histórico de órdenes (con comisiones y precios de ejecución)
 * - Posiciones / Diario general
 */
export function parseTradingViewCsv(rows: RawTradingViewRow[]): ParsedTrade[] {
  if (!rows || rows.length === 0) return [];

  const trades: ParsedTrade[] = [];
  const seenSignatures = new Set<string>();

  rows.forEach((row, idx) => {
    // 0. Detect Tradovate Format
    if (row["boughtTimestamp"] !== undefined && row["soldTimestamp"] !== undefined) {
      const buyTimeStr = String(row["boughtTimestamp"]).trim();
      const sellTimeStr = String(row["soldTimestamp"]).trim();
      
      const buyDate = new Date(buyTimeStr);
      const sellDate = new Date(sellTimeStr);
      const buyTime = buyDate.getTime();
      const sellTime = sellDate.getTime();
      
      let type = "TRADE";
      let openTime = buyTimeStr;
      
      if (!isNaN(buyTime) && !isNaN(sellTime)) {
        if (buyTime > sellTime) {
          type = "SHORT (VENTA)";
          openTime = sellTimeStr;
        } else {
          type = "LONG (COMPRA)";
          openTime = buyTimeStr;
        }
      }

      const netPnl = parseCleanNumber(row["pnl"]);
      const quantity = parseCleanNumber(row["qty"]);
      const entryPrice = parseCleanNumber(type === "SHORT (VENTA)" ? row["sellPrice"] : row["buyPrice"]);
      const exitPrice = parseCleanNumber(type === "SHORT (VENTA)" ? row["buyPrice"] : row["sellPrice"]);
      
      const durationVal = row["duration"];
      const holdingTimeMinutes = parseDurationToMinutes(durationVal);
      
      trades.push({
        id: `trade-tradovate-${idx}-${Date.now()}`,
        symbol: String(row["symbol"] || "TRADE").trim(),
        type,
        openTime,
        entryPrice,
        exitPrice,
        pnl: netPnl,
        commission: 0,
        netPnl,
        quantity: quantity || 1,
        holdingTimeMinutes,
        raw: row,
      });
      return;
    }

    // 1. Omitir filas vacías o canceladas/rechazadas/pendientes
    const estado = String(row["Estado"] || row["Status"] || "").toLowerCase().trim();
    if (
      estado &&
      !estado.includes("ejecutad") &&
      !estado.includes("filled") &&
      !estado.includes("completad")
    ) {
      return;
    }

    // 2. Omitir eventos del diario que no son cierres de posición ni ejecuciones reales, así como filas exclusivas de comisión/depósito
    const accionStr = String(row["Acción"] || row["Action"] || row["Тexto"] || "").trim();
    const accionLower = accionStr.toLowerCase();

    if (
      accionLower.includes("modify position") ||
      accionLower.includes("modification confirmed") ||
      accionLower.includes("successfully placed") ||
      accionLower.includes("successfully cancelled") ||
      accionLower.includes("call to place market order") ||
      accionLower.includes("activated at price") ||
      accionLower.includes("comisión") ||
      accionLower.includes("comision") ||
      accionLower.includes("commission") ||
      accionLower.includes("depósito") ||
      accionLower.includes("deposito") ||
      accionLower.includes("deposit") ||
      accionLower.includes("retiro") ||
      accionLower.includes("withdrawal")
    ) {
      return;
    }

    // 3. Intentar obtener fecha/hora
    const timeStr = String(
      row["Hora"] ||
        row["Time"] ||
        row["Fecha"] ||
        row["Date"] ||
        row["Hora de cierre"] ||
        row["Hora de emisión"] ||
        ""
    ).trim();

    // 4. Detectar si es formato "Histórico de saldo" o "Diario de operaciones"
    const pnlValorCol = row["PyG realizadas (valor)"] !== undefined
      ? row["PyG realizadas (valor)"]
      : row["PyG realizadas"] !== undefined
      ? row["PyG realizadas"]
      : row["PyG"] !== undefined
      ? row["PyG"]
      : row["Profit"] !== undefined
      ? row["Profit"]
      : row["Beneficio"] !== undefined
      ? row["Beneficio"]
      : row["Net PnL"] !== undefined
      ? row["Net PnL"]
      : row["Ganancia/Pérdida"];

    const netPnl = parseCleanNumber(pnlValorCol);
    const commissionCol = parseCleanNumber(row["Comisión"] || row["Commission"]);

    const isClosePosition =
      accionLower.includes("close short position") ||
      accionLower.includes("close long position") ||
      accionLower.includes("cierre de posición") ||
      accionLower.includes("closed position");

    const isExecutedLog =
      accionLower.includes("has been executed at price") ||
      accionLower.includes("ejecutada a precio");

    if (pnlValorCol !== undefined || isClosePosition || isExecutedLog) {
      // Si el PnL es 0 y no es un cierre real ni una ejecución real en el diario, ignorar
      if (netPnl === 0 && !isClosePosition && !isExecutedLog) {
        return;
      }

      let symbol = String(row["Símbolo"] || row["Symbol"] || "").trim();
      let type = String(row["Lado"] || row["Side"] || "TRADE").trim().toUpperCase();
      let entryPrice = parseCleanNumber(row["Precio de entrada"] || row["Entry Price"]);
      let exitPrice = parseCleanNumber(row["Precio de salida"] || row["Exit Price"] || row["Precio de ejecución"] || row["Último precio"]);
      let quantity = parseCleanNumber(row["Cantidad"] || row["Qty"] || row["Quantity"]);

      if (accionStr) {
        // Regex para extraer símbolo: symbol IBKR:EURUSD o symbol COMEX_MINI:MGC1!
        const symbolMatch = accionStr.match(/symbol\s+([A-Za-z0-9:_/\.!-]+)/i);
        if (symbolMatch && !symbol) symbol = symbolMatch[1];

        if (accionLower.includes("short position")) type = "SHORT (VENTA)";
        else if (accionLower.includes("long position")) type = "LONG (COMPRA)";
        else if (accionLower.includes("buy") || accionLower.includes("comprar")) type = "COMPRA";
        else if (accionLower.includes("sell") || accionLower.includes("vender")) type = "VENTA";

        // Regex para precio salida/ejecución: at price 4060.6
        const exitMatch = accionStr.match(/at price\s+([0-9.,]+)/i);
        if (exitMatch && !exitPrice) exitPrice = parseCleanNumber(exitMatch[1]);

        // Regex para cantidad: for 1 units
        const qtyMatch = accionStr.match(/for\s+([0-9.,]+)\s+units/i);
        if (qtyMatch && !quantity) quantity = parseCleanNumber(qtyMatch[1]);

        // Regex para precio entrada promedio: Position AVG Price was 1.143970
        const entryMatch = accionStr.match(/AVG Price was\s+([0-9.,]+)/i);
        if (entryMatch && !entryPrice) entryPrice = parseCleanNumber(entryMatch[1]);
      }

      if (!symbol) symbol = "TRADE";

      const durationVal = row["Duración"] || row["Duration"] || row["Tiempo en mercado"] || row["Holding Time"] || row["holdingTimeMinutes"];
      const holdingTimeMinutes = parseDurationToMinutes(durationVal);

      // Deduplicación por Order ID o Firma única
      const orderIdMatch = accionStr.match(/Order\s+([0-9]+)/i);
      const orderId = String(row["ID de orden"] || row["Order ID"] || (orderIdMatch ? orderIdMatch[1] : "")).trim();
      const dedupeKey = orderId
        ? `ord:${orderId}`
        : `evt:${timeStr}|${symbol}|${type}|${entryPrice || exitPrice}|${netPnl}`;

      if (seenSignatures.has(dedupeKey)) return;
      seenSignatures.add(dedupeKey);

      trades.push({
        id: `trade-bal-${idx}-${Date.now()}`,
        symbol,
        type: type || "TRADE",
        openTime: timeStr || "Sin fecha",
        entryPrice: entryPrice || exitPrice,
        exitPrice: exitPrice || entryPrice,
        pnl: netPnl,
        commission: commissionCol,
        netPnl,
        quantity: quantity || 1,
        holdingTimeMinutes,
        raw: row,
      });
      return;
    }

    // 5. Si es formato "Histórico de órdenes" o "Posiciones cerradas" sin columna de saldo
    const symbol = String(row["Símbolo"] || row["Symbol"] || row["Instrumento"] || "").trim();
    if (!symbol) return;

    const side = String(row["Lado"] || row["Side"] || row["Tipo"] || "TRADE").trim().toUpperCase();
    const execPrice = parseCleanNumber(
      row["Precio de ejecución"] || row["Precio medio de ejecución"] || row["Precio límite"] || row["Price"]
    );

    // En histórico de órdenes, si no hubo precio de ejecución real, ignorar
    if (execPrice === 0 && !estado.includes("ejecutad") && !estado.includes("filled")) {
      return;
    }

    const quantity = parseCleanNumber(row["Cantidad"] || row["Qty"]);
    const commission = parseCleanNumber(row["Comisión"] || row["Commission"]);
    
    const netPnlOrd = parseCleanNumber(
      row["PyG realizadas (valor)"] || row["PyG"] || row["Beneficio"] || row["Profit"] || row["Net PnL"]
    );

    const durationVal = row["Duración"] || row["Duration"] || row["Tiempo en mercado"] || row["Holding Time"] || row["holdingTimeMinutes"];
    const holdingTimeMinutes = parseDurationToMinutes(durationVal);

    // Deduplicar también en órdenes ejecutadas
    const orderId = String(row["ID de orden"] || row["Order ID"] || row["ID"] || "").trim();
    const dedupeKey = orderId
      ? `ord:${orderId}`
      : `ord-evt:${timeStr}|${symbol}|${side}|${execPrice}|${netPnlOrd}`;

    if (seenSignatures.has(dedupeKey)) return;
    seenSignatures.add(dedupeKey);

    trades.push({
      id: `trade-ord-${idx}-${Date.now()}`,
      symbol,
      type: side,
      openTime: timeStr || "Sin fecha",
      entryPrice: execPrice,
      exitPrice: execPrice,
      pnl: netPnlOrd,
      commission,
      netPnl: netPnlOrd,
      quantity: quantity || 1,
      holdingTimeMinutes,
      raw: row,
    });
  });

  // Ordenar cronológicamente (más antiguo primero) para que el equity curve y KPIs tengan coherencia temporal
  const sorted = trades.sort((a, b) => {
    const timeA = new Date(a.openTime).getTime();
    const timeB = new Date(b.openTime).getTime();
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeA - timeB;
  });

  return groupOrCleanTrades(sorted);
}

function isBuySide(sideOrType: string): boolean {
  const s = sideOrType.toUpperCase();
  return s.includes("COMPRA") || s.includes("BUY") || s.includes("LONG") || s === "C";
}

function isSellSide(sideOrType: string): boolean {
  const s = sideOrType.toUpperCase();
  return s.includes("VENTA") || s.includes("SELL") || s.includes("SHORT") || s === "V";
}

function isExplicitCloseText(type: string, raw?: any): boolean {
  if (!raw) return false;
  const accion = String(raw["Acción"] || raw["Action"] || raw["Тexto"] || raw["Tipo"] || type || "").toLowerCase();
  return accion.includes("close") || accion.includes("cierre") || accion.includes("closed");
}

function groupOrCleanTrades(trades: ParsedTrade[]): ParsedTrade[] {
  if (!trades || trades.length === 0) return [];

  // 1. Verificar si el CSV ya contiene filas con resultado real (netPnl != 0) o textos explícitos de cierre
  const hasRealizedOrClose = trades.some(
    (t) => Math.abs(t.netPnl) > 0.0001 || isExplicitCloseText(t.type, t.raw)
  );

  if (hasRealizedOrClose) {
    // Si el archivo ya reporta los cierres con PnL o cierre explícito, filtramos todas las filas que son puras órdenes o ejecuciones de apertura (PnL 0)
    const filtered = trades.filter((t) => Math.abs(t.netPnl) > 0.0001 || isExplicitCloseText(t.type, t.raw));
    if (filtered.length > 0) {
      return filtered;
    }
  }

  // 2. Si todo el archivo tiene netPnl == 0 (ej: historial puro de ejecuciones / Fills sin columna PyG),
  // aplicamos emparejamiento FIFO por símbolo para reconstruir las operaciones completas (Round-Trips).
  return matchExecutionsFIFO(trades);
}

function matchExecutionsFIFO(trades: ParsedTrade[]): ParsedTrade[] {
  const bySymbol = new Map<string, ParsedTrade[]>();
  trades.forEach((t) => {
    const sym = t.symbol || "TRADE";
    if (!bySymbol.has(sym)) bySymbol.set(sym, []);
    bySymbol.get(sym)!.push(t);
  });

  const completedTrades: ParsedTrade[] = [];
  let tradeCounter = 1;

  bySymbol.forEach((symTrades, symbol) => {
    interface OpenLot {
      side: "BUY" | "SELL";
      price: number;
      qty: number;
      openTime: string;
      commission: number;
    }
    const openLots: OpenLot[] = [];

    let currentOpenSide: "BUY" | "SELL" | null = null;
    let accumQty = 0;
    let accumCost = 0;
    let accumExitCost = 0;
    let accumClosedQty = 0;
    let accumPnl = 0;
    let accumComm = 0;
    let firstOpenTime = "";
    let lastCloseTime = "";

    symTrades.forEach((t) => {
      const isBuy = isBuySide(t.type);
      const isSell = isSellSide(t.type);
      if (!isBuy && !isSell) return;

      const side: "BUY" | "SELL" = isBuy ? "BUY" : "SELL";
      const price = t.entryPrice || t.exitPrice || 0;
      let qty = t.quantity || 1;
      const time = t.openTime;
      const comm = t.commission || 0;

      if (openLots.length === 0 || openLots[0].side === side) {
        if (openLots.length === 0) {
          currentOpenSide = side;
          accumQty = 0;
          accumCost = 0;
          accumExitCost = 0;
          accumClosedQty = 0;
          accumPnl = 0;
          accumComm = 0;
          firstOpenTime = time;
        }
        openLots.push({ side, price, qty, openTime: time, commission: comm });
        accumQty += qty;
        accumCost += price * qty;
        accumComm += comm;
      } else {
        accumComm += comm;
        lastCloseTime = time;

        while (qty > 0 && openLots.length > 0 && openLots[0].side !== side) {
          const lot = openLots[0];
          const matchQty = Math.min(qty, lot.qty);

          const diff = side === "SELL" ? price - lot.price : lot.price - price;
          const pnlPart = diff * matchQty;
          accumPnl += pnlPart;
          accumExitCost += price * matchQty;
          accumClosedQty += matchQty;

          lot.qty -= matchQty;
          qty -= matchQty;

          if (lot.qty <= 0) {
            openLots.shift();
          }
        }

        if (openLots.length === 0 && accumClosedQty > 0) {
          const avgEntry = accumQty > 0 ? accumCost / accumQty : price;
          const avgExit = accumClosedQty > 0 ? accumExitCost / accumClosedQty : price;
          const netPnl = accumPnl - accumComm;

          const tStart = new Date(firstOpenTime).getTime();
          const tEnd = new Date(lastCloseTime).getTime();
          let holdingMins = !isNaN(tStart) && !isNaN(tEnd) ? (tEnd - tStart) / 60000 : 0;
          if (holdingMins < 0) holdingMins = 0;

          completedTrades.push({
            id: `fifo-trade-${tradeCounter++}-${Date.now()}`,
            symbol,
            type: currentOpenSide === "BUY" ? "LONG (COMPRA)" : "SHORT (VENTA)",
            openTime: firstOpenTime,
            entryPrice: Number(avgEntry.toFixed(4)),
            exitPrice: Number(avgExit.toFixed(4)),
            pnl: Number(accumPnl.toFixed(2)),
            commission: Number(accumComm.toFixed(2)),
            netPnl: Number(netPnl.toFixed(2)),
            quantity: accumClosedQty,
            holdingTimeMinutes: Number(holdingMins.toFixed(1)),
            raw: t.raw,
          });

          accumQty = 0;
          accumCost = 0;
          accumExitCost = 0;
          accumClosedQty = 0;
          accumPnl = 0;
          accumComm = 0;
          currentOpenSide = null;
        }

        if (qty > 0) {
          currentOpenSide = side;
          accumQty = qty;
          accumCost = price * qty;
          accumExitCost = 0;
          accumClosedQty = 0;
          accumPnl = 0;
          firstOpenTime = time;
          openLots.push({ side, price, qty, openTime: time, commission: 0 });
        }
      }
    });
  });

  return completedTrades;
}


/**
 * Calcula los KPI Cards a partir de los trades parseados.
 */
export function calculateAccountStats(trades: ParsedTrade[], initialBalance = 50000): AccountStats {
  if (!trades || trades.length === 0) {
    return {
      initialBalance,
      currentBalance: initialBalance,
      totalNetPnl: 0,
      winRate: 0,
      profitFactor: 0,
      averageTrade: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      riskRewardRatio: 0,
      expectancy: 0,
      averageWinner: 0,
      averageLoser: 0,
      largestWin: 0,
      largestLoss: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
    };
  }

  const totalTrades = trades.length;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalNetPnl = 0;

  let largestWin = 0;
  let largestLoss = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  let peakBalance = initialBalance;
  let runningBalance = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  trades.forEach((t) => {
    const pnl = t.netPnl;
    totalNetPnl += pnl;
    runningBalance += pnl;

    // Actualizar Drawdown
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const dd = peakBalance - runningBalance;
    const ddPercent = peakBalance > 0 ? (dd / peakBalance) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPercent > maxDrawdownPercent) maxDrawdownPercent = ddPercent;

    // Ganadora vs Perdedora
    if (pnl > 0) {
      winningTrades++;
      grossProfit += pnl;
      if (pnl > largestWin) largestWin = pnl;

      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxConsecutiveWins) maxConsecutiveWins = currentWinStreak;
    } else if (pnl < 0) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
      if (pnl < largestLoss) largestLoss = pnl;

      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentLossStreak;
    }
  });

  const currentBalance = initialBalance + totalNetPnl;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;
  const averageTrade = totalTrades > 0 ? totalNetPnl / totalTrades : 0;

  const averageWinner = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const averageLoser = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const riskRewardRatio = averageLoser > 0 ? averageWinner / averageLoser : averageWinner > 0 ? 99.99 : 0;
  const expectancy = averageTrade;

  return {
    initialBalance,
    currentBalance,
    totalNetPnl,
    winRate,
    profitFactor,
    averageTrade,
    totalTrades,
    winningTrades,
    losingTrades,
    maxDrawdown,
    maxDrawdownPercent,
    riskRewardRatio,
    expectancy,
    averageWinner,
    averageLoser,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
  };
}

/**
 * Genera la serie temporal de evolución del saldo para el Gráfico de Equity Curve.
 */
export function generateEquityCurve(trades: ParsedTrade[], initialBalance = 50000) {
  const data = [
    {
      tradeNumber: 0,
      time: "Inicio",
      balance: initialBalance,
      pnl: 0,
      symbol: "Balance Inicial",
    },
  ];

  let runningBalance = initialBalance;

  trades.forEach((t, idx) => {
    runningBalance += t.netPnl;
    // Formatear hora corta (ej: 03-07 20:25)
    let shortTime = t.openTime;
    try {
      const d = new Date(t.openTime);
      if (!isNaN(d.getTime())) {
        shortTime = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }
    } catch {
      // mantener original
    }

    data.push({
      tradeNumber: idx + 1,
      time: shortTime,
      balance: Number(runningBalance.toFixed(2)),
      pnl: Number(t.netPnl.toFixed(2)),
      symbol: t.symbol,
    });
  });

  return data;
}

/**
 * Agrupa el PnL neto por día de la semana para el Gráfico de Barras de Distribución Diaria.
 */
export function generateDailyDistribution(trades: ParsedTrade[]) {
  const daysMap: Record<string, { day: string; pnl: number; tradesCount: number; wins: number; losses: number }> = {
    Lunes: { day: "Lunes", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Martes: { day: "Martes", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Miércoles: { day: "Miércoles", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Jueves: { day: "Jueves", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Viernes: { day: "Viernes", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Sábado: { day: "Sábado", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
    Domingo: { day: "Domingo", pnl: 0, tradesCount: 0, wins: 0, losses: 0 },
  };

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  trades.forEach((t) => {
    let dayName = "Lunes"; // default fallback
    try {
      const d = new Date(t.openTime);
      if (!isNaN(d.getTime())) {
        dayName = dayNames[d.getDay()];
      }
    } catch {
      // fallback
    }

    if (!daysMap[dayName]) {
      daysMap[dayName] = { day: dayName, pnl: 0, tradesCount: 0, wins: 0, losses: 0 };
    }

    daysMap[dayName].pnl += t.netPnl;
    daysMap[dayName].tradesCount += 1;
    if (t.netPnl > 0) daysMap[dayName].wins += 1;
    else if (t.netPnl < 0) daysMap[dayName].losses += 1;
  });

  // Retornar solo Lunes a Viernes de forma ordenada, más sáb/dom si tienen operaciones
  const orderedDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const result = orderedDays.map((d) => ({
    ...daysMap[d],
    pnl: Number(daysMap[d].pnl.toFixed(2)),
  }));

  if (daysMap["Sábado"].tradesCount > 0) result.push({ ...daysMap["Sábado"], pnl: Number(daysMap["Sábado"].pnl.toFixed(2)) });
  if (daysMap["Domingo"].tradesCount > 0) result.push({ ...daysMap["Domingo"], pnl: Number(daysMap["Domingo"].pnl.toFixed(2)) });

  return result;
}

/**
 * Datos de un día para el Profit Calendar.
 */
export interface CalendarDayData {
  date: string;       // YYYY-MM-DD
  dayOfMonth: number;
  pnl: number;
  tradesCount: number;
  wins: number;
  losses: number;
  isCurrentMonth: boolean;
}

/**
 * Genera la cuadrícula de calendario mensual con PnL agrupado por día.
 * Soporta navegación entre meses. La semana comienza en Lunes.
 */
export function generateCalendarData(
  trades: ParsedTrade[],
  year: number,
  month: number // 0-indexed (0 = Enero)
): { year: number; month: number; days: CalendarDayData[] } {
  // Agrupar trades por fecha YYYY-MM-DD
  const tradesByDate: Record<string, { pnl: number; count: number; wins: number; losses: number }> = {};
  trades.forEach((t) => {
    try {
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!tradesByDate[key]) {
        tradesByDate[key] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      }
      tradesByDate[key].pnl += t.netPnl;
      tradesByDate[key].count += 1;
      if (t.netPnl > 0) tradesByDate[key].wins += 1;
      else if (t.netPnl < 0) tradesByDate[key].losses += 1;
    } catch {
      // skip
    }
  });

  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDay.getDate();

  // Día de la semana del primer día (JS: 0=Domingo, ajustar para Lunes=0)
  let startDow = firstDay.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  startDow = startDow === 0 ? 6 : startDow - 1; // Ahora 0=Lun, 6=Dom

  const days: CalendarDayData[] = [];

  // Días del mes anterior para rellenar
  const prevMonthLastDay = new Date(year, month, 0);
  const prevMonthTotal = prevMonthLastDay.getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const dayNum = prevMonthTotal - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const info = tradesByDate[dateStr];
    days.push({
      date: dateStr,
      dayOfMonth: dayNum,
      pnl: info ? Number(info.pnl.toFixed(2)) : 0,
      tradesCount: info ? info.count : 0,
      wins: info ? info.wins : 0,
      losses: info ? info.losses : 0,
      isCurrentMonth: false,
    });
  }

  // Días del mes actual
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const info = tradesByDate[dateStr];
    days.push({
      date: dateStr,
      dayOfMonth: d,
      pnl: info ? Number(info.pnl.toFixed(2)) : 0,
      tradesCount: info ? info.count : 0,
      wins: info ? info.wins : 0,
      losses: info ? info.losses : 0,
      isCurrentMonth: true,
    });
  }

  // Días del mes siguiente para completar la cuadrícula (hasta 42 celdas o al menos completar la fila)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const info = tradesByDate[dateStr];
      days.push({
        date: dateStr,
        dayOfMonth: d,
        pnl: info ? Number(info.pnl.toFixed(2)) : 0,
        tradesCount: info ? info.count : 0,
        wins: info ? info.wins : 0,
        losses: info ? info.losses : 0,
        isCurrentMonth: false,
      });
    }
  }

  return { year, month, days };
}

/**
 * Auto-detecta el mes más frecuente en los trades para inicializar el calendario.
 */
export function detectTradesMonth(trades: ParsedTrade[]): { year: number; month: number } {
  const now = new Date();
  if (!trades || trades.length === 0) return { year: now.getFullYear(), month: now.getMonth() };

  const monthCounts: Record<string, number> = {};
  trades.forEach((t) => {
    try {
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    } catch {
      // skip
    }
  });

  let maxKey = `${now.getFullYear()}-${now.getMonth()}`;
  let maxCount = 0;
  Object.entries(monthCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxKey = key;
    }
  });

  const [yearStr, monthStr] = maxKey.split("-");
  return { year: parseInt(yearStr), month: parseInt(monthStr) };
}

/**
 * Agrupa el rendimiento por Símbolo/Instrumento.
 */
export function generateSymbolPerformance(trades: ParsedTrade[]): SymbolPerformance[] {
  const map: Record<string, { trades: number; wins: number; losses: number; netPnl: number; grossProfit: number; grossLoss: number }> = {};

  trades.forEach((t) => {
    const sym = t.symbol || "UNKNOWN";
    if (!map[sym]) {
      map[sym] = { trades: 0, wins: 0, losses: 0, netPnl: 0, grossProfit: 0, grossLoss: 0 };
    }
    map[sym].trades++;
    map[sym].netPnl += t.netPnl;
    if (t.netPnl > 0) {
      map[sym].wins++;
      map[sym].grossProfit += t.netPnl;
    } else if (t.netPnl < 0) {
      map[sym].losses++;
      map[sym].grossLoss += Math.abs(t.netPnl);
    }
  });

  return Object.entries(map)
    .map(([symbol, d]) => {
      const winRate = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
      const profitFactor = d.grossLoss > 0 ? d.grossProfit / d.grossLoss : d.grossProfit > 0 ? 99.99 : 0;
      return {
        symbol,
        trades: d.trades,
        wins: d.wins,
        losses: d.losses,
        netPnl: Number(d.netPnl.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        profitFactor: Number(profitFactor.toFixed(2)),
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

/**
 * Genera histograma de distribución de resultados (Buckets de PnL).
 */
export function generatePnlDistribution(trades: ParsedTrade[]): PnlDistributionBucket[] {
  const buckets = [
    { label: "< -$400", min: -Infinity, max: -400, count: 0, pnlTotal: 0 },
    { label: "-$400 a -$200", min: -400, max: -200, count: 0, pnlTotal: 0 },
    { label: "-$200 a -$100", min: -200, max: -100, count: 0, pnlTotal: 0 },
    { label: "-$100 a $0", min: -100, max: -0.001, count: 0, pnlTotal: 0 },
    { label: "Breakeven / $0", min: -0.001, max: 0.001, count: 0, pnlTotal: 0 },
    { label: "$0 a $100", min: 0.001, max: 100, count: 0, pnlTotal: 0 },
    { label: "$100 a $200", min: 100, max: 200, count: 0, pnlTotal: 0 },
    { label: "$200 a $400", min: 200, max: 400, count: 0, pnlTotal: 0 },
    { label: "> $400", min: 400, max: Infinity, count: 0, pnlTotal: 0 },
  ];

  trades.forEach((t) => {
    const pnl = t.netPnl;
    const bucket = buckets.find((b) => pnl >= b.min && pnl <= b.max);
    if (bucket) {
      bucket.count++;
      bucket.pnlTotal += pnl;
    }
  });

  return buckets
    .filter((b) => b.count > 0 || b.label !== "Breakeven / $0")
    .map((b) => ({
      rangeLabel: b.label,
      count: b.count,
      pnlTotal: Number(b.pnlTotal.toFixed(2)),
    }));
}

/**
 * Agrupa operaciones por hora del día (00:00 - 23:00) para detectar mejores horarios.
 */
export function generateHourlyPerformance(trades: ParsedTrade[]): HourlyPerformance[] {
  const hoursMap: Record<number, { trades: number; wins: number; netPnl: number }> = {};

  trades.forEach((t) => {
    let hour = 14; // Default por defecto (horario NY pre-open si no hay hora)
    try {
      const d = new Date(t.openTime);
      if (!isNaN(d.getTime())) {
        hour = d.getHours();
      }
    } catch {
      // fallback
    }
    if (!hoursMap[hour]) {
      hoursMap[hour] = { trades: 0, wins: 0, netPnl: 0 };
    }
    hoursMap[hour].trades++;
    hoursMap[hour].netPnl += t.netPnl;
    if (t.netPnl > 0) hoursMap[hour].wins++;
  });

  return Object.entries(hoursMap)
    .map(([h, d]) => {
      const hourNum = parseInt(h);
      const hourLabel = `${hourNum.toString().padStart(2, "0")}:00`;
      const winRate = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
      return {
        hour: hourLabel,
        netPnl: Number(d.netPnl.toFixed(2)),
        trades: d.trades,
        wins: d.wins,
        winRate: Number(winRate.toFixed(1)),
      };
    })
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

export function generateDailyFrequencyAnalysis(trades: ParsedTrade[]): DailyFrequencyBucket[] {
  if (!trades || trades.length === 0) return [];

  const daysMap: Record<string, { count: number; netPnl: number; wins: number }> = {};

  trades.forEach((t) => {
    const dayKey = t.openTime ? t.openTime.split(" ")[0] : "Sin fecha";
    if (!daysMap[dayKey]) {
      daysMap[dayKey] = { count: 0, netPnl: 0, wins: 0 };
    }
    daysMap[dayKey].count++;
    daysMap[dayKey].netPnl += t.netPnl;
    if (t.netPnl > 0) {
      daysMap[dayKey].wins++;
    }
  });

  const buckets: Record<string, { daysCount: number; totalTrades: number; netPnl: number; winDays: number; winTrades: number }> = {
    "1-2 Operaciones (Selectivo)": { daysCount: 0, totalTrades: 0, netPnl: 0, winDays: 0, winTrades: 0 },
    "3-5 Operaciones (Moderado)": { daysCount: 0, totalTrades: 0, netPnl: 0, winDays: 0, winTrades: 0 },
    "6+ Operaciones (Sobreoperativa)": { daysCount: 0, totalTrades: 0, netPnl: 0, winDays: 0, winTrades: 0 },
  };

  Object.values(daysMap).forEach((d) => {
    let label = "1-2 Operaciones (Selectivo)";
    if (d.count >= 3 && d.count <= 5) label = "3-5 Operaciones (Moderado)";
    else if (d.count >= 6) label = "6+ Operaciones (Sobreoperativa)";

    const b = buckets[label];
    b.daysCount++;
    b.totalTrades += d.count;
    b.netPnl += d.netPnl;
    b.winTrades += d.wins;
    if (d.netPnl > 0) b.winDays++;
  });

  return Object.entries(buckets).map(([bucketLabel, b]) => {
    const averageDailyPnl = b.daysCount > 0 ? b.netPnl / b.daysCount : 0;
    const winRate = b.totalTrades > 0 ? (b.winTrades / b.totalTrades) * 100 : 0;
    const winDaysRate = b.daysCount > 0 ? (b.winDays / b.daysCount) * 100 : 0;

    return {
      bucketLabel,
      daysCount: b.daysCount,
      totalTrades: b.totalTrades,
      netPnl: Number(b.netPnl.toFixed(2)),
      averageDailyPnl: Number(averageDailyPnl.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      winDaysRate: Number(winDaysRate.toFixed(1)),
    };
  });
}

export function calculateHoldingTimeStats(trades: ParsedTrade[]): HoldingTimeStats {
  if (!trades || trades.length === 0) {
    return {
      avgWinnerMinutes: 0,
      avgLoserMinutes: 0,
      avgTotalMinutes: 0,
      ratioWinnerLoserTime: 0,
      hasTimeData: false,
    };
  }

  const tradesWithTime = trades.filter((t) => typeof t.holdingTimeMinutes === "number" && t.holdingTimeMinutes > 0);
  if (tradesWithTime.length === 0) {
    return {
      avgWinnerMinutes: 0,
      avgLoserMinutes: 0,
      avgTotalMinutes: 0,
      ratioWinnerLoserTime: 0,
      hasTimeData: false,
    };
  }

  let winnerTotal = 0;
  let winnerCount = 0;
  let loserTotal = 0;
  let loserCount = 0;
  let overallTotal = 0;

  tradesWithTime.forEach((t) => {
    const mins = t.holdingTimeMinutes!;
    overallTotal += mins;
    if (t.netPnl > 0) {
      winnerTotal += mins;
      winnerCount++;
    } else if (t.netPnl < 0) {
      loserTotal += mins;
      loserCount++;
    }
  });

  const avgWinnerMinutes = winnerCount > 0 ? winnerTotal / winnerCount : 0;
  const avgLoserMinutes = loserCount > 0 ? loserTotal / loserCount : 0;
  const avgTotalMinutes = overallTotal / tradesWithTime.length;
  const ratioWinnerLoserTime = avgLoserMinutes > 0 ? avgWinnerMinutes / avgLoserMinutes : 0;

  return {
    avgWinnerMinutes: Number(avgWinnerMinutes.toFixed(1)),
    avgLoserMinutes: Number(avgLoserMinutes.toFixed(1)),
    avgTotalMinutes: Number(avgTotalMinutes.toFixed(1)),
    ratioWinnerLoserTime: Number(ratioWinnerLoserTime.toFixed(2)),
    hasTimeData: true,
  };
}

const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getISOWeekInfo(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

export function generatePeriodSummaries(
  trades: ParsedTrade[],
  periodType: "week" | "month"
): PeriodSummary[] {
  if (!trades || trades.length === 0) return [];

  const map: Record<
    string,
    {
      periodId: string;
      label: string;
      tradesCount: number;
      winTrades: number;
      lossTrades: number;
      netPnl: number;
      grossProfit: number;
      grossLoss: number;
      dayPnLs: Record<string, number>;
    }
  > = {};

  trades.forEach((t) => {
    let d = new Date(t.openTime);
    if (isNaN(d.getTime())) d = new Date();

    let periodId = "";
    let label = "";

    if (periodType === "week") {
      const { year, week } = getISOWeekInfo(d);
      periodId = `${year}-W${week.toString().padStart(2, "0")}`;
      label = `Semana ${week} (${year})`;
    } else {
      const year = d.getFullYear();
      const month = d.getMonth();
      periodId = `${year}-${(month + 1).toString().padStart(2, "0")}`;
      label = `${SPANISH_MONTHS[month]} ${year}`;
    }

    if (!map[periodId]) {
      map[periodId] = {
        periodId,
        label,
        tradesCount: 0,
        winTrades: 0,
        lossTrades: 0,
        netPnl: 0,
        grossProfit: 0,
        grossLoss: 0,
        dayPnLs: {},
      };
    }

    const p = map[periodId];
    p.tradesCount++;
    p.netPnl += t.netPnl;
    if (t.netPnl > 0) {
      p.winTrades++;
      p.grossProfit += t.netPnl;
    } else if (t.netPnl < 0) {
      p.lossTrades++;
      p.grossLoss += Math.abs(t.netPnl);
    }

    const dayKey = t.openTime.split(" ")[0];
    p.dayPnLs[dayKey] = (p.dayPnLs[dayKey] || 0) + t.netPnl;
  });

  return Object.values(map)
    .sort((a, b) => a.periodId.localeCompare(b.periodId))
    .map((p) => {
      const winRate = p.tradesCount > 0 ? (p.winTrades / p.tradesCount) * 100 : 0;
      const profitFactor =
        p.grossLoss > 0 ? p.grossProfit / p.grossLoss : p.grossProfit > 0 ? 99.99 : 0;

      const dailyVals = Object.values(p.dayPnLs);
      const totalDays = dailyVals.length;
      const winDays = dailyVals.filter((v) => v > 0).length;
      const bestDayPnl = dailyVals.length > 0 ? Math.max(...dailyVals) : 0;
      const worstDayPnl = dailyVals.length > 0 ? Math.min(...dailyVals) : 0;

      return {
        periodId: p.periodId,
        label: p.label,
        periodType,
        tradesCount: p.tradesCount,
        winTrades: p.winTrades,
        lossTrades: p.lossTrades,
        winRate: Number(winRate.toFixed(1)),
        netPnl: Number(p.netPnl.toFixed(2)),
        grossProfit: Number(p.grossProfit.toFixed(2)),
        grossLoss: Number(p.grossLoss.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        bestDayPnl: Number(bestDayPnl.toFixed(2)),
        worstDayPnl: Number(worstDayPnl.toFixed(2)),
        winDays,
        totalDays,
      };
    });
}

