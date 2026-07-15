import { createBrowserClient } from "@supabase/ssr";

/**
 * Crea un cliente de Supabase para componentes cliente ("use client").
 * Usa cookies para la sesión de autenticación (PKCE flow).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
