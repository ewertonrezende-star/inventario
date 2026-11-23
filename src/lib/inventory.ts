export const STORES = [
  { code: "AL", name: "Albarraque" },
  { code: "AM", name: "Arneiro Marinheiro" },
  { code: "CO", name: "Colares" },
  { code: "MM", name: "Mem Martins" },
  { code: "SA", name: "Sabugo" },
  { code: "LC", name: "Sintra" },
  { code: "CC", name: "Armazém Central" },
] as const;

export type CountRow = { store_code: string; barcode: string; quantity: number; counter_name: string };
export type MergedRow = { store_code: string; barcode: string; total: number; counters: string[] };

/** Junta as contagens de várias pessoas: soma por loja + código de barras. */
export function mergeCounts(rows: CountRow[]): MergedRow[] {
  const map = new Map<string, MergedRow>();
  for (const r of rows) {
    const key = `${r.store_code}|${r.barcode}`;
    const m = map.get(key) ?? { store_code: r.store_code, barcode: r.barcode, total: 0, counters: [] };
    m.total += Number(r.quantity);
    if (!m.counters.includes(r.counter_name)) m.counters.push(r.counter_name);
    map.set(key, m);
  }
  return [...map.values()].sort((a, b) => a.store_code.localeCompare(b.store_code) || a.barcode.localeCompare(b.barcode));
}

export type ProductImport = { barcode: string; reference: string; description: string; stock: number | null; price: number | null };

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[€\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Linhas do Excel por esta ordem: cód. barras, artigo, descrição, stock, valor €. Ignora cabeçalho. */
export function parseProductRows(rows: unknown[][]): ProductImport[] {
  const uniq = new Map<string, ProductImport>();
  for (const r of rows) {
    const barcode = String(r[0] ?? "").trim();
    if (!/^\d+$/.test(barcode)) continue;
    uniq.set(barcode, { barcode, reference: String(r[1] ?? "").trim(), description: String(r[2] ?? "").trim(), stock: num(r[3]), price: num(r[4]) });
  }
  return [...uniq.values()];
}