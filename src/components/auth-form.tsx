"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

interface AuthFormProps {
  onAuthenticated: () => void;
}

export function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(translateAuthError(error.message));
        } else {
          onAuthenticated();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(translateAuthError(error.message));
        } else {
          setSuccessMessage("¡Cuenta creada! Iniciando sesión...");
          // Intentar login automático después del registro
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (loginError) {
            setSuccessMessage("¡Cuenta creada! Revisa tu correo para verificar y luego inicia sesión.");
            setMode("login");
          } else {
            onAuthenticated();
          }
        }
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 mb-4">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            State<span className="text-emerald-500">Trading</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Trading Journal · Auditoría de Fondeo
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden">
          {/* Tab selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3.5 text-xs font-semibold tracking-wide transition-all ${
                mode === "login"
                  ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                Iniciar Sesión
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-3.5 text-xs font-semibold tracking-wide transition-all ${
                mode === "register"
                  ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Crear Cuenta
              </span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
                  required
                  minLength={6}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fadeIn">
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{mode === "login" ? "Iniciando..." : "Creando cuenta..."}</span>
                </>
              ) : (
                <>
                  {mode === "login" ? (
                    <LogIn className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span>{mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className="px-6 pb-5">
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              {mode === "login"
                ? "¿No tienes cuenta? Pulsa \"Crear Cuenta\" arriba"
                : "¿Ya tienes cuenta? Pulsa \"Iniciar Sesión\" arriba"}
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="text-center mt-6">
          <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">
            StateTrading v0.1.0 · Supabase
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Traduce mensajes de error comunes de Supabase Auth al español.
 */
function translateAuthError(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Credenciales incorrectas. Revisa tu email y contraseña.",
    "Email not confirmed": "Tu email no ha sido verificado. Revisa tu bandeja de entrada.",
    "User already registered": "Ya existe una cuenta con este email. Intenta iniciar sesión.",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres.",
    "Signup requires a valid password": "La contraseña no es válida.",
    "Email rate limit exceeded": "Demasiados intentos. Espera un momento y vuelve a intentar.",
    "For security purposes, you can only request this after": "Por seguridad, espera un momento antes de intentar de nuevo.",
  };

  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val;
  }
  return `Error: ${msg}`;
}
