"use client";

import * as React from "react";
import {
  EconomicCalendarItem,
  NewsArticle,
  NewsApiResponse,
  ImpactLevel,
} from "@/lib/news-types";
import {
  Newspaper,
  CalendarDays,
  Search,
  RefreshCw,
  ExternalLink,
  Flame,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Cpu,
  Building2,
  Coins,
  ShieldAlert,
  FolderOpen,
  Filter,
  CheckCircle2,
  ChevronRight,
  Globe,
} from "lucide-react";

function formatTimeAgo(publishedAt: string): string {
  try {
    const pub = new Date(publishedAt).getTime();
    if (isNaN(pub)) return "Reciente";
    const now = Date.now();
    const diffMin = Math.max(0, Math.floor((now - pub) / (1000 * 60)));

    if (diffMin < 2) return "Ahora mismo";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch {
    return "Reciente";
  }
}

function formatDateHeader(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const eventDate = new Date(year, month, day);

      const now = new Date();
      const isToday =
        now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow =
        tomorrow.getFullYear() === year &&
        tomorrow.getMonth() === month &&
        tomorrow.getDate() === day;

      const formatted = eventDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

      if (isToday) return `Hoy — ${capitalized}`;
      if (isTomorrow) return `Mañana — ${capitalized}`;
      return capitalized;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function NewsSection() {
  const [data, setData] = React.useState<NewsApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Sub-tabs: "news" | "calendar"
  const [subTab, setSubTab] = React.useState<"news" | "calendar">("news");

  // Filtros de Noticias
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("TODAS");

  // Filtros del Calendario
  const [impactFilter, setImpactFilter] = React.useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = React.useState<string>("ALL");

  const fetchNewsData = React.useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Error al obtener noticias");
      const json: NewsApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error al cargar noticias:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNewsData();
    // Auto refrescar cada 5 minutos
    const interval = setInterval(() => {
      fetchNewsData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNewsData]);

  // Filtrado y ordenación cronológica estricta de noticias (las más recientes primero)
  const filteredNews = React.useMemo(() => {
    if (!data?.news) return [];
    return data.news
      .filter((item) => {
        const matchesSearch =
          searchQuery.trim() === "" ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.tickers && item.tickers.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        const matchesCategory =
          selectedCategory === "TODAS" ||
          item.category.toLowerCase() === selectedCategory.toLowerCase();

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const timeA = new Date(a.publishedAt).getTime();
        const timeB = new Date(b.publishedAt).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
  }, [data?.news, searchQuery, selectedCategory]);

  // Filtrado de calendario
  const filteredCalendar = React.useMemo(() => {
    if (!data?.calendar) return [];
    return data.calendar.filter((item) => {
      const matchesImpact =
        impactFilter === "ALL" ||
        item.impact === impactFilter;

      const matchesCurrency =
        currencyFilter === "ALL" ||
        item.country.toUpperCase() === currencyFilter.toUpperCase();

      return matchesImpact && matchesCurrency;
    });
  }, [data?.calendar, impactFilter, currencyFilter]);

  // Agrupación de eventos del calendario por fecha
  const groupedCalendar = React.useMemo(() => {
    const groups: Record<string, EconomicCalendarItem[]> = {};
    for (const item of filteredCalendar) {
      const d = item.date || "Semana actual";
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    }
    return groups;
  }, [filteredCalendar]);

  const quickTickers = ["NVDA", "NASDAQ", "S&P 500", "FED", "AAPL", "TSLA", "BTC"];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Newspaper className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Noticias & Calendario de Mercado
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En directo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Noticias financieras, actualidad empresarial y eventos macroeconómicos sin almacenar nada en base de datos.
            </p>
          </div>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchNewsData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            title="Actualizar datos en tiempo real"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
            <span>{refreshing ? "Actualizando..." : "Refrescar"}</span>
          </button>
        </div>
      </div>

      {/* ─── Navegación por Sub-pestañas ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setSubTab("news")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "news"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Actualidad & Empresas</span>
          {data?.news && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === "news" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {data.news.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === "calendar"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>Carpetas de Impacto (Calendario)</span>
          {data?.calendar && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === "calendar" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {data.calendar.filter((c) => c.impact === "HIGH").length} Rojas
            </span>
          )}
        </button>
      </div>

      {/* ─── VISTA 1: ACTUALIDAD Y NOTICIAS RELEVANTES ─── */}
      {subTab === "news" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Barra de Búsqueda y Filtros Rápidos */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar noticias de mercado (ej: Nvidia, Fed, Wall Street, despidos, chips)..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Categorías */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "TODAS", label: "Todas" },
                  { id: "Empresas & Tech", label: "Empresas & Tech" },
                  { id: "Wall Street", label: "Wall Street" },
                  { id: "Macroeconomía", label: "Macro" },
                  { id: "Cripto", label: "Cripto" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accesos rápidos de Tickers / Términos de actualidad */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Populares:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {quickTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => setSearchQuery(ticker)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    #{ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listado de Noticias */}
          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Consultando fuentes de noticias financieras...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Newspaper className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No se encontraron noticias con ese criterio
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Prueba a restablecer el buscador o seleccionar otra categoría.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("TODAS");
                }}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Ver todas las noticias
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNews.map((article) => {
                const isNvidia = article.title.toLowerCase().includes("nvidia") || article.summary.toLowerCase().includes("nvidia");
                return (
                  <article
                    key={article.id}
                    className={`flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md ${
                      isNvidia
                        ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.02] to-transparent"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            article.category === "Empresas & Tech"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : article.category === "Wall Street"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : article.category === "Macroeconomía"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            {article.category}
                          </span>

                          {article.tickers?.map((ticker) => (
                            <span
                              key={ticker}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {ticker}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(article.publishedAt)}</span>
                        </div>
                      </div>

                      {/* Titular */}
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                      </h3>

                      {/* Resumen */}
                      {article.summary && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>
                      )}
                    </div>

                    {/* Footer con Fuente y Botón */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Globe className="h-3 w-3 text-slate-400" />
                        {article.source}
                      </span>

                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Leer noticia</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA 2: CALENDARIO DE CARPETAS ECONÓMICAS ─── */}
      {subTab === "calendar" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Banner explicativo y de disciplina */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <span className="font-bold">Regla de Protección de Cuenta:</span> Las <strong>Carpetas Rojas (🔴 Alto Impacto)</strong> suelen provocar deslizamiento (slippage), ensanchamiento de spreads y movimientos violentos de decenas de puntos en segundos. Se recomienda no mantener órdenes abiertas ni entrar al mercado entre 5 y 10 minutos antes y después del anuncio.
            </div>
          </div>

          {/* Filtros del Calendario */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Impacto:
              </span>
              {[
                { id: "ALL", label: "Todas las carpetas" },
                { id: "HIGH", label: "🔴 Rojas (Alto)", color: "text-rose-600 font-bold" },
                { id: "MEDIUM", label: "🟠 Naranjas (Medio)", color: "text-amber-600 font-bold" },
                { id: "LOW", label: "🟡 Amarillas (Bajo)", color: "text-yellow-600 font-bold" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setImpactFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    impactFilter === f.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Divisa */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1">Divisa:</span>
              {["ALL", "USD", "EUR", "GBP"].map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrencyFilter(curr)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
                    currencyFilter === curr
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Listado agrupado por días */}
          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <RefreshCw className="h-6 w-6 animate-spin text-rose-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Cargando eventos del calendario económico...</p>
            </div>
          ) : Object.keys(groupedCalendar).length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <FolderOpen className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No hay eventos para los filtros seleccionados
              </p>
              <button
                onClick={() => {
                  setImpactFilter("ALL");
                  setCurrencyFilter("ALL");
                }}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCalendar).map(([dateStr, events]) => (
                <div
                  key={dateStr}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                >
                  {/* Cabecera del Día */}
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatDateHeader(dateStr)}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {events.length} {events.length === 1 ? "evento" : "eventos"}
                    </span>
                  </div>

                  {/* Tabla / Tarjetas de Eventos */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Carpeta según impacto */}
                          <div
                            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                              event.impact === "HIGH"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : event.impact === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                            }`}
                            title={`Carpeta de impacto ${event.impact}`}
                          >
                            <FolderOpen className="h-5 w-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {event.country}
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                {event.time}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  event.impact === "HIGH"
                                    ? "bg-rose-500/10 text-rose-600"
                                    : event.impact === "MEDIUM"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-yellow-500/10 text-yellow-600"
                                }`}
                              >
                                {event.impact === "HIGH"
                                  ? "ALTO IMPACTO"
                                  : event.impact === "MEDIUM"
                                  ? "MEDIO"
                                  : "BAJO"}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                              {event.title}
                            </h4>

                            {event.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Previsiones y Resultados */}
                        <div className="flex items-center gap-4 text-xs font-mono self-end md:self-auto shrink-0 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Previsión</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {event.forecast || "-"}
                            </span>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-sans">Previo</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {event.previous || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
