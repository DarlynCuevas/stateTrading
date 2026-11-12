#!/usr/bin/env node

/**
 * StateTrading Desktop Sync Agent
 * Sincroniza órdenes desde TradingView Desktop local hacia la base de datos de StateTrading.
 * No requiere instalar dependencias adicionales (usa el motor estándar de Node.js).
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, ".sync-config.json");

const SUPABASE_URL = "https://uvhtbmnrxvjgklbqsdwv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2ekGy6sfz9zwO4MqtQMAWg_50cQravb";
const DEFAULT_APP_URL = "http://localhost:3000";

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function loadOrPromptConfig() {
  let config = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      config = {};
    }
  }

  console.log("\n========================================================");
  console.log("       StateTrading · Sincronizador de Escritorio       ");
  console.log("========================================================\n");

  if (!config.appUrl) {
    console.log("Configuración inicial (solo se pide la primera vez):");
    const inputUrl = await askQuestion(
      `URL de la aplicación web [Enter para ${DEFAULT_APP_URL}]: `
    );
    config.appUrl = inputUrl || DEFAULT_APP_URL;
  }

  if (!config.email) {
    config.email = await askQuestion("Tu correo registrado en StateTrading: ");
  }

  if (!config.password) {
    config.password = await askQuestion("Tu contraseña de StateTrading: ");
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  return config;
}

async function authenticate(email, password) {
  process.stdout.write(`[1/4] Autenticando con StateTrading (${email})... `);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.log("❌ Error");
    throw new Error(
      data.error_description || data.msg || "Credenciales incorrectas en StateTrading"
    );
  }

  console.log("✓ Correcto");
  return data.access_token;
}

async function extractTradingViewData(port = 9222) {
  process.stdout.write("[2/4] Conectando a TradingView Desktop (puerto 9222)... ");
  let listRes;
  try {
    listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  } catch {
    console.log("❌ Error");
    throw new Error(
      `No se pudo conectar a TradingView Desktop en el puerto ${port}.\n` +
      `-> Asegúrate de haber iniciado TradingView usando el acceso de sincronización (puerto 9222).`
    );
  }

  const targets = await listRes.json();
  const chartTarget =
    targets.find((t) => t.type === "page" && /tradingview\.com\/chart/i.test(t.url)) ||
    targets.find((t) => t.type === "page" && /tradingview/i.test(t.url));

  if (!chartTarget || !chartTarget.webSocketDebuggerUrl) {
    console.log("❌ Error");
    throw new Error("No se encontró ningún gráfico abierto en TradingView Desktop.");
  }

  console.log("✓ Conectado");
  process.stdout.write("[3/4] Leyendo operaciones y cuenta en vivo... ");

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chartTarget.webSocketDebuggerUrl);

    const extractorScript = `(function() {
      try {
        const trading = window.TradingViewApi && window.TradingViewApi._tradingService && window.TradingViewApi._tradingService.trading();
        if (!trading) return { error: "TradingView no tiene activo el servicio de trading" };

        const broker = trading._activeBroker;
        if (!broker) return { error: "No hay broker conectado en TradingView" };

        let accountName = "";
        const accSpan = document.querySelector('[data-qa-id="account-selector"] [class*="accountName"]') ||
                        document.querySelector('[class*="accountName"]');
        if (accSpan && accSpan.textContent) {
          accountName = accSpan.textContent.trim();
        }

        if (!accountName || accountName.startsWith("D724")) {
          const rawAcc = (broker.currentAccount && typeof broker.currentAccount === 'function') 
            ? broker.currentAccount() 
            : trading._account;
          if (rawAcc && typeof rawAcc === 'string' && !rawAcc.startsWith("D724")) {
            accountName = rawAcc;
          }
        }

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

        return { accountName, balance, orders };
      } catch(e) {
        return { error: e.message };
      }
    })()`;

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
      ws.send(
        JSON.stringify({
          id: 2,
          method: "Runtime.evaluate",
          params: { expression: extractorScript, returnByValue: true },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === 2) {
          ws.close();
          const res = data.result?.result?.value;
          if (!res) {
            console.log("❌ Error");
            return reject(new Error("Respuesta vacía de TradingView"));
          }
          if (res.error) {
            console.log("❌ Error");
            return reject(new Error(res.error));
          }
          console.log("✓ Correcto");
          resolve(res);
        }
      } catch (err) {
        ws.close();
        reject(err);
      }
    };

    ws.onerror = (err) => {
      reject(new Error("Error en conexión WebSocket con TradingView: " + err.message));
    };

    setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("Tiempo de espera agotado al leer TradingView Desktop"));
    }, 10000);
  });
}

async function uploadToStateTrading(appUrl, token, tvData) {
  process.stdout.write("[4/4] Subiendo órdenes a tu perfil en StateTrading... ");
  const cleanUrl = appUrl.replace(/\/+$/, "");
  const syncEndpoint = `${cleanUrl}/api/tradingview/sync`;

  const res = await fetch(syncEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tvData),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    console.log("❌ Error");
    throw new Error(data.error || `Error HTTP ${res.status} al sincronizar`);
  }

  console.log("✓ ¡Éxito!");
  return data;
}

async function main() {
  try {
    const config = await loadOrPromptConfig();
    const token = await authenticate(config.email, config.password);
    const tvData = await extractTradingViewData();

    console.log(`\n    · Cuenta detectada : ${tvData.accountName || "Apex"}`);
    if (tvData.balance) {
      console.log(`    · Saldo en cuenta   : $${tvData.balance.toLocaleString("es-ES")}`);
    }
    console.log(`    · Órdenes leídas    : ${tvData.orders?.length || 0}`);
    console.log("");

    const result = await uploadToStateTrading(config.appUrl, token, tvData);

    console.log("\n========================================================");
    console.log(` ✓ ${result.message || "¡Sincronización completada con éxito!"}`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.log("\nSi cambiaste de contraseña o de URL, puedes editar o borrar:");
    console.log(CONFIG_FILE);
  } finally {
    console.log("\nCerrando en 4 segundos...");
    await new Promise((r) => setTimeout(r, 4000));
    process.exit(0);
  }
}

main();
