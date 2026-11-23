import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { parseProductRows } from "@/lib/inventory";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Inventário Lojas" },
      { name: "description", content: "Importe a base de produtos com códigos de barras." },
      { property: "og:title", content: "Produtos — Inventário Lojas" },
      { property: "og:description", content: "Importe a base de produtos com códigos de barras." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => supabase.from("products").select("*", { count: "exact", head: true }).then(({ count }) => setCount(count ?? 0));
  useEffect(() => { refresh(); }, []);

  async function onFile(file: File) {
    setBusy(true);
    const wb = XLSX.read(await file.arrayBuffer(), { raw: /\.(csv|txt)$/i.test(file.name) });
    const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
    const rows = sheet ? parseProductRows(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })) : [];
    if (!rows.length) { toast.error("Não encontrei produtos no ficheiro"); setBusy(false); return; }
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("products").upsert(rows.slice(i, i + 500));
      if (error) { toast.error(error.message); break; }
    }
    toast.success(`${rows.length} produtos importados`);
    setBusy(false); refresh();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Base de produtos</h1>
      <p className="mt-1 text-muted-foreground">{count === null ? "…" : `${count} produtos na base`}</p>
      <div className="mt-6 rounded-lg border-2 border-dashed border-input bg-card p-6">
        <p className="font-semibold">Importar ficheiro Excel</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Colunas por esta ordem (1.ª folha): <span className="font-mono">cód. barras · artigo · descrição · stock · valor €</span>.
          Produtos já existentes são atualizados.
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" disabled={busy} className="mt-4 block"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        {busy && <p className="mt-2 text-sm">A importar…</p>}
      </div>
    </main>
  );
}