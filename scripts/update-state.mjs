#!/usr/bin/env node
/**
 * StateTrading: actualiza data/trading-state.json SIN borrar el historial.
 *
 * Uso:
 *   node scripts/update-state.mjs add-trade <archivo.json | ->     Añade o completa operaciones (por id)
 *   node scripts/update-state.mjs add-order <archivo.json | ->     Añade o actualiza órdenes abiertas (por id)
 *   node scripts/update-state.mjs cancel-order <id> [motivo]       Pasa una orden abierta al historial de canceladas
 *   node scripts/update-state.mjs snapshot <archivo.json | ->      Foto diaria de cuentas (por cuentaId + fecha)
 *   node scripts/update-state.mjs summary                          Solo recalcula los resúmenes semanales
 *
 * Opción: --file <ruta> (por defecto data/trading-state.json)
 *
 * Reglas:
 * - Nada se borra. Un id que ya existe se COMPLETA: los campos nuevos que no son null
 *   sobrescriben y los que vienen null no pisan lo que ya había.
 * - Cuando una operación cerrada tiene el mismo id que una orden abierta, la orden pasa
 *   a "ordenesHistorial" con estado "ejecutada".
 * - Antes de escribir se guarda una copia en data/backups/.
 * - Los resúmenes semanales se recalculan desde las operaciones y conservan los campos
 *   manuales (foco, focoAnteriorCumplido, erroresRepetidos, estado).
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const FILE = path.resolve(fileIdx >= 0 ? args.splice(fileIdx, 2)[1] : "data/trading-state.json");
const [cmd, arg1, ...rest] = args;

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function readInput(src) {
  if (!src) die("Falta el archivo de entrada (o '-' para leer de stdin).");
  const raw = src === "-" ? fs.readFileSync(0, "utf-8") : fs.readFileSync(src, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

/** Completa `base` con los valores no nulos de `extra` (objetos anidados incluidos). */
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] && !Array.isArray(out[k])) {
      out[k] = merge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function upsert(list, items, keyFn) {
  let added = 0;
  let updated = 0;
  for (const item of items) {
    const key = keyFn(item);
    if (!key || key.includes("undefined")) die(`Elemento sin clave: ${JSON.stringify(item).slice(0, 120)}`);
    const i = list.findIndex((x) => keyFn(x) === key);
    if (i >= 0) {
      list[i] = merge(list[i], item);
      updated++;
    } else {
      list.push(item);
      added++;
    }
  }
  return { added, updated };
}

const byTime = (a, b) => String(a.openTime ?? a.fecha ?? "").localeCompare(String(b.openTime ?? b.fecha ?? ""));

/** Semana ISO ("2026-W46") a partir de una fecha ISO o "AAAA-MM-DD". */
function isoWeek(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + "T12:00:00Z");
  if (isNaN(d)) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function recomputeWeekly(state) {
  const prev = Object.fromEntries((state.resumenesSemanales ?? []).map((s) => [s.periodId, s]));
  const groups = {};
  for (const op of state.operaciones.filter((o) => o.real !== false)) {
    const w = isoWeek(op.openTime);
    if (w) (groups[w] ??= []).push(op);
  }
  const weeks = Object.keys({ ...groups, ...prev }).sort();
  state.resumenesSemanales = weeks.map((w) => {
    const ops = groups[w] ?? [];
    const r = (o) => (typeof o.rMultiple === "number" ? o.rMultiple : null);
    const ganadas = ops.filter((o) => (r(o) ?? o.netPnl ?? 0) > 0).length;
    const perdidas = ops.filter((o) => (r(o) ?? o.netPnl ?? 0) < 0).length;
    const count = (key) =>
      ops.flatMap((o) => o[key] ?? []).reduce((acc, c) => ((acc[c] = (acc[c] ?? 0) + 1), acc), {});
    const old = prev[w] ?? {};
    return {
      periodId: w,
      label: old.label ?? `Semana ${w}`,
      estado: old.estado ?? "provisional",
      operaciones: ops.length,
      ganadas,
      perdidas,
      breakeven: ops.length - ganadas - perdidas,
      winRate: ops.length ? Math.round((ganadas / ops.length) * 1000) / 10 : 0,
      resultadoR: Math.round(ops.reduce((s, o) => s + (r(o) ?? 0), 0) * 100) / 100,
      resultadoUsd: Math.round(ops.reduce((s, o) => s + (o.netPnl ?? 0), 0) * 100) / 100,
      resultadoUsdCompleto: ops.every((o) => typeof o.netPnl === "number"),
      errores: count("errores"),
      aciertos: count("aciertos"),
      erroresRepetidos: old.erroresRepetidos ?? [],
      foco: old.foco ?? null,
      focoAnteriorCumplido: old.focoAnteriorCumplido ?? null,
    };
  });
}

// ─── Carga y copia de seguridad ───
if (!fs.existsSync(FILE)) die(`No existe ${FILE}`);
const state = JSON.parse(fs.readFileSync(FILE, "utf-8"));
state.operaciones ??= [];
state.estadoCuentas ??= [];
state.ordenesAbiertas ??= [];
state.ordenesHistorial ??= [];

const backupDir = path.join(path.dirname(FILE), "backups");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23);
let backupPath = path.join(backupDir, `trading-state_${stamp}.json`);
for (let n = 1; fs.existsSync(backupPath); n++) {
  backupPath = path.join(backupDir, `trading-state_${stamp}_${n}.json`);
}
fs.copyFileSync(FILE, backupPath, fs.constants.COPYFILE_EXCL);
console.log(`Copia de seguridad: ${path.relative(process.cwd(), backupPath)} (archivo: ${FILE})`);

