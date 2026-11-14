"use client";

import * as React from "react";
import { ParsedTrade } from "@/lib/types";
import {
  Table,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  BookOpen,
  Edit3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { TradeDetailModal } from "@/components/trade-detail-modal";
import { DisciplineSummary } from "@/components/discipline-summary";

interface TradesTableProps {
  trades: ParsedTrade[];
  onUpdateTrade?: (tradeId: string, updates: Partial<ParsedTrade>) => Promise<void>;
  accountMap?: Record<string, { nombre: string }>;
  showDisciplineSummary?: boolean;
}

type SortColumn =
  | "openTime"
  | "symbol"
  | "entryPrice"
  | "exitPrice"
  | "quantity"
  | "netPnl"
  | "setup";

export function TradesTable({
  trades,
  onUpdateTrade,
  accountMap,
  showDisciplineSummary = true,
}: TradesTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSymbol, setSelectedSymbol] = React.useState("ALL");
  const [selectedSide, setSelectedSide] = React.useState("ALL");
  const [selectedResult, setSelectedResult] = React.useState("ALL");
  const [selectedSetup, setSelectedSetup] = React.useState("ALL");
  const [selectedDiscipline, setSelectedDiscipline] = React.useState("ALL");
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("openTime");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  // Estado para la ficha detallada
  const [selectedTrade, setSelectedTrade] = React.useState<ParsedTrade | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const itemsPerPage = 10;

  // Lista única de símbolos para el filtro
  const uniqueSymbols = React.useMemo(() => {
    const syms = new Set<string>();
    trades.forEach((t) => {
      if (t.symbol) syms.add(t.symbol);
    });
    return Array.from(syms).sort();
  }, [trades]);

  // Lista única de setups para el filtro
  const uniqueSetups = React.useMemo(() => {
    const s = new Set<string>();
    trades.forEach((t) => {
      if (t.setup) s.add(t.setup);
    });
    return Array.from(s).sort();
  }, [trades]);

  // Filtrado y Ordenamiento
  const filteredAndSortedTrades = React.useMemo(() => {
    return trades
      .filter((t) => {
        // Búsqueda por texto (símbolo, fecha, setup, errores, lección)
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchesSym = t.symbol.toLowerCase().includes(q);
          const matchesDate = t.openTime.toLowerCase().includes(q);
          const matchesSetup = t.setup?.toLowerCase().includes(q) ?? false;
          const matchesLesson = t.leccion?.toLowerCase().includes(q) ?? false;
          const matchesError = t.errores?.some((e) => e.toLowerCase().includes(q)) ?? false;
          if (!matchesSym && !matchesDate && !matchesSetup && !matchesLesson && !matchesError) {
            return false;
          }
        }

        // Filtro por Símbolo
        if (selectedSymbol !== "ALL" && t.symbol !== selectedSymbol) return false;

        // Filtro por Lado
        if (selectedSide !== "ALL") {
          const isShort =
            t.type.includes("SHORT") || t.type.includes("VENTA") || t.type === "SELL";
          if (selectedSide === "SHORT" && !isShort) return false;
          if (selectedSide === "LONG" && isShort) return false;
        }

        // Filtro por Resultado
        if (selectedResult !== "ALL") {
          if (selectedResult === "WIN" && t.netPnl <= 0) return false;
          if (selectedResult === "LOSS" && t.netPnl >= 0) return false;
        }

        // Filtro por Setup
        if (selectedSetup !== "ALL") {
          if (selectedSetup === "SIN_SETUP" && t.setup) return false;
          if (selectedSetup !== "SIN_SETUP" && t.setup !== selectedSetup) return false;
        }

        // Filtro por Disciplina
        if (selectedDiscipline !== "ALL") {
          const hasErrors = t.errores && t.errores.length > 0;
          const isAudited =
            hasErrors ||
            (t.aciertos && t.aciertos.length > 0) ||
            !!t.setup ||
            !!t.leccion ||
            !!t.captura;

          if (selectedDiscipline === "ERRORS" && !hasErrors) return false;
          if (selectedDiscipline === "CLEAN" && (hasErrors || !isAudited)) return false;
          if (selectedDiscipline === "UNAUDITED" && isAudited) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortColumn];
        let valB: any = b[sortColumn];

        if (sortColumn === "openTime") {
          valA = new Date(a.openTime).getTime() || 0;
          valB = new Date(b.openTime).getTime() || 0;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    trades,
    searchQuery,
    selectedSymbol,
    selectedSide,
    selectedResult,
    selectedSetup,
    selectedDiscipline,
    sortColumn,
    sortDirection,
  ]);

  // Reseteo de página al cambiar filtros
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedSymbol,
    selectedSide,
    selectedResult,
    selectedSetup,
    selectedDiscipline,
    sortColumn,
    sortDirection,
    trades.length,
  ]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTrades = filteredAndSortedTrades.slice(startIndex, startIndex + itemsPerPage);

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSymbol("ALL");
    setSelectedSide("ALL");
    setSelectedResult("ALL");
    setSelectedSetup("ALL");
    setSelectedDiscipline("ALL");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedSymbol !== "ALL" ||
    selectedSide !== "ALL" ||
    selectedResult !== "ALL" ||
    selectedSetup !== "ALL" ||
    selectedDiscipline !== "ALL";

  const handleRowClick = (t: ParsedTrade) => {
    setSelectedTrade(t);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (tradeId: string, updates: Partial<ParsedTrade>) => {
    if (onUpdateTrade) {
      await onUpdateTrade(tradeId, updates);
    }
    // Actualizar también la referencia del trade actualmente seleccionado
    setSelectedTrade((prev) => (prev && prev.id === tradeId ? { ...prev, ...updates } : prev));
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
        No hay operaciones para mostrar en el historial. Sincroniza desde el agente de escritorio o importa un archivo CSV.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Impacto de la Disciplina & Errores */}
      {showDisciplineSummary && <DisciplineSummary trades={trades} />}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200">
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Table className="h-4 w-4 text-emerald-500" />
              <span>Diario de Operaciones & Journaling Cualitativo</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haz clic en cualquier operación para abrir su ficha, auditar errores, añadir setups y capturas
            </p>
          </div>
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300">
            Mostrando: <span className="font-mono font-bold ml-1">{filteredAndSortedTrades.length}</span> / {trades.length}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
          {/* Input búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Símbolo, Fecha, Setup o Error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro por Símbolo */}
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value="ALL">Símbolo: Todos</option>
            {uniqueSymbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>

          {/* Filtro por Setup */}
          <select
            value={selectedSetup}
            onChange={(e) => setSelectedSetup(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Setup: Todos</option>
            <option value="SIN_SETUP">Sin setup asignado</option>
            {uniqueSetups.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Filtro por Disciplina */}
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Disciplina: Todos</option>
            <option value="ERRORS">⚠️ Con Errores (FOMO, etc.)</option>
            <option value="CLEAN">✓ 100% Limpios</option>
            <option value="UNAUDITED">⚪ Sin Auditar</option>
          </select>

          {/* Filtro por Lado */}
          <select
            value={selectedSide}
            onChange={(e) => setSelectedSide(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Lado: Todos</option>
            <option value="LONG">Long (Compra)</option>
            <option value="SHORT">Short (Venta)</option>
          </select>

          {/* Filtro por Resultado */}
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Resultado: Todos</option>
            <option value="WIN">Ganadoras (+PnL)</option>
            <option value="LOSS">Perdedoras (-PnL)</option>
          </select>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase text-[10px] select-none">
                <th className="p-3.5 w-10 text-center">#</th>
                <th
                  onClick={() => toggleSort("openTime")}
                  className="p-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha y Hora</span>
                    {sortColumn === "openTime" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("symbol")}
                  className="p-3.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Símbolo</span>
                    {sortColumn === "symbol" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="p-3.5 text-center">Lado</th>
                <th className="p-3.5">Setup & Disciplina</th>
                <th
                  onClick={() => toggleSort("entryPrice")}
                  className="p-3.5 text-right font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Entrada</span>
                    {sortColumn === "entryPrice" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("exitPrice")}
                  className="p-3.5 text-right font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Salida</span>
                    {sortColumn === "exitPrice" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("quantity")}
                  className="p-3.5 text-right font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cant.</span>
                    {sortColumn === "quantity" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("netPnl")}
                  className="p-3.5 text-right font-mono cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>PnL Neto</span>
                    {sortColumn === "netPnl" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th className="p-3.5 text-center w-24">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {currentTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Ninguna operación coincide con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                currentTrades.map((t, idx) => {
                  const tradeNum = startIndex + idx + 1;
                  const isPositive = t.netPnl >= 0;
                  const isShort =
                    t.type.includes("SHORT") || t.type.includes("VENTA") || t.type === "SELL";
                  const hasErrors = t.errores && t.errores.length > 0;
                  const hasAciertos = t.aciertos && t.aciertos.length > 0;
                  const hasCapture = !!t.captura;
                  const hasLesson = !!t.leccion;
                  const accountLabel = t.cuentaId && accountMap?.[t.cuentaId]?.nombre;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleRowClick(t)}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    >
                      <td className="p-3.5 text-center font-mono text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                        {tradeNum}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{t.openTime}</span>
                        </div>
                        {accountLabel && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                            {accountLabel}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
                          {t.symbol}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            isShort
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>

                      {/* Setup & Disciplina */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {t.setup ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Tag className="h-2.5 w-2.5" />
                              <span>{t.setup}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Sin setup
                            </span>
                          )}

                          {hasErrors && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              title={t.errores?.join(", ")}
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>{t.errores![0]}</span>
                              {t.errores!.length > 1 && (
                                <span className="text-[9px] font-mono">
                                  +{t.errores!.length - 1}
                                </span>
                              )}
                            </span>
                          )}

                          {hasAciertos && !hasErrors && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                          )}

                          {hasCapture && (
                            <span
                              className="text-cyan-500"
                              title="Tiene captura de pantalla"
                            >
                              <ImageIcon className="h-3 w-3" />
                            </span>
                          )}

                          {hasLesson && (
                            <span
                              className="text-amber-500"
                              title="Tiene lección o notas"
                            >
                              <BookOpen className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {t.entryPrice > 0
                          ? t.entryPrice.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 5,
                            })
                          : "-"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {t.exitPrice > 0
                          ? t.exitPrice.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 5,
                            })
                          : "-"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                        {t.quantity ? t.quantity.toLocaleString("en-US") : "-"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? "+$" : "-$"}
                            {Math.abs(t.netPnl).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {t.commission !== undefined && t.commission > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                              Com: -${t.commission.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Botón Auditar */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(t);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-all flex items-center justify-center gap-1 mx-auto"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Ficha</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</span> a{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {Math.min(startIndex + itemsPerPage, filteredAndSortedTrades.length)}
              </span>{" "}
              de <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredAndSortedTrades.length}</span> operaciones
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-xs font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ficha Detallada */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        accountName={
          selectedTrade?.cuentaId
            ? accountMap?.[selectedTrade.cuentaId]?.nombre
            : undefined
        }
      />
    </div>
  );
}
