import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { extractTradingViewDesktopData } from "@/lib/tradingview/desktop-reader";

export async function POST(req: Request) {
  try {
    // 1. Autenticación: vía Bearer token (desde script local) o vía cookie de sesión (desde la web)
    const authHeader = req.headers.get("authorization");
    let user = null;
    let supabase: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    } else {
      supabase = await createServerClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }

    // 2. Extraer datos: si vienen en el body (desde script de escritorio) se usan directamente;
    // si no, se intenta extraer del TradingView local del servidor.
    let body: any = null;
    let tvData: any = null;
    try {
      body = await req.json();
      if (body) {
        tvData = body;
      }
    } catch {
      // Sin body JSON
    }

    if (!tvData) {
      tvData = await extractTradingViewDesktopData();
    }

    // Limpiar cuentas residuales generadas por ID de clearing de Tradovate (como D724... / Cuenta 88)
    await supabase.from("trades").delete().eq("user_id", user.id).like("account_id", "D724%");
    await supabase.from("trading_accounts").delete().eq("user_id", user.id).like("id", "D724%");
    await supabase.from("trading_accounts").delete().eq("user_id", user.id).eq("alias", "Cuenta (88)");

    // Soportar sincronización de múltiples cuentas simultáneas o de una cuenta individual
    const accountsList = Array.isArray(body?.accounts) 
      ? body.accounts 
      : (Array.isArray(tvData?.accounts) ? tvData.accounts : [tvData]);

    let totalGuardadas = 0;
    const cuentasProcesadas: string[] = [];

    for (const accData of accountsList) {
      if (!accData) continue;
      let accountId = accData.accountId || accData.accountName || accData.account || accData.id;
      if (!accountId) continue;
      accountId = String(accountId).trim();

      // Ignorar únicamente identificadores residuales de clearing house de Tradovate
      if (accountId.startsWith("D724") || accountId === "Cuenta (88)") {
        continue;
      }

      const ultimosDos = accountId.slice(-2);
      const esFondeada = accountId.toLowerCase().includes("paapex");
      const alias = esFondeada 
        ? `Fondeada 50k (${ultimosDos})` 
        : `Evaluación 25k (${ultimosDos})`;

      const saldoInicial = esFondeada ? 50000 : 25000;
      const saldoActual = accData.balance && accData.balance > 0 ? accData.balance : saldoInicial;

      // Obtener cuenta existente para preservar nivel de liquidación y drawdown
      const { data: existingAcc } = await supabase
        .from("trading_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Drawdown máximo por defecto: 1000 en evaluación 25k (o 2500 en fondeada 50k)
      const defaultDrawdownMax = esFondeada ? 2500 : 1000;
      const maxDd = existingAcc?.drawdown_max != null 
        ? Number(existingAcc.drawdown_max) 
        : defaultDrawdownMax;

      // Nivel de liquidación y colchón de drawdown
      const nivelLiq = existingAcc?.nivel_liquidacion != null 
        ? Number(existingAcc.nivel_liquidacion)
        : (saldoInicial - maxDd);
      const distanciaDd = Number((saldoActual - nivelLiq).toFixed(2));

      // Auto-detección de cuenta quemada por violación de Drawdown (distancia <= 0, o caída de 1000€ en 25k)
      const drawdownBreached = distanciaDd <= 0 || (saldoActual <= nivelLiq) || ((saldoInicial - saldoActual) >= maxDd);
      const isActiva = existingAcc?.activa === false 
        ? false 
        : (drawdownBreached ? false : (existingAcc?.activa ?? true));

      // Asegurar la cuenta en Supabase con saldo y distancia de drawdown actualizados
      // IMPORTANTE: No incluir 'estado' ya que la columna no existe en el esquema Postgres de trading_accounts.
      const { error: accErr } = await supabase.from("trading_accounts").upsert({
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
        activa: isActiva,
        updated_at: new Date().toISOString(),
      });

      if (accErr) {
        console.error(`[Error upserting account ${accountId}]:`, accErr);
      }

      cuentasProcesadas.push(`${alias}: $${saldoActual.toLocaleString("es-ES")}`);

      // 3. Guardar las operaciones en Supabase
      if (accData.trades && Array.isArray(accData.trades) && accData.trades.length > 0) {
        for (const t of accData.trades) {
          const { error: tErr } = await supabase.from("trades").upsert({
            id: t.id,
            account_id: accountId,
            user_id: user.id,
            real: true,
            symbol: t.symbol,
            type: t.type,
            open_time: t.openTime,
            close_time: t.closeTime,
            entry_price: t.entryPrice,
            exit_price: t.exitPrice,
            quantity: t.quantity,
            pnl: t.pnl,
            commission: t.commission,
            net_pnl: t.netPnl,
            resultado: t.resultado,
          });
          if (tErr) {
            console.error(`[Trade Upsert Error for ${t.id}]:`, tErr);
          }
          totalGuardadas++;
        }
      } else if (accData.orders && Array.isArray(accData.orders)) {
        for (const order of accData.orders) {
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
            resultado: order.status === 2 || order.status === 6 ? "EJECUTADA" : "CANCELADA/PENDIENTE",
          });
          totalGuardadas++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `¡Sincronización multi-cuenta exitosa! ${totalGuardadas} operaciones registradas en ${cuentasProcesadas.length} cuentas.`,
      ordersCount: totalGuardadas,
      cuentas: cuentasProcesadas,
    });
  } catch (err: any) {
    console.error("[TV Desktop Sync Error]:", err);
    return NextResponse.json(
      { error: err.message || "Error al sincronizar con TradingView Desktop" },
      { status: 500 }
    );
  }
}
