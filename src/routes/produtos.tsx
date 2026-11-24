import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Base Primavera — Inventário Coopsintra" }, { name: "description", content: "Consulta dos artigos importados do Primavera." }] }),
  component: ProductsPage,
});

type ProductRow = {
  cod_barras: string | null;
  artigo: string;
  descricao: string | null;
  stock_atual: number | null;
  ultimo_preco_compra: number | null;
  armazem: string;
};

function ProductsPage() {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(search = "") {
    setLoading(true);
    try {
      let query = db.from("inv_importacao_primavera")
        .select("cod_barras,artigo,descricao,stock_atual,ultimo_preco_compra,armazem")
        .order("artigo").order("armazem").limit(250);
      if (search.trim()) {
        const value = search.trim();
        const [byBarcode, byArticle, byDescription] = await Promise.all([
          db.from("inv_importacao_primavera").select("cod_barras,artigo,descricao,stock_atual,ultimo_preco_compra,armazem").ilike("cod_barras", `%${value}%`).limit(100),
          db.from("inv_importacao_primavera").select("cod_barras,artigo,descricao,stock_atual,ultimo_preco_compra,armazem").ilike("artigo", `%${value}%`).limit(100),
          db.from("inv_importacao_primavera").select("cod_barras,artigo,descricao,stock_atual,ultimo_preco_compra,armazem").ilike("descricao", `%${value}%`).limit(100),
        ]);
        if (byBarcode.error) throw byBarcode.error;
        if (byArticle.error) throw byArticle.error;
        if (byDescription.error) throw byDescription.error;
        const unique = new Map<string, ProductRow>();
        for (const item of [...(byBarcode.data ?? []), ...(byArticle.data ?? []), ...(byDescription.data ?? [])]) {
          const key = `${item.artigo}|${item.armazem}`;
          if (!unique.has(key)) unique.set(key, item);
        }
        setRows([...unique.values()]);
      } else {
        const [{ data, error }, countResult] = await Promise.all([
          query,
          db.from("inv_importacao_primavera").select("id", { count: "exact", head: true }),
        ]);
        if (error) throw error;
        if (countResult.error) throw countResult.error;
        setRows((data ?? []) as ProductRow[]);
        setTotal(countResult.count ?? 0);
      }
    } catch (e: any) {
      toast.error(`Não foi possível consultar a base Primavera: ${e.message ?? e}`);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Base de referência</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Produtos Primavera</h1>
        <p className="mt-1 text-muted-foreground">Consulta a mesma tabela usada pela contagem: código de barras, artigo, descrição e stock por armazém. Esta página não exige autenticação nem altera os dados.</p>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(term); }} placeholder="Pesquisar por código de barras, artigo ou descrição" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-3" />
          <button onClick={() => void load(term)} disabled={loading} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Pesquisar</button>
          <button onClick={() => { setTerm(""); void load(""); }} disabled={loading} className="rounded-lg border px-4 py-3 font-semibold">Limpar</button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{loading ? "A carregar…" : term.trim() ? `${rows.length} resultados encontrados` : `${total ?? rows.length} linhas na base · a mostrar até 250`}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-3">Código de barras</th><th className="p-3">Artigo</th><th className="p-3">Descrição</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Último preço</th><th className="p-3">Armazém</th></tr></thead>
            <tbody>
              {rows.map((item, i) => <tr key={`${item.artigo}|${item.armazem}|${i}`} className="border-t"><td className="p-3 font-mono">{item.cod_barras ?? "—"}</td><td className="p-3 font-mono">{item.artigo}</td><td className="p-3">{item.descricao ?? "—"}</td><td className="p-3 text-right font-mono">{item.stock_atual ?? "—"}</td><td className="p-3 text-right font-mono">{item.ultimo_preco_compra == null ? "—" : Number(item.ultimo_preco_compra).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}</td><td className="p-3 font-mono">{item.armazem}</td></tr>)}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Não foram encontrados produtos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
