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

    const extractorScript = `(async function() {
      try {
        const trading = window.TradingViewApi && window.TradingViewApi._tradingService && window.TradingViewApi._tradingService.trading();
        if (!trading) return { error: "TradingView no tiene activo el servicio de trading" };

        const broker = trading._activeBroker;
        if (!broker) return { error: "No hay broker conectado en TradingView" };
        const conn = broker._brokerConnection;

        const POINT_VALUES = {
          'MNQ': 2, 'NQ': 20, 'MES': 5, 'ES': 50,
          'MGC': 10, 'GC': 100, 'MYM': 0.5, 'YM': 5,
          'M2K': 10, 'RTY': 50
        };

        function getPointValue(sym) {
          for (let k in POINT_VALUES) {
            if (sym.includes(k)) return POINT_VALUES[k];
          }
          return 1;
        }

        function pairExecutions(execs) {
          execs.sort((a, b) => a.time - b.time);
          const trades = [];
          const openPositions = {};
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
          return trades;
        }

        let accountsToScan = (conn && conn._accounts && conn._accounts.length > 0)
          ? conn._accounts
          : (broker.accounts && typeof broker.accounts === 'function' ? broker.accounts() : (broker._accounts || []));

        if (!accountsToScan || accountsToScan.length === 0) {
          const cur = broker.currentAccount ? broker.currentAccount() : 'default';
          accountsToScan = [{ id: cur, name: cur }];
        }

        const origAcc = broker.currentAccount ? broker.currentAccount() : null;
        const allAccounts = [];

        for (let acc of accountsToScan) {
          try {
            if (conn && conn.setCurrentAccount) {
              await conn.setCurrentAccount(acc.id);
            }
            // Esperar 2.5s para que TradingView cargue saldos y ejecuciones de esta cuenta
            await new Promise(r => setTimeout(r, 2500));

            // Extraer nombre real de la cuenta
            let finalName = acc.name || acc.accountName || acc.title || "";
            if (!finalName || (typeof finalName === 'string' && finalName.startsWith("D724"))) {
              const domName = document.querySelector('[data-qa-id="account-selector"] [class*="accountName"]')?.textContent?.trim() ||
                              document.querySelector('[class*="accountName"]')?.textContent?.trim();
              if (domName && !domName.startsWith("D724")) {
                finalName = domName;
              } else {
                finalName = String(acc.id || "APEX");
              }
            }

            // Leer saldo (netLiq)
            let balance = 0;
            const summaryTable = conn._accountManagerTablesData ? conn._accountManagerTablesData['0'] : null;
            if (summaryTable) {
              const row = Array.isArray(summaryTable) ? summaryTable[0] : (Array.isArray(summaryTable[0]) ? summaryTable[0][0] : null);
              if (row && row.netLiq) balance = parseFloat(row.netLiq) || 0;
            }

            if (!balance) {
              const summaryFields = document.querySelectorAll('[class*="accountSummaryField"]');
              for (let field of summaryFields) {
                const title = field.querySelector('[class*="title"]')?.textContent || "";
                const val = field.querySelector('[class*="value"]')?.textContent || "";
                if (/valoraci|balance|equity|patrimonio/i.test(title)) {
                  balance = parseFloat(val.split('.').join('').replace(',', '.')) || 0;
                  break;
                }
              }
            }

            // FILTRADO ESTRICTO DE EJECUCIONES POR CUENTA:
            // Cada trade debe pertenecer exclusivamente a la cuenta en la que se ejecutó
            const accIdStr = String(acc.id || "");
            const finalNameStr = String(finalName || "");
            const allExecs = (conn && conn._tvExecutions) ? [...conn._tvExecutions] : [];
            const execs = allExecs.filter(e => {
              if (accountsToScan.length === 1) return true;
              const eAccId = String(e.accountId || e.account || "");
              const eAccName = String(e.accountName || e.account || "");
              if (eAccId && (eAccId === accIdStr || eAccId === finalNameStr)) return true;
              if (eAccName && (eAccName === finalNameStr || eAccName === accIdStr)) return true;
              return false;
            });

            const trades = pairExecutions(execs);

            allAccounts.push({
              accountId: finalName,
              balance,
              trades,
              orders: []
            });
          } catch(e) {}
        }

        // Restaurar cuenta original
        if (origAcc && conn && conn.setCurrentAccount) {
          try { await conn.setCurrentAccount(origAcc); } catch(e) {}
        }

        return { accounts: allAccounts };
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
          params: { expression: extractorScript, awaitPromise: true, returnByValue: true },
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
    }, 30000);
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

    console.log("\nCuentas detectadas en TradingView Desktop:");
    if (tvData.accounts && Array.isArray(tvData.accounts)) {
      for (const a of tvData.accounts) {
        console.log(`  · ${a.accountId}: $${a.balance?.toLocaleString("es-ES")} (${a.trades?.length || 0} operaciones)`);
      }
    } else if (tvData.accountName) {
      console.log(`  · ${tvData.accountName}: $${tvData.balance?.toLocaleString("es-ES")} (${tvData.trades?.length || 0} operaciones)`);
    }
    console.log("");

    const result = await uploadToStateTrading(config.appUrl, token, tvData);

    console.log("\n========================================================");
    console.log(` ✓ ${result.message || "¡Sincronización completada con éxito!"}`);
    if (result.cuentas && Array.isArray(result.cuentas)) {
      for (const c of result.cuentas) {
        console.log(`   - ${c}`);
      }
    }
    console.log("========================================================");
    console.log(" 💡 Sincronización continua activa (cada 1 hora).");
    console.log("    Puedes MINIMIZAR esta ventana y seguir operando.");
    console.log("    (Para detener el sincronizador, cierra esta ventana).");
    console.log("========================================================\n");

    // Bucle de sincronización periódica en segundo plano (cada 1 hora)
    const SYNC_INTERVAL_MS = 60 * 60 * 1000;
    while (true) {
      await new Promise((r) => setTimeout(r, SYNC_INTERVAL_MS));
      const now = new Date().toLocaleTimeString();
      process.stdout.write(`[${now}] Sincronizando TradingView... `);
      try {
        const tvDataLoop = await extractTradingViewData();
        await uploadToStateTrading(config.appUrl, token, tvDataLoop);
        console.log("✓ Al día");
      } catch (loopErr) {
        console.log(`(Esperando gráfico: ${loopErr.message.split("\n")[0]})`);
      }
    }
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.log("\nSi cambiaste de contraseña o de URL, puedes editar o borrar:");
    console.log(CONFIG_FILE);
    console.log("\nCerrando en 10 segundos...");
    await new Promise((r) => setTimeout(r, 10000));
    process.exit(1);
  }
}

main();
