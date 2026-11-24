import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STORES } from "@/lib/inventory";

const db = supabase as any;

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Contagem — Inventário Coopsintra" }, { name: "description", content: "Contagem por código de barras nas lojas Coopsintra." }] }),
  component: CountPage,
});

type Article = { codigo_artigo: string; descricao: string; stock_atual?: number | null };
type CountEntry = { id: string; codigo_artigo: string; descricao: string; quantidade: number; contado_em: string };

function CountPage() {
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [identityReady, setIdentityReady] = useState(false);
  const [inventory, setInventory] = useState<any>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [current, setCurrent] = useState<Article | null>(null);
  const [qty, setQty] = useState("1");
  const [quick, setQuick] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceId = useRef("");

  useEffect(() => {
    // Recupera a identificação ao regressar da página Consolidado.
    // sessionStorage mantém os dados apenas nesta sessão do separador.
    const savedName = sessionStorage.getItem("inv_session_name") ?? "";
    const savedStore = sessionStorage.getItem("inv_session_store") ?? localStorage.getItem("inv_store") ?? "";
    if (savedName) setName(savedName);
    if (savedStore) setStore(savedStore);
    setIdentityReady(true);

    let id = localStorage.getItem("inv_device_id");
    if (!id) { id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `device-${Date.now()}`; localStorage.setItem("inv_device_id", id); }
    deviceId.current = id;
  }, []);

  useEffect(() => {
    if (!identityReady) return;
    sessionStorage.setItem("inv_session_name", name);
    sessionStorage.setItem("inv_session_store", store);
    if (store) localStorage.setItem("inv_store", store);
  }, [name, store, identityReady]);

  const loadCounts = useCallback(async (inventoryId: string) => {
    const { data, error } = await db.from("inv_contagens")
      .select("id,codigo_artigo,quantidade,contado_em")
      .eq("inventario_id", inventoryId).order("contado_em", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const codes = [...new Set(rows.map((r: any) => r.codigo_artigo).filter(Boolean))];
    const descriptions = new Map<string, string>();
    if (codes.length) {
      const [{ data: articles, error: articleError }, { data: manualArticles, error: manualError }] = await Promise.all([
        db.from("inv_importacao_primavera").select("artigo,descricao").in("artigo", codes),
        db.from("inv_produtos_manuais").select("codigo_artigo,descricao").in("codigo_artigo", codes),
      ]);
      if (articleError) throw articleError;
      if (manualError) throw manualError;
      for (const a of articles ?? []) if (!descriptions.has(a.artigo)) descriptions.set(a.artigo, a.descricao ?? "");
      for (const a of manualArticles ?? []) if (!descriptions.has(a.codigo_artigo)) descriptions.set(a.codigo_artigo, a.descricao ?? "");
    }
    const grouped = new Map<string, CountEntry>();
    for (const row of rows) {
      const existing = grouped.get(row.codigo_artigo);
      if (existing) existing.quantidade += Number(row.quantidade || 0);
      else grouped.set(row.codigo_artigo, { ...row, descricao: descriptions.get(row.codigo_artigo) ?? "Artigo sem descrição", quantidade: Number(row.quantidade || 0) });
    }
    setEntries([...grouped.values()]);
  }, []);

  async function openStore(nextStore: string) {
    if (!name.trim()) { toast.error("Indica primeiro o teu nome."); return; }
    if (!nextStore) { setStore(""); setInventory(null); setEntries([]); if (timerRef.current) clearInterval(timerRef.current); return; }
    setBusy(true);
    try {
      const { data: found, error: findError } = await db.from("inv_inventarios").select("*")
        .eq("loja", nextStore).eq("estado", "aberto").order("criado_em", { ascending: false }).limit(1).maybeSingle();
      if (findError) throw findError;
      let active = found;
      if (!active) {
        const label = STORES.find((s) => s.code === nextStore)?.name ?? nextStore;
        const { data, error } = await db.from("inv_inventarios")
          .insert({ loja: nextStore, nome: `Inventário - ${label}`, estado: "aberto" }).select("*").single();
        if (error) throw error;
        active = data;
      }
      setStore(nextStore); setInventory(active);
      localStorage.setItem("inv_store", nextStore);
      await loadCounts(active.id);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => { void loadCounts(active.id).catch((e) => console.error(e)); }, 4000);
      setTimeout(() => scanRef.current?.focus(), 100);
      toast.success(`Inventário de ${nextStore} aberto`);
    } catch (e: any) {
      toast.error(`Não foi possível abrir a loja: ${e.message ?? e}`);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (identityReady && store && name.trim() && !inventory) void openStore(store);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // Reabre o inventário da loja guardada ao regressar da página Consolidado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, identityReady]);

  async function findArticle(value: string) {
    const scanned = value.trim();
    if (!scanned || !inventory || busy) return;
    setBusy(true);
    try {
      const { data: barcodeRows, error: barcodeError } = await db.from("inv_importacao_primavera")
        .select("artigo,descricao,cod_barras,stock_atual,armazem")
        .eq("cod_barras", scanned).limit(50);
      if (barcodeError) throw barcodeError;
      const barcodeRow = (barcodeRows ?? []).find((row: any) => row.armazem === store) ?? barcodeRows?.[0];
      let article = barcodeRow ? {
        codigo_artigo: barcodeRow.artigo,
        descricao: barcodeRow.descricao ?? "",
        stock_atual: barcodeRow.armazem === store && barcodeRow.stock_atual != null ? Number(barcodeRow.stock_atual) : null,
      } : null;
      if (!article) {
        const { data: articleRows, error: articleError } = await db.from("inv_importacao_primavera")
          .select("artigo,descricao,stock_atual,armazem").eq("artigo", scanned).limit(50);
        if (articleError) throw articleError;
        const found = (articleRows ?? []).find((row: any) => row.armazem === store) ?? articleRows?.[0];
        if (found) article = {
          codigo_artigo: found.artigo,
          descricao: found.descricao ?? "",
          stock_atual: found.armazem === store && found.stock_atual != null ? Number(found.stock_atual) : null,
        };
      }
      if (!article) {
        // Procura também no catálogo de produtos cadastrados manualmente.
        const { data: manual, error: manualError } = await db.from("inv_produtos_manuais")
          .select("codigo_artigo,descricao,codigo_barras").eq("codigo_barras", scanned).maybeSingle();
        if (manualError) throw manualError;
        if (manual) {
          article = { codigo_artigo: manual.codigo_artigo, descricao: manual.descricao ?? "", stock_atual: null };
        } else {
          setManualMode(true);
          setManualDescription("");
          setCode(scanned);
          setCurrent(null);
          toast.warning("Produto não reconhecido. Pode cadastrá-lo agora.");
          return;
        }
      }
      if (quick) {
        const { error: saveError } = await db.from("inv_contagens").insert({
          inventario_id: inventory.id, codigo_artigo: article.codigo_artigo,
          codigo_barras_lido: scanned, quantidade: 1,
          utilizador_id: null, contado_por: name.trim(), dispositivo_id: deviceId.current || null,
        });
        if (saveError) throw saveError;
        setCode("");
        await loadCounts(inventory.id);
        toast.success(`+1 ${article.codigo_artigo}`);
        setTimeout(() => scanRef.current?.focus(), 50);
        return;
      }
      setCurrent(article); setCode(scanned); setQty("1"); setTimeout(() => qtyRef.current?.focus(), 50);
    } catch (e: any) { toast.error(`Erro ao identificar artigo: ${e.message ?? e}`); }
    finally { setBusy(false); }
  }

  async function chooseArticle(article: Article) {
    setCurrent(article); setQty("1"); setTimeout(() => qtyRef.current?.focus(), 50);
  }

  async function searchArticles(termValue = search) {
    const term = termValue.trim();
    if (term.length < 2) { setResults([]); return; }
    setBusy(true);
    try {
      const [byCode, byDescription, byBarcode, byManual] = await Promise.all([
        db.from("inv_importacao_primavera").select("artigo,descricao,stock_atual,armazem").ilike("artigo", `%${term}%`).limit(50),
        db.from("inv_importacao_primavera").select("artigo,descricao,stock_atual,armazem").ilike("descricao", `%${term}%`).limit(50),
        db.from("inv_importacao_primavera").select("artigo,descricao,stock_atual,armazem").ilike("cod_barras", `%${term}%`).limit(50),
        db.from("inv_produtos_manuais").select("codigo_artigo,descricao").or(`codigo_artigo.ilike.%${term}%,descricao.ilike.%${term}%,codigo_barras.ilike.%${term}%`).limit(50),
      ]);
      if (byCode.error) throw byCode.error;
      if (byDescription.error) throw byDescription.error;
      if (byBarcode.error) throw byBarcode.error;
      if (byManual.error) throw byManual.error;
      const unique = new Map<string, Article>();
      for (const a of [...(byCode.data ?? []), ...(byDescription.data ?? []), ...(byBarcode.data ?? [])]) {
        const candidate = {
          codigo_artigo: a.artigo,
          descricao: a.descricao ?? "",
          stock_atual: a.armazem === store && a.stock_atual != null ? Number(a.stock_atual) : null,
        };
        if (!unique.has(a.artigo) || (a.armazem === store && unique.get(a.artigo)?.stock_atual == null)) unique.set(a.artigo, candidate);
      }
      for (const a of byManual.data ?? []) {
        if (!unique.has(a.codigo_artigo)) unique.set(a.codigo_artigo, {
          codigo_artigo: a.codigo_artigo, descricao: a.descricao ?? "", stock_atual: null,
        });
      }
      setResults([...unique.values()]);
    } catch (e: any) { toast.error(`Erro na pesquisa: ${e.message ?? e}`); }
    finally { setBusy(false); }
  }

  // Sugestões automáticas na pesquisa manual enquanto o utilizador escreve.
  // O pequeno debounce evita consultas à base de dados a cada tecla.
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) { setResults([]); return; }
    const timeout = setTimeout(() => { void searchArticles(term); }, 300);
    return () => clearTimeout(timeout);
    // searchArticles usa o termo e a loja atuais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, store]);

  async function saveManualProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!inventory || !code.trim()) return;
    const description = manualDescription.trim();
    if (!description) { toast.error("Indica o nome ou descrição do produto."); return; }
    const quantity = Number(qty.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) { toast.error("Indica uma quantidade válida."); return; }
    setBusy(true);
    try {
      const manualCode = `MAN-${code.trim()}`;
      const { error: productError } = await db.from("inv_produtos_manuais").upsert({
        codigo_artigo: manualCode,
        codigo_barras: code.trim(),
        descricao: description,
        criado_por: name.trim(),
      }, { onConflict: "codigo_barras" });
      if (productError) throw productError;
      const { data: savedProduct, error: lookupError } = await db.from("inv_produtos_manuais")
        .select("codigo_artigo,descricao").eq("codigo_barras", code.trim()).single();
      if (lookupError) throw lookupError;
      const { error: countError } = await db.from("inv_contagens").insert({
        inventario_id: inventory.id,
        codigo_artigo: savedProduct.codigo_artigo,
        codigo_barras_lido: code.trim(),
        quantidade,
        utilizador_id: null,
        contado_por: name.trim(),
        dispositivo_id: deviceId.current || null,
      });
      if (countError) throw countError;
      toast.success(`Produto cadastrado e contagem guardada: ${savedProduct.descricao}`);
      setManualMode(false); setManualDescription(""); setCode(""); setQty("1");
      await loadCounts(inventory.id);
      setTimeout(() => scanRef.current?.focus(), 50);
    } catch (e: any) { toast.error(`Não foi possível cadastrar o produto: ${e.message ?? e}`); }
    finally { setBusy(false); }
  }

  async function saveCount(e: React.FormEvent) {
    e.preventDefault();
    if (!inventory || !current) return;
    const quantity = Number(qty.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) { toast.error("Indica uma quantidade válida."); return; }
    setBusy(true);
    try {
      const { error } = await db.from("inv_contagens").insert({
        inventario_id: inventory.id, codigo_artigo: current.codigo_artigo,
        codigo_barras_lido: code || null, quantidade,
        utilizador_id: null, contado_por: name.trim(), dispositivo_id: deviceId.current || null,
      });
      if (error) throw error;
      toast.success(`Contagem guardada: ${current.codigo_artigo}`);
      setCurrent(null); setCode(""); setQty("1"); setSearch(""); setResults([]);
      await loadCounts(inventory.id); setTimeout(() => scanRef.current?.focus(), 50);
    } catch (e: any) { toast.error(`Não foi possível gravar: ${e.message ?? e}`); }
    finally { setBusy(false); }
  }

  const totalUnits = entries.reduce((sum, row) => sum + row.quantidade, 0);
  const storeName = STORES.find((s) => s.code === store)?.name;
  const availableStores = STORES.filter((s) => s.code !== "CC");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Operação de loja</p><h1 className="text-3xl font-extrabold tracking-tight">Contagem de inventário</h1><p className="mt-1 text-muted-foreground">Leitura por código de barras, com sincronização entre dispositivos.</p></div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3"><span className="text-sm text-muted-foreground">Artigos</span><strong className="font-mono text-xl">{entries.length}</strong><span className="mx-1 h-6 border-l" /><span className="text-sm text-muted-foreground">Unidades</span><strong className="font-mono text-xl">{totalUnits}</strong></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-bold">Identificação</h2>
          <label className="mt-4 block text-sm font-medium">Responsável pela contagem</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" placeholder="Ex.: João, Nuno ou António" className="mt-1 w-full rounded-lg border bg-background px-3 py-3" />
          <label className="mt-4 block text-sm font-medium">Loja / armazém</label>
          <select value={store} disabled={busy || !name.trim()} onChange={(e) => void openStore(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-3">
            <option value="">Selecionar loja</option>{availableStores.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
          </select>
          {!name.trim() && <p className="mt-2 text-xs text-muted-foreground">Escreve o teu nome para poderes selecionar a loja.</p>}
          {inventory && <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">Responsável: <strong>{name}</strong><br />Inventário ativo: <strong>{inventory.nome}</strong></p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Leitura do artigo</h2><label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} /> Modo rápido (1 unidade)</label></div>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void findArticle(code); }}>
              <input ref={scanRef} value={code} onChange={(e) => setCode(e.target.value)} disabled={!inventory || busy || !!current || manualMode} placeholder="Ler código de barras com a pistola" autoComplete="off" className="min-w-0 flex-1 rounded-lg border-2 border-primary/30 bg-background px-4 py-4 font-mono text-xl" />
              <button disabled={!inventory || busy || !!current || manualMode} className="rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50">Procurar</button>
            </form>
            {manualMode && <form onSubmit={saveManualProduct} className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-700">Código não encontrado na base Primavera</p>
              <p className="mt-1 font-mono text-sm">Código lido: {code}</p>
              <label className="mt-3 block text-sm font-medium">Nome / descrição do produto</label>
              <input value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} autoFocus maxLength={200} placeholder="Escreve o nome do produto" className="mt-1 w-full rounded-lg border bg-background px-3 py-3" />
              <label className="mt-3 block text-sm font-medium">Quantidade contada</label>
              <div className="mt-2 flex flex-wrap gap-2"><input ref={qtyRef} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="Quantidade" className="w-36 rounded-lg border bg-background px-3 py-3 text-xl font-bold" /><button disabled={busy} className="flex-1 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Cadastrar e guardar</button><button type="button" onClick={() => { setManualMode(false); setCode(""); setManualDescription(""); scanRef.current?.focus(); }} className="rounded-lg border px-4 py-3">Cancelar</button></div>
            </form>}
            {current && <form onSubmit={saveCount} className="mt-4 rounded-xl border-2 border-accent bg-accent/10 p-4">
              <p className="font-mono text-sm text-muted-foreground">{current.codigo_artigo}</p><h3 className="text-lg font-bold">{current.descricao}</h3><p className="mt-1 text-sm text-muted-foreground">Stock Primavera nesta loja: <strong className="font-mono text-foreground">{current.stock_atual == null ? "—" : current.stock_atual}</strong></p>
              <div className="mt-3 flex flex-wrap gap-2"><input ref={qtyRef} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="Quantidade" className="w-36 rounded-lg border bg-background px-3 py-3 text-xl font-bold" /><button disabled={busy} className="flex-1 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Guardar contagem</button><button type="button" onClick={() => { setCurrent(null); setCode(""); scanRef.current?.focus(); }} className="rounded-lg border px-4 py-3">Cancelar</button></div>
            </form>}
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-bold">Pesquisa manual</h2><div className="mt-3 flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchArticles(); }} placeholder="Começa a escrever artigo, descrição ou código de barras…" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-3" /></div>
            {search.trim().length >= 2 && results.length > 0 && <div className="mt-3 grid gap-2">{results.map((a) => <button key={a.codigo_artigo} onClick={() => void chooseArticle(a).catch((e) => toast.error(e.message))} className="rounded-lg border p-3 text-left hover:bg-muted"><span className="block font-mono text-sm">{a.codigo_artigo}</span><span className="font-semibold">{a.descricao}</span></button>)}</div>}
            {search.trim().length >= 2 && results.length === 0 && <p className="mt-3 text-sm text-muted-foreground">A procurar artigos correspondentes… Se não aparecer, confirma o código ou tenta outra parte da descrição.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Contagens desta loja</h2><p className="text-sm text-muted-foreground">{storeName ?? "Seleciona uma loja"} · atualização automática</p></div><button disabled={!inventory || busy} onClick={() => inventory && void loadCounts(inventory.id)} className="rounded-lg border px-4 py-2 font-semibold">Atualizar</button></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted text-left"><tr><th className="p-3">Artigo</th><th className="p-3">Descrição</th><th className="p-3 text-right">Contado</th></tr></thead><tbody>
          {!inventory && <tr><td colSpan={3} className="p-5 text-center text-muted-foreground">Seleciona uma loja para começar.</td></tr>}
          {inventory && entries.length === 0 && <tr><td colSpan={3} className="p-5 text-center text-muted-foreground">Ainda não existem contagens.</td></tr>}
          {entries.map((row) => <tr key={row.codigo_artigo} className="border-t"><td className="p-3 font-mono font-semibold">{row.codigo_artigo}</td><td className="p-3">{row.descricao}</td><td className="p-3 text-right font-mono font-bold">{row.quantidade}</td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
