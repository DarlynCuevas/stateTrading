"use client";

import * as React from "react";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Table, Files, X, FileSpreadsheet } from "lucide-react";
import { RawTradingViewRow } from "@/lib/types";

interface FileInfo {
  name: string;
  rowCount: number;
  headers: string[];
}

interface CsvUploaderProps {
  onDataLoaded: (rows: RawTradingViewRow[], headers: string[], fileNames: string[]) => void;
  onReset?: () => void;
  fileNames?: string[];
  rowCount?: number;
  dataSource?: "none" | "supabase" | "csv" | "sample";
  lastSaved?: string | null;
}

export function CsvUploader({
  onDataLoaded,
  onReset,
  fileNames,
  rowCount = 0,
  dataSource,
  lastSaved,
}: CsvUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = React.useState<FileInfo[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processMultipleFiles = async (files: File[]) => {
    const csvFiles = files.filter(
      (f) => f.name.endsWith(".csv") || f.type === "text/csv" || f.type === "application/vnd.ms-excel"
    );

    if (csvFiles.length === 0) {
      setError("No se encontraron archivos CSV válidos. Por favor sube archivos con extensión .csv");
      return;
    }

    setError(null);
    setIsProcessing(true);

    const allRows: RawTradingViewRow[] = [];
    const allHeaders: Set<string> = new Set();
    const filesInfo: FileInfo[] = [];

    try {
      for (const file of csvFiles) {
        const result = await new Promise<Papa.ParseResult<RawTradingViewRow>>((resolve, reject) => {
          Papa.parse<RawTradingViewRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results),
            error: (err) => reject(err),
          });
        });

        if (result.errors && result.errors.length > 0) {
          console.warn(`Advertencias de parseo en ${file.name}:`, result.errors);
        }

        const fields = result.meta.fields || [];
        fields.forEach((f) => allHeaders.add(f));

        if (result.data && result.data.length > 0) {
          allRows.push(...result.data);
          filesInfo.push({
            name: file.name,
            rowCount: result.data.length,
            headers: fields,
          });
        }
      }

      if (allRows.length === 0) {
        setError("Los archivos CSV están vacíos o no contienen datos válidos.");
        setIsProcessing(false);
        return;
      }

      setLoadedFiles(filesInfo);
      onDataLoaded(allRows, Array.from(allHeaders), filesInfo.map((f) => f.name));
    } catch (err: any) {
      setError(`Error al procesar los archivos: ${err?.message || "Error desconocido"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMultipleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processMultipleFiles(Array.from(e.target.files));
      // Reset file input so the same files can be re-selected
      e.target.value = "";
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  // Compact view when files are loaded — ultra-clean bar
  if (fileNames && fileNames.length > 0) {
    // Formatear la hora del último guardado
    const savedTimeLabel = lastSaved
      ? (() => {
          try {
            const d = new Date(lastSaved);
            return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          } catch {
            return null;
          }
        })()
      : null;

    return (
      <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-sm transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{rowCount}</span> registros procesados
            <span className="text-slate-400 dark:text-slate-500 ml-1.5">
              ({fileNames.length} {fileNames.length === 1 ? "archivo" : "archivos"})
            </span>
          </span>
          {/* Indicador de persistencia */}
          {dataSource === "supabase" && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Auto-cargado
              {savedTimeLabel && <span className="text-blue-400 dark:text-blue-500 ml-0.5">{savedTimeLabel}</span>}
            </span>
          )}
          {dataSource === "csv" && lastSaved && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Guardado
              {savedTimeLabel && <span className="text-emerald-400 dark:text-emerald-500 ml-0.5">{savedTimeLabel}</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={triggerSelect}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reemplazar
          </button>
          {onReset && (
            <button
              onClick={() => {
                setLoadedFiles([]);
                onReset();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
        className={`relative group cursor-pointer rounded-xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-200 ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 scale-[0.99]"
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/80 shadow-sm"
        } ${isProcessing ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all duration-200 mb-4 border border-slate-200/60 dark:border-slate-700/60">
          {isProcessing ? (
            <RefreshCw className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {isProcessing ? "Procesando archivos..." : "Sube tus archivos CSV de TradingView"}
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-5">
          Arrastra y suelta <strong>todos los archivos CSV a la vez</strong> (Histórico de saldos, Histórico de órdenes, Posiciones, Diario…) — se fusionarán automáticamente.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm hover:opacity-90 transition-opacity">
          <Files className="h-3.5 w-3.5" />
          <span>Seleccionar archivos .csv</span>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <span>✓ Multi-archivo simultáneo</span>
          <span>✓ Fusión inteligente sin duplicados</span>
          <span>✓ 100% local en navegador</span>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
