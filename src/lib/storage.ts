import { createClient } from "@/lib/supabase/client";
import { RawTradingViewRow } from "./types";

// ─── Interfaz de datos persistidos ────────────────────────────
export interface PersistedData {
  rawRows: RawTradingViewRow[];
  fileNames: string[];
  savedAt: string; // ISO timestamp
}

/**
 * Guarda los datos crudos del CSV y nombres de archivo en Supabase.
 * Usa UPSERT: si ya existe una sesión para este usuario, la actualiza;
 * si no, crea una nueva.
 */
export async function saveTradeData(
  rawRows: RawTradingViewRow[],
  fileNames: string[]
): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[StateTrading] No hay usuario autenticado, no se puede guardar.");
      return false;
    }

    // Verificar si ya existe una sesión para este usuario
    const { data: existing } = await supabase
      .from("trade_sessions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (existing) {
      // Actualizar la sesión existente
      const { error } = await supabase
        .from("trade_sessions")
        .update({
          file_names: fileNames,
          raw_rows: rawRows,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("[StateTrading] Error al actualizar datos en Supabase:", error);
        return false;
      }
    } else {
      // Crear nueva sesión
      const { error } = await supabase.from("trade_sessions").insert({
        user_id: user.id,
        file_names: fileNames,
        raw_rows: rawRows,
      });

      if (error) {
        console.error("[StateTrading] Error al guardar datos en Supabase:", error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("[StateTrading] Error inesperado al guardar:", err);
    return false;
  }
}

/**
 * Carga los datos guardados previamente desde Supabase.
 * Retorna null si no hay datos guardados o si hay un error al leerlos.
 */
export async function loadTradeData(): Promise<PersistedData | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("trade_sessions")
      .select("file_names, raw_rows, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const rawRows = data.raw_rows as RawTradingViewRow[];
    if (!Array.isArray(rawRows) || rawRows.length === 0) return null;

    return {
      rawRows,
      fileNames: data.file_names as string[],
      savedAt: data.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error("[StateTrading] Error al cargar datos desde Supabase:", err);
    return null;
  }
}

/**
 * Elimina todos los datos de trading del usuario actual en Supabase.
 */
export async function clearTradeData(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("trade_sessions")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("[StateTrading] Error al limpiar datos de Supabase:", error);
    }
  } catch (err) {
    console.error("[StateTrading] Error inesperado al limpiar:", err);
  }
}
