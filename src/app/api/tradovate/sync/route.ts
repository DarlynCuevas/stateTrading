import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TradovateService } from "@/lib/tradovate/client";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener credenciales guardadas del usuario en Supabase (o las pasadas por body)
    let bodyCredentials: any = {};
    try {
      bodyCredentials = await req.json();
    } catch {
      // Body vacío, usará las de la BD
    }

    let credentials = bodyCredentials;

    if (!credentials.username || !credentials.password) {
      // Buscar en Supabase
      const { data: dbCreds } = await supabase
        .from("tradovate_credentials")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!dbCreds) {
        return NextResponse.json(
          { error: "No tienes credenciales de Tradovate guardadas. Configúralas primero." },
          { status: 400 }
        );
      }
      credentials = dbCreds;
    }

    // 2. Conectar a Tradovate
    const tradovate = new TradovateService(credentials.is_live ?? true);
    await tradovate.authenticate({
      name: credentials.username,
      password: credentials.password,
      appId: credentials.app_id || "StateTrading",
      appVersion: credentials.app_version || "1.0",
      cid: credentials.cid,
      sec: credentials.sec,
      isLive: credentials.is_live ?? true,
    });

    // 3. Obtener cuentas y balances de Tradovate
    const [accounts, cashBalances, fills] = await Promise.all([
      tradovate.getAccounts(),
      tradovate.getCashBalances(),
      tradovate.getFills(),
    ]);

    // Crear mapa accountId numérico de Tradovate -> cashBalance
    const balanceMap: Record<number, number> = {};
    const sodMap: Record<number, number> = {};
    const realizedPnLMap: Record<number, number> = {};

    cashBalances.forEach((cb) => {
      balanceMap[cb.accountId] = cb.totalCashValue || cb.amount || 0;
      sodMap[cb.accountId] = cb.sodCashBalance || cb.amount || 0;
      realizedPnLMap[cb.accountId] = cb.realizedPnL || 0;
    });

    // 4. Guardar Cuentas en Supabase
    let cuentasGuardadas = 0;
    for (const acc of accounts) {
      const saldoActual = balanceMap[acc.id] ?? 0;
      const saldoInicial = sodMap[acc.id] ?? saldoActual;
      const pnlDia = realizedPnLMap[acc.id] ?? 0;

      const isEval = acc.name.toLowerCase().startsWith("apex");
      const ultimosDos = acc.name.slice(-2);
      const tipoLabel = isEval ? "Evaluación" : "Fondeada";
      const alias = `${tipoLabel} (${ultimosDos})`;

      await supabase.from("trading_accounts").upsert({
        id: acc.name, // ej: "APEX6339420000008" o "PAAPEX..."
        user_id: user.id,
        alias: alias,
        broker: "Tradovate / Apex",
        tipo: isEval ? "evaluacion" : "fondeada",
        saldo_inicial: saldoInicial,
        saldo_actual: saldoActual,
        pnl_dia: pnlDia,
        activa: acc.active ?? true,
        updated_at: new Date().toISOString(),
      });
      cuentasGuardadas++;
    }

    // 5. Guardar Trades / Fills recientes
    let tradesGuardados = 0;
    for (const fill of fills.slice(0, 50)) { // últimos 50 fills
      const tradeId = `TRD-${fill.id}`;
      
      await supabase.from("trades").upsert({
        id: tradeId,
        user_id: user.id,
        real: true,
        symbol: `ID-${fill.contractId}`,
        type: fill.action === "Buy" ? "COMPRA" : "VENTA",
        open_time: fill.timestamp,
        entry_price: fill.price,
        exit_price: fill.price,
        quantity: fill.qty,
        net_pnl: 0,
        pnl: 0,
        resultado: "COMPLETADA",
      });
      tradesGuardados++;
    }

    return NextResponse.json({
      success: true,
      message: `¡Sincronización con Tradovate exitosa! ${cuentasGuardadas} cuentas y balances actualizados.`,
      accountsCount: cuentasGuardadas,
      tradesCount: tradesGuardados,
    });
  } catch (err: any) {
    console.error("[Tradovate Sync Error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al conectar con la API de Tradovate" },
      { status: 500 }
    );
  }
}
