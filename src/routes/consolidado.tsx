import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { displayedStock, mergeCounts, STORES, type CountRow, type MergedRow } from "@/lib/inventory";

const db = supabase as any;

export const Route = createFileRoute("/consolidado")({
  head: () => ({ meta: [{ title: "Consolidado — Inventário Coopsintra" }, { name: "description", content: "Conferência do contado contra o stock do armazém correspondente." }] }),
  component: ConsolidatedPage,
});

function ConsolidatedPage() {
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [store, setStore] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const { data: inventories, error: inventoryError } = await db.from("inv_inventarios")
        .select("id,loja,nome,estado,criado_em").eq("estado", "aberto");
      if (inventoryError) throw inventoryError;
      const active = inventories ?? [];
      const inventoryMap = new Map<string, { id: string; loja: string }>();
      for (const inv of active) inventoryMap.set(inv.id, { id: inv.id, loja: inv.loja });

      let counts: CountRow[] = [];
      const ids = active.map((inv: any) => inv.id);
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await db.from("inv_contagens")
          .select("inventario_id,codigo_artigo,codigo_barras_lido,quantidade,utilizador_id,contado_por,dispositivo_id,contado_em")
          .in("inventario_id", ids.slice(i, i + 100));
        if (error) throw error;
        counts = counts.concat((data ?? []) as CountRow[]);
      }

      const merged = mergeCounts(counts, inventoryMap);
      const articleCodes = [...new Set(merged.map((r) => r.codigo_artigo))];
      const stores = [...new Set(merged.map((r) => r.loja))];
      const productData = new Map<string, { descricao: string; preco: number | null }>();
      const stocks = new Map<string, number>();
      for (let i = 0; i < articleCodes.length; i += 300) {
        const { data, error } = await db.from("inv_importacao_primavera")
          .select("artigo,descricao,ultimo_preco_compra,stock_atual,armazem")
          .in("artigo", articleCodes.slice(i, i + 300)).in("armazem", stores);
        if (error) throw error;
        for (const item of data ?? []) {
          if (!productData.has(item.artigo)) {
            productData.set(item.artigo, {
              descricao: item.descricao ?? "",
              preco: item.ultimo_preco_compra == null ? null : Number(item.ultimo_preco_compra),
            });
          }
          stocks.set(`${item.artigo}|${item.armazem}`, Number(item.stock_atual ?? 0));
        }
      }

      for (const row of merged) {
        const article = productData.get(row.codigo_artigo);
        row.descricao = article?.descricao ?? "Artigo sem descrição";
        row.preco = article?.preco ?? null;
        const original = stocks.get(`${row.codigo_artigo}|${row.loja}`);
        row.stockOriginal = original ?? null;
        row.stock = original === undefined ? null : displayedStock(original);
      }
      setRows(merged);
    } catch (e: any) {
      toast.error(`Erro ao carregar o Consolidado: ${e.message ?? e}`);
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => store === "ALL" ? rows : rows.filter((r) => r.loja === store), [rows, store]);
  const totalCountedValue = filtered.reduce((sum, row) => sum + row.contado * (row.preco ?? 0), 0);
  const totalDifference = filtered.reduce((sum, row) => sum + (row.stock == null ? 0 : row.contado - row.stock), 0);

  function exportCsv() {
    const lines = ["loja;artigo;descricao;contado;stock_loja;stock_primavera;diferenca;preco_custo;valor_contado;contado_por"];
    for (const row of filtered) {
      const diff = row.stock == null ? "" : row.contado - row.stock;
      lines.push([
        row.loja, row.codigo_artigo, row.descricao.replace(/;/g, ","),
        row.contado, row.stock ?? "", row.stockOriginal ?? "", diff,
        row.preco ?? "", row.preco == null ? "" : (row.contado * row.preco).toFixed(2),
        row.utilizadores.join(" / "),
      ].map((v) => String(v).replace(".", ",")).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `consolidado_${store}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const availableStores = STORES.filter((s) => s.code !== "CC");

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conferência de inventário</p><h1 className="text-3xl font-extrabold tracking-tight">Consolidado</h1><p className="mt-1 text-muted-foreground">O stock é consultado pelo artigo e pela sigla do armazém da linha.</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} disabled={refreshing} className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">{refreshing ? "A atualizar…" : "Atualizar"}</button><button onClick={exportCsv} disabled={!filtered.length} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">Exportar CSV</button></div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Artigos contados</p><p className="mt-1 font-mono text-2xl font-bold">{filtered.length}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Valor contado</p><p className="mt-1 font-mono text-2xl font-bold">{totalCountedValue.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Diferença total (un.)</p><p className="mt-1 font-mono text-2xl font-bold">{totalDifference}</p></div>
      </section>
      <div className="flex flex-wrap gap-2">{[{ code: "ALL", name: "Todas" }, ...availableStores].map((s) => <button key={s.code} onClick={() => setStore(s.code)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${store === s.code ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>{s.code === "ALL" ? "Todas as lojas" : `${s.code} · ${s.name}`}</button>)}</div>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Loja</th><th className="p-3">Artigo</th><th className="p-3">Descrição</th><th className="p-3 text-right">Contado</th><th className="p-3 text-right">Stock loja</th><th className="p-3 text-right">Diferença</th><th className="p-3 text-right">Valor contado</th><th className="p-3">Contado por</th></tr></thead><tbody>
          {loading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">A carregar dados…</td></tr>}
          {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Ainda não existem contagens nos inventários abertos.</td></tr>}
          {filtered.map((row) => {
            const difference = row.stock == null ? null : row.contado - row.stock;
            return <tr key={`${row.loja}|${row.codigo_artigo}`} className="border-t hover:bg-muted/40"><td className="p-3 font-mono font-bold">{row.loja}</td><td className="p-3 font-mono">{row.codigo_artigo}</td><td className="p-3">{row.descricao}</td><td className="p-3 text-right font-mono font-bold">{row.contado}</td><td className="p-3 text-right font-mono">{row.stock == null ? "—" : row.stock}</td><td className={`p-3 text-right font-mono font-bold ${difference == null ? "" : difference === 0 ? "text-success" : "text-destructive"}`}>{difference == null ? "—" : difference > 0 ? `+${difference}` : difference}</td><td className="p-3 text-right font-mono">{row.preco == null ? "—" : (row.contado * row.preco).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td><td className="p-3 text-muted-foreground">{row.utilizadores.join(", ") || "—"}</td></tr>;
          })}
        </tbody></table></div>
      </section>
      <p className="text-xs text-muted-foreground">Se o stock Primavera estiver negativo, o Consolidado apresenta 0 para comparação. O valor original continua guardado na base. A sigla CC corresponde ao Armazém Central.</p>
    </main>
  );
}
