export const STORES = [
  { code: "AL", name: "Albarraque" },
  { code: "AM", name: "Arneiro Marinheiro" },
  { code: "CO", name: "Colares" },
  { code: "MM", name: "Mem Martins" },
  { code: "LC", name: "Sintra" },
  { code: "SA", name: "Sabugo" },
  { code: "CC", name: "Armazém Central" },
] as const;

export type StoreCode = (typeof STORES)[number]["code"];
export type CountRow = {
  inventario_id: string;
  codigo_artigo: string;
  codigo_barras_lido: string | null;
  quantidade: number;
  utilizador_id: string | null;
  dispositivo_id: string | null;
  contado_em: string;
};
export type MergedRow = {
  loja: string;
  inventario_id: string;
  codigo_artigo: string;
  descricao: string;
  contado: number;
  stock: number | null;
  stockOriginal: number | null;
  preco: number | null;
  utilizadores: string[];
};

export function mergeCounts(rows: CountRow[], inventories: Map<string, { loja: string; id: string }>, names = new Map<string, string>()) {
  const map = new Map<string, MergedRow>();
  for (const row of rows) {
    const inv = inventories.get(row.inventario_id);
    if (!inv) continue;
    const key = `${inv.loja}|${row.codigo_artigo}`;
    const current = map.get(key) ?? {
      loja: inv.loja, inventario_id: inv.id, codigo_artigo: row.codigo_artigo,
      descricao: "", contado: 0, stock: null, stockOriginal: null, preco: null, utilizadores: [],
    };
    current.contado += Number(row.quantidade || 0);
    const person = row.utilizador_id ? (names.get(row.utilizador_id) ?? row.utilizador_id.slice(0, 8)) : "Contagem";
    if (!current.utilizadores.includes(person)) current.utilizadores.push(person);
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => a.loja.localeCompare(b.loja) || a.codigo_artigo.localeCompare(b.codigo_artigo));
}

export type PrimaveraArticle = { codigo_artigo: string; descricao: string; preco_custo: number | null; ativo: boolean; atualizado_em: string };
export type PrimaveraBarcode = { codigo_barras: string; codigo_artigo: string };
export type PrimaveraStock = { codigo_artigo: string; armazem: string; stock_atual: number; atualizado_em: string };
export type PrimaveraImport = {
  articles: PrimaveraArticle[];
  barcodes: PrimaveraBarcode[];
  stocks: PrimaveraStock[];
  rowsRead: number;
  rowsSkipped: number;
  duplicateStocks: number;
};

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseLocaleNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let raw = String(value).trim().replace(/[€\s]/g, "");
  if (!raw) return null;
  if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (raw.includes(",")) raw = raw.replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const HEADER_ALIASES = {
  barcode: ["codbarras", "codigobarras", "ean", "ean13", "barcode"],
  article: ["artigo", "codigoartigo", "referencia", "ref"],
  description: ["descricao", "designacao", "nome"],
  stock: ["stockatual", "stock", "existencia", "existencias"],
  price: ["ultprecocompraartigo", "ultimoprecocompraartigo", "precocusto", "preco"],
  warehouse: ["armazem", "loja", "codigoarmazem"],
};

function findColumn(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parsePrimaveraRows(rows: unknown[][]): PrimaveraImport {
  const headerIndex = rows.slice(0, 20).findIndex((row) => {
    const h = row.map(normalize);
    return findColumn(h, HEADER_ALIASES.article) >= 0 &&
      findColumn(h, HEADER_ALIASES.description) >= 0 &&
      findColumn(h, HEADER_ALIASES.stock) >= 0 &&
      findColumn(h, HEADER_ALIASES.warehouse) >= 0;
  });
  if (headerIndex < 0) throw new Error("Não encontrei os cabeçalhos Artigo, Descrição, Stock Atual e Armazém.");
  const headers = rows[headerIndex].map(normalize);
  const col = {
    barcode: findColumn(headers, HEADER_ALIASES.barcode),
    article: findColumn(headers, HEADER_ALIASES.article),
    description: findColumn(headers, HEADER_ALIASES.description),
    stock: findColumn(headers, HEADER_ALIASES.stock),
    price: findColumn(headers, HEADER_ALIASES.price),
    warehouse: findColumn(headers, HEADER_ALIASES.warehouse),
  };
  const storeCodes = new Set(STORES.map((s) => s.code));
  const articles = new Map<string, PrimaveraArticle>();
  const barcodes = new Map<string, PrimaveraBarcode>();
  const barcodeOwners = new Map<string, string>();
  const stocks = new Map<string, PrimaveraStock>();
  let rowsRead = 0, rowsSkipped = 0, duplicateStocks = 0;
  const now = new Date().toISOString();

  for (const row of rows.slice(headerIndex + 1)) {
    const codigo_artigo = String(row[col.article] ?? "").trim();
    const descricao = String(row[col.description] ?? "").trim();
    const armazem = String(row[col.warehouse] ?? "").trim().toUpperCase();
    if (!codigo_artigo && !descricao && !armazem) continue;
    rowsRead++;
    const stock = parseLocaleNumber(row[col.stock]);
    if (!codigo_artigo || !descricao || !storeCodes.has(armazem) || stock === null) { rowsSkipped++; continue; }

    const preco_custo = col.price >= 0 ? parseLocaleNumber(row[col.price]) : null;
    articles.set(codigo_artigo, { codigo_artigo, descricao, preco_custo, ativo: true, atualizado_em: now });

    const barcode = col.barcode >= 0 ? String(row[col.barcode] ?? "").trim() : "";
    if (barcode) {
      const owner = barcodeOwners.get(barcode);
      if (owner && owner !== codigo_artigo) {
        throw new Error("O código de barras " + barcode + " aparece associado aos artigos " + owner + " e " + codigo_artigo + ". Corrige o Excel antes de importar.");
      }
      barcodeOwners.set(barcode, codigo_artigo);
      barcodes.set(`${barcode}|${codigo_artigo}`, { codigo_barras: barcode, codigo_artigo });
    }

    const stockKey = `${codigo_artigo}|${armazem}`;
    if (stocks.has(stockKey)) duplicateStocks++;
    stocks.set(stockKey, { codigo_artigo, armazem, stock_atual: stock, atualizado_em: now });
  }

  if (!articles.size) throw new Error("O ficheiro não contém linhas válidas. Confirma as colunas e as siglas dos armazéns.");
  return { articles: [...articles.values()], barcodes: [...barcodes.values()], stocks: [...stocks.values()], rowsRead, rowsSkipped, duplicateStocks };
}

export function displayedStock(stock: number | null | undefined): number | null {
  return stock == null ? null : Math.max(0, Number(stock));
}
