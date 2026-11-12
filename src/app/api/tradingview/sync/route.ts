import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTradingViewDesktopData } from "@/lib/tradingview/desktop-reader";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Autenticación: vía Bearer token (desde script local) o vía cookie de sesión (desde la web)
    const authHeader = req.headers.get("authorization");
    let user = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: { user: u } } = await supabase.auth.getUser(token);
      user = u;
    } else {
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }

    // 2. Extraer datos: si vienen en el body (desde script de escritorio) se usan directamente;
    // si no, se intenta extraer del TradingView local del servidor.
    let tvData: any = null;
    try {
      const body = await req.json();
      if (body && Array.isArray(body.orders)) {
        tvData = body;
      }
    } catch {
      // Sin body JSON
    }

    if (!tvData) {
      tvData = await extractTradingViewDesktopData();
    }

    if (!tvData.orders || tvData.orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Conectado a TradingView Desktop, pero no hay órdenes recientes en el panel.",
        ordersCount: 0,
      });
    }

    // Limpiar cuentas residuales generadas por ID de clearing de Tradovate (como D724... / Cuenta 88)
    await supabase.from("trades").delete().eq("user_id", user.id).like("account_id", "D724%");
    await supabase.from("trading_accounts").delete().eq("user_id", user.id).like("id", "D724%");
    await supabase.from("trading_accounts").delete().eq("user_id", user.id).eq("alias", "Cuenta (88)");

    // 2. Determinar la cuenta real (ej. "APEX6339420000008")
    let accountId = tvData.accountName || "APEX6339420000008";
    if (accountId.startsWith("D724")) {
      accountId = "APEX6339420000008";
    }

    const ultimosDos = accountId.slice(-2);
    const esFondeada = accountId.toLowerCase().includes("paapex");
    const alias = esFondeada 
      ? `Fondeada 50k (${ultimosDos})` 
      : `Evaluación 25k (${ultimosDos})`;

    const saldoInicial = esFondeada ? 50000 : 25000;
    const saldoActual = tvData.balance && tvData.balance > 0 ? tvData.balance : saldoInicial;

    // Obtener cuenta existente para preservar nivel de liquidación y drawdown
    const { data: existingAcc } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    const nivelLiq = existingAcc?.nivel_liquidacion != null 
      ? Number(existingAcc.nivel_liquidacion)
      : (saldoInicial - (esFondeada ? 2500 : 1500));
    const distanciaDd = Number((saldoActual - nivelLiq).toFixed(2));

    // Asegurar la cuenta en Supabase con saldo y distancia de drawdown actualizados
    await supabase.from("trading_accounts").upsert({
      id: accountId,
      user_id: user.id,
      alias: existingAcc?.alias || alias,
      broker: existingAcc?.broker || "Apex / Tradovate",
      tipo: esFondeada ? "fondeada" : "evaluacion",
      tamano: saldoInicial,
      saldo_inicial: saldoInicial,
      saldo_actual: saldoActual,
      nivel_liquidacion: nivelLiq,
      distancia_drawdown: distanciaDd,
      drawdown_tipo: existingAcc?.drawdown_tipo || "trailing",
      drawdown_max: existingAcc?.drawdown_max || (esFondeada ? 2500 : 1500),
      activa: true,
      updated_at: new Date().toISOString(),
    });

    // 3. Guardar las operaciones en Supabase
    let guardadas = 0;
    for (const order of tvData.orders) {
      await supabase.from("trades").upsert({
        id: `TV-${order.id}`,
        account_id: accountId,
        user_id: user.id,
        real: true,
        symbol: order.symbol,
        type: order.side,
        open_time: order.time,
        entry_price: order.price,
        exit_price: order.price,
        quantity: order.qty,
        sl: order.stopLoss,
        tp: order.takeProfit,
        net_pnl: 0,
        pnl: 0,
        resultado: order.status === 6 ? "EJECUTADA" : "CANCELADA/PENDIENTE",
      });
      guardadas++;
    }

    return NextResponse.json({
      success: true,
      message: `¡Sincronización exitosa desde TradingView Desktop! ${guardadas} órdenes guardadas.`,
      ordersCount: guardadas,
      account: accountId,
    });
  } catch (err: any) {
    console.error("[TV Desktop Sync Error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al sincronizar con TradingView Desktop" },
      { status: 500 }
    );
  }
}
