import { createClient } from "@/lib/supabase/client";
import { Account, Operation } from "./operations";
import { getAuditData as getLocalAuditData } from "./operations";

export interface UserProfile {
  id: string;
  nombre: string;
  alias?: string;
  email?: string;
  avatar_url?: string;
}

/**
 * Obtiene la lista de todos los traders / usuarios del equipo registrados en Supabase.
 */
export async function getTeamMembers(): Promise<UserProfile[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre, alias, email, avatar_url")
      .order("nombre", { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data as UserProfile[];
  } catch (err) {
    console.error("[StateTrading] Error cargando miembros del equipo:", err);
    return [];
  }
}

/**
 * Carga las cuentas y operaciones de un usuario específico desde Supabase.
 * Si no se pasa userId o no hay datos remotos, recurre a los datos locales.
 */
export async function loadUserDataFromSupabase(userId?: string) {
  try {
    const supabase = createClient();

    // 1. Cargar Cuentas
    let accountsQuery = supabase.from("trading_accounts").select("*");
    if (userId) accountsQuery = accountsQuery.eq("user_id", userId);

    const { data: accountsData, error: accError } = await accountsQuery;

    // 2. Cargar Trades
    let tradesQuery = supabase.from("trades").select("*").order("open_time", { ascending: false });
    if (userId) tradesQuery = tradesQuery.eq("user_id", userId);

    const { data: tradesData, error: tradeError } = await tradesQuery;

    if (accError || tradeError || !accountsData || accountsData.length === 0) {
      return { accounts: [], operations: [], accountIds: [], byAccount: {}, accountMap: {} };
    }

    // Limpiar cuentas residuales de clearing de Tradovate (como D724... o "Cuenta (88)")
    const cuentasValidas = accountsData.filter(
      (a: any) => !a.id.startsWith("D724") && a.alias !== "Cuenta (88)"
    );

    if (cuentasValidas.length !== accountsData.length) {
      // Purgar de Supabase en segundo plano
      supabase.from("trading_accounts").delete().like("id", "D724%").then(() => {});
      supabase.from("trading_accounts").delete().eq("alias", "Cuenta (88)").then(() => {});
      supabase.from("trades").delete().like("account_id", "D724%").then(() => {});
    }

    // Normalizar Cuentas
    const accounts: Account[] = cuentasValidas.map((a: any) => ({
      id: a.id,
      nombre: a.alias || a.id,
      alias: a.alias,
      broker: a.broker || "Apex",
      tipo: a.tipo || "fondeo",
      balance: Number(a.saldo_actual),
      balanceInicial: Number(a.saldo_inicial),
      nivelLiquidacion: a.nivel_liquidacion ? Number(a.nivel_liquidacion) : undefined,
      distanciaDrawdown: a.distancia_drawdown ? Number(a.distancia_drawdown) : undefined,
      pnlDia: a.pnl_dia ? Number(a.pnl_dia) : undefined,
      reglas: {
        drawdownTipo: a.drawdown_tipo,
        drawdownMax: a.drawdown_max ? Number(a.drawdown_max) : undefined,
      },
      activa: a.activa ?? true,
      estado: a.estado || (a.activa === false ? "quemada" : "activa"),
      fechaBaja: a.fecha_baja,
      motivoBaja: a.motivo_baja,
    }));

    // Normalizar Operaciones
    const operations: Operation[] = (tradesData || []).map((t: any) => ({
      id: t.id,
      cuentaId: t.account_id,
      real: t.real ?? true,
      symbol: t.symbol,
      type: t.type,
      openTime: t.open_time,
      closeTime: t.close_time,
      entryPrice: Number(t.entry_price || 0),
      exitPrice: Number(t.exit_price || 0),
      quantity: Number(t.quantity || 1),
      pnl: Number(t.pnl || 0),
      commission: Number(t.commission || 0),
      netPnl: Number(t.net_pnl || 0),
      plan: {
        sl: t.sl ? Number(t.sl) : undefined,
        tp: t.tp ? Number(t.tp) : undefined,
        valorPunto: Number(t.valor_punto || 1),
        riesgoUsd: t.riesgo_usd ? Number(t.riesgo_usd) : undefined,
      },
      rMultiple: t.r_multiple ? Number(t.r_multiple) : undefined,
      resultado: t.resultado,
      sesion: t.sesion,
      setup: t.setup,
      auditor: t.auditor,
      errores: t.errores || [],
      aciertos: t.aciertos || [],
      leccion: t.leccion,
      captura: t.captura,
    }));

    const accountIds = accounts.map((c) => c.id);
    const accountMap = accounts.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Account>);
    const byAccount = operations.reduce((acc, op) => {
      const key = op.cuentaId || "sin_asignar";
      if (!acc[key]) acc[key] = [];
      acc[key].push(op);
      return acc;
    }, {} as Record<string, Operation[]>);

    return { accounts, operations, accountIds, byAccount, accountMap };
  } catch (err) {
    console.error("[StateTrading] Error cargando datos desde Supabase:", err);
    return getLocalAuditData();
  }
}

