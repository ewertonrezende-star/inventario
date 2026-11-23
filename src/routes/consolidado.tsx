import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeCounts, STORES, type CountRow } from "@/lib/inventory";

export const Route = createFileRoute("/consolidado")({
  head: () => ({
    meta: [
      { title: "Consolidado — Inventário Lojas" },
      { name: "description", content: "Contagens de todas as pessoas juntas por loja e produto." },
      { property: "og:title", content: "Consolidado — Inventário Lojas" },
      { property: "og:description", content: "Contagens de todas as pessoas juntas por loja e produto." },
    ],
  }),
  component: MergedPage,
});

async function fetchAll<T>(table: "counts" | "products", cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
    if (error || !data) break;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

function MergedPage() {
  const [rows, setRows] = useState<CountRow[]>([]);
  const [products, setProducts] = useState<Map<string, { reference: string | null; description: string; stock: number | null; price: number | null }>>(new Map());
  const [store, setStore] = useState("ALL");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [c, p] = await Promise.all([
      fetchAll<CountRow>("counts", "store_code,barcode,quantity,counter_name"),
      fetchAll<{ barcode: string; reference: string | null; description: string; stock: number | null; price: number | null }>("products", "barcode,reference,description,stock,price"),
    ]);
    setRows(c); setProducts(new Map(p.map((x) => [x.barcode, x]))); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const merged = useMemo(() => mergeCounts(store === "ALL" ? rows : rows.filter((r) => r.store_code === store)), [rows, store]);
  const people = useMemo(() => [...new Set(rows.filter((r) => store === "ALL" || r.store_code === store).map((r) => r.counter_name))], [rows, store]);

  function exportCsv() {
    const lines = ["loja;codigo_barras;artigo;descricao;contado;stock;diferenca;valor_unit;valor_contado;contado_por"];
    for (const m of merged) {
      const p = products.get(m.barcode);
      lines.push([m.store_code, m.barcode, p?.reference ?? "", (p?.description ?? "NÃO ENCONTRADO").replace(/;/g, ","), ...[m.total, p?.stock ?? "", p?.stock != null ? m.total - p.stock : "", p?.price ?? "", p?.price != null ? (m.total * p.price).toFixed(2) : ""].map((v) => String(v).replace(".", ",")), m.counters.join(" / ")].join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventario_${store}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Consolidado</h1>
          <p className="text-muted-foreground">Valor contado: <b className="font-mono">{merged.reduce((a, m) => a + m.total * (products.get(m.barcode)?.price ?? 0), 0).toFixed(2)} €</b> · {merged.length} produtos · {people.length} pessoas: {people.join(", ") || "—"}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="rounded-md border-2 border-input px-4 py-2 font-semibold">Atualizar</button>
          <button onClick={exportCsv} className="rounded-md bg-accent px-4 py-2 font-bold text-accent-foreground">Exportar Excel (CSV)</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[{ code: "ALL", name: "Todas" }, ...STORES].map((s) => (
          <button key={s.code} onClick={() => setStore(s.code)}
            className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${store === s.code ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}>
            {s.code === "ALL" ? "Todas" : `${s.code} ${s.name}`}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr><th className="p-2">Loja</th><th className="p-2">Código</th><th className="p-2">Descrição</th><th className="p-2 text-right">Contado</th><th className="p-2 text-right">Stock</th><th className="p-2 text-right">Dif.</th><th className="p-2 text-right">Valor €</th><th className="p-2">Contado por</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-4 text-muted-foreground">A carregar…</td></tr>}
            {!loading && merged.length === 0 && <tr><td colSpan={8} className="p-4 text-muted-foreground">Sem contagens.</td></tr>}
            {merged.map((m) => {
              const p = products.get(m.barcode);
              return (
                <tr key={m.store_code + m.barcode} className="border-t border-border">
                  <td className="p-2 font-mono font-bold">{m.store_code}</td>
                  <td className="p-2 font-mono">{m.barcode}</td>
                  <td className={`p-2 ${p ? "" : "text-destructive"}`}>{p?.description ?? "Não encontrado"}</td>
                  <td className="p-2 text-right font-mono font-bold">{m.total}</td>
                  <td className="p-2 text-right font-mono">{p?.stock ?? "—"}</td>
                  <td className={`p-2 text-right font-mono font-bold ${p?.stock != null && m.total !== p.stock ? "text-destructive" : "text-success"}`}>{p?.stock != null ? (m.total - p.stock > 0 ? "+" : "") + (m.total - p.stock) : "—"}</td>
                  <td className="p-2 text-right font-mono">{p?.price != null ? (m.total * p.price).toFixed(2) : "—"}</td>
                  <td className="p-2 text-muted-foreground">{m.counters.join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}