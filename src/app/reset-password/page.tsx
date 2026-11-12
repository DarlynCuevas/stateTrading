"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  KeyRound,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [hasValidSession, setHasValidSession] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Verificar si hay una sesión válida proveniente del enlace de recuperación
  React.useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      // 1. Verificar si hay un evento o hash de recuperación
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (mounted) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
        return;
      }

      // 2. Escuchar por si Supabase procesa el hash de la URL
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          if (mounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
        }
      });

      // Timeout de seguridad por si el link ya caducó
      setTimeout(() => {
        if (mounted) {
          setCheckingSession(false);
        }
      }, 3500);

      return () => {
        subscription.unsubscribe();
      };
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "No se pudo actualizar la contraseña.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
        }, 2200);
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
            Restablecer Contraseña
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 overflow-hidden p-6 space-y-5">
          {checkingSession ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verificando enlace de recuperación...
              </p>
            </div>
          ) : !hasValidSession && !success ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Enlace caducado o inválido
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  El enlace para restablecer tu contraseña ya fue utilizado o ha expirado. Por favor, solicita uno nuevo desde la pantalla de inicio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tu nueva contraseña ha sido guardada correctamente. Entrando a tu cuenta...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-emerald-500" />
                  Escribe tu nueva contraseña
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Elige una contraseña segura de al menos 6 caracteres.
                </p>
              </div>

              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>Guardar Nueva Contraseña</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