/**
 * Sincroniza tus cuentas y trades locales de trading-state.json hacia Supabase
 * vinculados al usuario logueado actualmente.
 */
export async function syncLocalStateToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "No hay sesión activa de usuario" };
    }

    const localData = getLocalAuditData();
    const userEmail = user.email?.trim().toLowerCase();

    // 1. Asegurar perfil del usuario actual
    await supabase.from("profiles").upsert({
      id: user.id,
      nombre: user.user_metadata?.nombre || user.email?.split("@")[0] || "Trader",
      email: user.email,
    });

    // 2. Filtrar ESTRICTAMENTE solo las cuentas que le pertenecen a este usuario logueado
    // REGLA: Si la cuenta no tiene usuarioEmail o no coincide con user.email, SE IGNORA.
    const cuentasDelUsuario = localData.accounts.filter(
      (c) => c.usuarioEmail && c.usuarioEmail === userEmail
    );

    const idsCuentasUsuario = new Set(cuentasDelUsuario.map((c) => c.id));

    // Obtener cuentas existentes en Supabase para no sobreescribir el saldo real en vivo
    const { data: existingAccounts } = await supabase
      .from("trading_accounts")
      .select("id, saldo_actual, nivel_liquidacion, distancia_drawdown")
      .eq("user_id", user.id);

    const existingMap = new Map((existingAccounts || []).map((a: any) => [a.id, a]));

    // Subir Cuentas del usuario (preservando el saldo en vivo si ya existen)
    for (const cuenta of cuentasDelUsuario) {
      const existing = existingMap.get(cuenta.id);
      const saldoActual = existing?.saldo_actual != null ? existing.saldo_actual : cuenta.balance;
      const nivelLiq = existing?.nivel_liquidacion != null ? existing.nivel_liquidacion : cuenta.nivelLiquidacion;
      const distanciaDd = existing?.distancia_drawdown != null ? existing.distancia_drawdown : cuenta.distanciaDrawdown;

      await supabase.from("trading_accounts").upsert({
        id: cuenta.id,
        user_id: user.id,
        alias: cuenta.nombre,
        broker: cuenta.broker,
        tipo: cuenta.tipo,
        saldo_inicial: cuenta.balanceInicial,
        saldo_actual: saldoActual,
        nivel_liquidacion: nivelLiq,
        distancia_drawdown: distanciaDd,
        pnl_dia: cuenta.pnlDia,
        drawdown_tipo: cuenta.reglas?.drawdownTipo,
        drawdown_max: cuenta.reglas?.drawdownMax,
        activa: cuenta.activa,
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Subir Trades: solo los que pertenezcan a las cuentas de este usuario
    const tradesDelUsuario = localData.operations.filter(
      (op) => op.cuentaId && idsCuentasUsuario.has(op.cuentaId)
    );

    for (const op of tradesDelUsuario) {
      await supabase.from("trades").upsert({
        id: op.id,
        account_id: op.cuentaId,
        user_id: user.id,
        real: op.real,
        symbol: op.symbol,
        type: op.type,
        open_time: op.openTime,
        close_time: op.closeTime,
        entry_price: op.entryPrice,
        exit_price: op.exitPrice,
        quantity: op.quantity,
        pnl: op.pnl,
        commission: op.commission,
        net_pnl: op.netPnl,
        sl: op.plan?.sl,
        tp: op.plan?.tp,
        valor_punto: op.plan?.valorPunto,
        riesgo_usd: op.plan?.riesgoUsd,
        r_multiple: op.rMultiple,
        resultado: op.resultado,
        sesion: op.sesion,
        setup: op.setup,
        auditor: op.auditor,
        errores: op.errores,
        aciertos: op.aciertos,
        leccion: op.leccion,
        captura: op.captura,
      });
    }

    const mensaje = `Sincronizadas ${cuentasDelUsuario.length} cuentas y ${tradesDelUsuario.length} trades para ${user.email}`;
    return { success: true, message: mensaje };
  } catch (err: any) {
    console.error("[StateTrading] Error al sincronizar con Supabase:", err);
    return { success: false, message: err?.message || "Error al sincronizar" };
  }
}

/**
 * Actualiza el estado de una cuenta (activa, quemada, cancelada, superada)
 */
export async function updateAccountStatus(
  accountId: string,
  userId: string,
  status: "activa" | "quemada" | "cancelada" | "superada",
  motivo?: string
) {
  const supabase = createClient();
  const isActiva = status === "activa";
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from("trading_accounts")
      .update({
        activa: isActiva,
        estado: status,
        fecha_baja: isActiva ? null : now,
        motivo_baja: motivo || null,
        updated_at: now,
      })
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) {
      // Fallback si las columnas adicionales no existen en el esquema
      await supabase
        .from("trading_accounts")
        .update({
          activa: isActiva,
          updated_at: now,
        })
        .eq("id", accountId)
        .eq("user_id", userId);
    }
    return { success: true };
  } catch (err: any) {
    console.error("[StateTrading] Error al cambiar estado de cuenta:", err);
    return { success: false, error: err.message };
  }
}
