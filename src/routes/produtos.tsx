import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { parsePrimaveraRows, type PrimaveraImport } from "@/lib/inventory";

const db = supabase as any;

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Base Primavera — Inventário Coopsintra" }, { name: "description", content: "Importar artigos, códigos de barras e stock por armazém." }] }),
  component: ProductsPage,
});

async function upsertBatches(table: string, rows: any[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 400), { onConflict });
    if (error) throw error;
  }
}

function ProductsPage() {
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [stockCount, setStockCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PrimaveraImport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const [articles, stocks] = await Promise.all([
      db.from("inv_artigos").select("codigo_artigo", { count: "exact", head: true }),
      db.from("inv_stock_lojas").select("codigo_artigo", { count: "exact", head: true }),
    ]);
    if (articles.error) toast.error(articles.error.message);
    else setArticleCount(articles.count ?? 0);
    if (stocks.error) toast.error(stocks.error.message);
    else setStockCount(stocks.count ?? 0);
  }
  useEffect(() => { void refresh(); }, []);

  async function readFile(file: File) {
    setBusy(true); setPreview(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false, raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!sheet) throw new Error("O ficheiro não tem uma primeira folha válida.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
      const parsed = parsePrimaveraRows(rows);
      setPreview(parsed);
      toast.success(`Ficheiro validado: ${parsed.articles.length} artigos, ${parsed.stocks.length} stocks por armazém.`);
    } catch (e: any) {
      toast.error(e.message ?? "Não foi possível ler o ficheiro.");
    } finally { setBusy(false); }
  }

  async function importBase() {
    if (!preview) return;
    setBusy(true);
    try {
      await upsertBatches("inv_artigos", preview.articles, "codigo_artigo");
      if (preview.barcodes.length) await upsertBatches("inv_codigos_barras", preview.barcodes, "codigo_barras,codigo_artigo");
      await upsertBatches("inv_stock_lojas", preview.stocks, "codigo_artigo,armazem");
      toast.success("Base Primavera importada. As contagens e os inventários existentes foram preservados.");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e: any) {
      toast.error(`A importação foi interrompida: ${e.message ?? e}. Verifica as permissões e volta a importar o mesmo ficheiro; os registos são atualizados por chave, não acumulados.`);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados de referência</p><h1 className="text-3xl font-extrabold tracking-tight">Importar base Primavera</h1><p className="mt-1 max-w-3xl text-muted-foreground">Carrega o Excel exportado do Primavera. A aplicação separa os artigos, códigos de barras e o stock de cada armazém, usando a sigla da coluna Armazém.</p></section>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Artigos na base</p><p className="mt-1 font-mono text-3xl font-bold">{articleCount ?? "—"}</p></div>
        <div className="rounded-xl border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">Registos de stock por armazém</p><p className="mt-1 font-mono text-3xl font-bold">{stockCount ?? "—"}</p></div>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-bold">Ficheiro esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">A primeira folha deve conter os cabeçalhos do Primavera, incluindo:</p>
        <div className="mt-3 flex flex-wrap gap-2">{["cod barras","Artigo","Descrição","Stock Atual","Últ. Preço de Compra (Artigo)","Armazém"].map((h) => <span key={h} className="rounded-md bg-muted px-3 py-1.5 font-mono text-xs">{h}</span>)}</div>
        <p className="mt-3 text-sm text-muted-foreground">Armazéns reconhecidos: AL, AM, CO, MM, LC, SA e CC. O stock negativo é preservado na base original, mas será apresentado como zero no Consolidado. Linhas sem código de barras são aceites.</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" disabled={busy} className="mt-5 block w-full rounded-lg border bg-background p-3 text-sm" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readFile(file); }} />
        {busy && <p className="mt-3 text-sm text-muted-foreground">A processar…</p>}
      </section>
      {preview && <section className="rounded-xl border-2 border-primary/30 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Pré-visualização da importação</h2><p className="text-sm text-muted-foreground">Confirma os totais antes de atualizar a base.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Validado</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Artigos</p><strong className="font-mono text-2xl">{preview.articles.length}</strong></div>
          <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Associações de barras</p><strong className="font-mono text-2xl">{preview.barcodes.length}</strong></div>
          <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Stocks por loja</p><strong className="font-mono text-2xl">{preview.stocks.length}</strong></div>
          <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Linhas ignoradas</p><strong className="font-mono text-2xl">{preview.rowsSkipped}</strong></div>
        </div>
        {preview.duplicateStocks > 0 && <p className="mt-3 text-sm text-amber-700">{preview.duplicateStocks} combinações artigo/armazém repetidas. Foi mantida a última linha de cada combinação.</p>}
        <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void importBase()} className="rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">Importar e atualizar base</button><button disabled={busy} onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }} className="rounded-lg border px-5 py-3 font-semibold">Cancelar</button></div>
        <p className="mt-3 text-xs text-muted-foreground">A operação não apaga contagens nem inventários. Os stocks são substituídos por artigo e armazém; não são somados aos valores anteriores.</p>
      </section>}
    </main>
  );
}
