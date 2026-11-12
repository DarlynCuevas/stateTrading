// @ts-ignore
import CDP from "chrome-remote-interface";

export interface TVExtractedOrder {
  id: string;
  symbol: string;
  side: "COMPRA" | "VENTA";
  qty: number;
  price: number;
  status: number; // 6 = filled/ejecutada, 3 = cancelada/working
  takeProfit?: number;
  stopLoss?: number;
  time: string;
  account?: string;
}

export interface TVExtractedData {
  accountName?: string;
  balance?: number;
  trades?: any[];
  orders: TVExtractedOrder[];
}

/**
 * Lee la memoria interna de TradingView Desktop en localhost:9222
 * a través de Chrome DevTools Protocol (CDP).
 */
export async function extractTradingViewDesktopData(port = 9222): Promise<TVExtractedData> {
  let client: any = null;

  try {
    // 1. Obtener la lista de páginas abiertas en la aplicación TradingView
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!targetsRes.ok) {
      throw new Error("No se pudo conectar a TradingView Desktop. Asegúrate de que la app está abierta.");
    }

    const targets = await targetsRes.json();
    const chartTarget = targets.find(
      (t: any) => t.type === "page" && /tradingview\.com\/chart/i.test(t.url)
    ) || targets.find((t: any) => t.type === "page" && /tradingview/i.test(t.url));

    if (!chartTarget) {
      throw new Error("No se encontró ninguna pestaña de gráfico abierta en TradingView Desktop.");
    }

    // 2. Conectar por WebSocket al runtime de TradingView
    client = await (CDP as any)({ host: "127.0.0.1", port, target: chartTarget.id });
    await client.Runtime.enable();

    // 3. Evaluar el extractor en la sesión de TradingView
    const extractorScript = `(function() {
      try {
        const trading = window.TradingViewApi && window.TradingViewApi._tradingService && window.TradingViewApi._tradingService.trading();
        if (!trading) return { error: "TradingView no tiene activo el servicio de trading" };

        const broker = trading._activeBroker;
        if (!broker) return { error: "No hay broker conectado en TradingView" };
        const conn = broker._brokerConnection;

        // 1. Obtener el nombre real de la cuenta seleccionada en la interfaz de TradingView (ej: APEX6339420000008)
        let accountName = "";
        const accSpan = document.querySelector('[data-qa-id="account-selector"] [class*="accountName"]') ||
                        document.querySelector('[class*="accountName"]');
        if (accSpan && accSpan.textContent) {
          accountName = accSpan.textContent.trim();
        }

        if (conn && conn._accounts && (!accountName || accountName.startsWith("D"))) {
          const curId = broker.currentAccount ? broker.currentAccount() : null;
          const found = conn._accounts.find((a: any) => a.id === curId);
          if (found && found.name) accountName = found.name;
        }

        // 2. Extraer balance/patrimonio desde los campos de resumen de TradingView
        let balance = 0;
        const summaryFields = document.querySelectorAll('[class*="accountSummaryField"]');
        for (let field of summaryFields) {
          const title = field.querySelector('[class*="title"]')?.textContent || "";
          const val = field.querySelector('[class*="value"]')?.textContent || "";
          if (/valoraci|balance|equity|patrimonio/i.test(title)) {
            const clean = val.split('.').join('').replace(',', '.');
            balance = parseFloat(clean) || 0;
            break;
          }
        }

        if (!balance && conn && conn._accountManagerTablesData && conn._accountManagerTablesData["0"]) {
          const row = conn._accountManagerTablesData["0"][0];
          if (row && row.netLiq) {
            balance = parseFloat(row.netLiq) || 0;
          }
        }

        // 3. Extraer EJECUCIONES REALES emparejadas (Round-trip FIFO)
        const execs = (conn && conn._tvExecutions) ? [...conn._tvExecutions] : [];
        execs.sort((a: any, b: any) => a.time - b.time);

        const POINT_VALUES: Record<string, number> = {
          'MNQ': 2, 'NQ': 20, 'MES': 5, 'ES': 50,
          'MGC': 10, 'GC': 100, 'MYM': 0.5, 'YM': 5,
          'M2K': 10, 'RTY': 50
        };

        function getPointValue(sym: string) {
          for (let k in POINT_VALUES) {
            if (sym.includes(k)) return POINT_VALUES[k];
          }
          return 1;
        }

        const trades: any[] = [];
        const openPositions: Record<string, any[]> = {};

        for (let e of execs) {
          const sym = e.symbolDisplayName || e.symbol || 'UNKNOWN';
          const cleanSym = sym.replace(/[^A-Za-z0-9]/g, '');
          if (!openPositions[cleanSym]) openPositions[cleanSym] = [];
          const queue = openPositions[cleanSym];

          if (queue.length > 0 && queue[0].side !== e.side) {
            const openFill = queue.shift();
            const isLong = openFill.side === 1;
            const entryPrice = openFill.price;
            const exitPrice = e.price;
            const diff = isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
            const pv = getPointValue(cleanSym);
            const grossPnl = Number((diff * pv * e.qty).toFixed(2));
            const commission = Number((1.04 * 2 * e.qty).toFixed(2));
            const netPnl = Number((grossPnl - commission).toFixed(2));

            trades.push({
              id: 'TV-' + openFill.id + '-' + e.id,
              symbol: cleanSym,
              type: isLong ? 'COMPRA' : 'VENTA',
              openTime: new Date(openFill.time).toISOString(),
              closeTime: new Date(e.time).toISOString(),
              entryPrice,
              exitPrice,
              quantity: e.qty,
              pnl: grossPnl,
              commission,
              netPnl,
              resultado: netPnl > 0 ? 'TP' : (netPnl < 0 ? 'SL' : 'BE')
            });
          } else {
            queue.push(e);
          }
        }

        // 4. Extraer órdenes crudas
        const rawOrders = (broker._ordersCache && broker._ordersCache._objects) ? broker._ordersCache._objects : {};
        const orders = [];

        for (let id in rawOrders) {
          const o = rawOrders[id];
          if (!o) continue;

          orders.push({
            id: String(o.id || id),
            symbol: o.symbolDisplayName || o.symbol || "UNKNOWN",
            side: o.side === 1 ? "COMPRA" : "VENTA",
            qty: Number(o.qty || o.filledQty || 1),
            price: Number(o.avgPrice || o.price || o.stopPrice || o.limitPrice || 0),
            status: o.status,
            takeProfit: o.takeProfit ? Number(o.takeProfit) : undefined,
            stopLoss: o.stopLoss ? Number(o.stopLoss) : undefined,
            time: o.updateTime ? new Date(o.updateTime).toISOString() : new Date().toISOString(),
            account: accountName || "APEX"
          });
        }

        return {
          accountName,
          balance,
          trades,
          orders
        };
      } catch(e) {
        return { error: e.message };
      }
    })()`;

    const evalResult = await client.Runtime.evaluate({
      expression: extractorScript,
      returnByValue: true,
    });

    const result = evalResult.result.value;

    if (!result) {
      throw new Error("No se recibió respuesta de TradingView Desktop");
    }

    if (result.error) {
      throw new Error(`TradingView: ${result.error}`);
    }

    return result as TVExtractedData;
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignorar error al cerrar
      }
    }
  }
}
