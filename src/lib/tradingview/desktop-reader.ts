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

        // 1. Obtener el nombre real de la cuenta seleccionada en la interfaz de TradingView (ej: APEX6339420000008)
        let accountName = "";
        const accSpan = document.querySelector('[data-qa-id="account-selector"] [class*="accountName"]') ||
                        document.querySelector('[class*="accountName"]');
        if (accSpan && accSpan.textContent) {
          accountName = accSpan.textContent.trim();
        }

        // Si no está en el DOM, revisar si broker o trading tienen cuenta que no sea el ID interno D724...
        if (!accountName || accountName.startsWith("D724")) {
          const rawAcc = (broker.currentAccount && typeof broker.currentAccount === 'function') 
            ? broker.currentAccount() 
            : trading._account;
          if (rawAcc && typeof rawAcc === 'string' && !rawAcc.startsWith("D724")) {
            accountName = rawAcc;
          }
        }

        // 2. Extraer balance/patrimonio desde los campos de resumen de TradingView
        let balance = 0;
        const summaryFields = document.querySelectorAll('[class*="accountSummaryField"]');
        for (let field of summaryFields) {
          const title = field.querySelector('[class*="title"]')?.textContent || "";
          const val = field.querySelector('[class*="value"]')?.textContent || "";
          if (/valoraci|balance|equity|patrimonio/i.test(title)) {
            // Formato español: 24.595,16 -> 24595.16
            const clean = val.split('.').join('').replace(',', '.');
            balance = parseFloat(clean) || 0;
            break;
          }
        }

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