// ─── Comandos ───
let msg = "";
switch (cmd) {
  case "add-trade": {
    const items = readInput(arg1);
    const res = upsert(state.operaciones, items, (o) => o.id);
    for (const t of items) {
      const i = state.ordenesAbiertas.findIndex((o) => o.id === t.id);
      if (i >= 0) {
        const [ord] = state.ordenesAbiertas.splice(i, 1);
        state.ordenesHistorial.push({ ...ord, estado: "ejecutada", cerradaEn: t.closeTime ?? null });
      }
    }
    state.operaciones.sort(byTime);
    msg = `Operaciones: ${res.added} añadidas, ${res.updated} completadas.`;
    break;
  }
  case "add-order": {
    const res = upsert(state.ordenesAbiertas, readInput(arg1), (o) => o.id);
    msg = `Órdenes abiertas: ${res.added} añadidas, ${res.updated} actualizadas.`;
    break;
  }
  case "cancel-order": {
    const i = state.ordenesAbiertas.findIndex((o) => o.id === arg1);
    if (i < 0) die(`No hay ninguna orden abierta con id ${arg1}`);
    const [ord] = state.ordenesAbiertas.splice(i, 1);
    state.ordenesHistorial.push({
      ...ord,
      estado: "cancelada",
      canceladaEn: new Date().toISOString(),
      motivo: rest.join(" ") || null,
    });
    msg = `Orden ${arg1} pasada al historial (cancelada).`;
    break;
  }
  case "snapshot": {
    const res = upsert(state.estadoCuentas, readInput(arg1), (s) => `${s.cuentaId}|${s.fecha}`);
    state.estadoCuentas.sort(byTime);
    msg = `Fotos de cuentas: ${res.added} nuevas, ${res.updated} actualizadas.`;
    break;
  }
  case "summary":
    msg = "Resúmenes recalculados.";
    break;
  default:
    die("Comando no válido. Usa: add-trade | add-order | cancel-order | snapshot | summary");
}

recomputeWeekly(state);
state.actualizadoEn = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + "\n");
console.log(`✔ ${msg} (${state.operaciones.length} operaciones y ${state.estadoCuentas.length} fotos en total)`);
