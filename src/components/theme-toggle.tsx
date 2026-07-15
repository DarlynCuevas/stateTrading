"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-700"
      aria-label="Toggle Theme"
      title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
    >
      <Sun className="h-4 w-4 transition-all scale-100 rotate-0 dark:scale-0 dark:-rotate-90 absolute" />
      <Moon className="h-4 w-4 transition-all scale-0 rotate-90 dark:scale-100 dark:rotate-0 absolute" />
    </button>
  );
}
