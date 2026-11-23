import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STORES } from "@/lib/inventory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Contar — Inventário Lojas" },
      { name: "description", content: "Leia o código de barras com a pistola e registe as quantidades por loja." },
      { property: "og:title", content: "Contar — Inventário Lojas" },
      { property: "og:description", content: "Leia o código de barras com a pistola e registe as quantidades por loja." },
    ],
  }),
  component: CountPage,
});

type Product = { barcode: string; reference: string | null; description: string };
type Entry = { id: string; barcode: string; quantity: number; description: string };

function CountPage() {
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [started, setStarted] = useState(false);
  const [quick, setQuick] = useState(false);
  const [code, setCode] = useState("");
  const [current, setCurrent] = useState<{ barcode: string; product: Product | null } | null>(null);
  const [qty, setQty] = useState("1");
  const [log, setLog] = useState<Entry[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(localStorage.getItem("inv_name") ?? "");
    setStore(localStorage.getItem("inv_store") ?? "");
  }, []);
  useEffect(() => { if (started) scanRef.current?.focus(); }, [started]);

  async function save(barcode: string, quantity: number, product: Product | null) {
    const { data, error } = await supabase.from("counts")
      .insert({ store_code: store, barcode, quantity, counter_name: name.trim() }).select("id").single();
    if (error) { toast.error("Erro ao gravar: " + error.message); return; }
    setLog((l) => [{ id: data.id, barcode, quantity, description: product?.description ?? "Produto não encontrado" }, ...l].slice(0, 50));
    toast.success(`+${quantity} ${product?.description ?? barcode}`);
  }

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    const barcode = code.trim();
    if (!barcode) return;
    setCode("");
    const { data } = await supabase.from("products").select("barcode,reference,description").eq("barcode", barcode).maybeSingle();
    if (!data) toast.warning(`Código ${barcode} não existe na base`);
    if (quick) { await save(barcode, 1, data); scanRef.current?.focus(); return; }
    setCurrent({ barcode, product: data });
    setQty("1");
    setTimeout(() => qtyRef.current?.select(), 0);
  }

  async function onQty(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(qty.replace(",", "."));
    if (!current || !Number.isFinite(n) || n <= 0) { toast.error("Quantidade inválida"); return; }
    await save(current.barcode, n, current.product);
    setCurrent(null);
    scanRef.current?.focus();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("counts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setLog((l) => l.filter((x) => x.id !== id));
  }

  if (!started) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Começar contagem</h1>
        <p className="mt-1 text-muted-foreground">Indique quem conta e em que loja.</p>
        <form className="mt-6 space-y-5" onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !store) { toast.error("Preencha nome e loja"); return; }
          localStorage.setItem("inv_name", name.trim()); localStorage.setItem("inv_store", store);
          setStarted(true);
        }}>
          <label className="block">
            <span className="text-sm font-semibold">O seu nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border-2 border-input bg-card px-3 py-3 text-lg outline-none focus:border-ring" />
          </label>
          <div>
            <span className="text-sm font-semibold">Loja</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STORES.map((s) => (
                <button type="button" key={s.code} onClick={() => setStore(s.code)}
                  className={`rounded-md border-2 px-3 py-3 text-left transition ${store === s.code ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-primary"}`}>
                  <span className="font-mono font-bold">{s.code}</span> <span className="text-sm">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="w-full rounded-md bg-accent py-4 text-lg font-extrabold text-accent-foreground hover:brightness-95">Iniciar</button>
        </form>
      </main>
    );
  }

  const storeName = STORES.find((s) => s.code === store)?.name;
  const total = log.reduce((a, b) => a + b.quantity, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded bg-primary px-3 py-1 font-mono font-bold text-primary-foreground">{store}</div>
        <div className="font-semibold">{storeName} · {name}</div>
        <button onClick={() => setStarted(false)} className="ml-auto text-sm underline text-muted-foreground">Trocar</button>
      </div>

      <form onSubmit={onScan} className="mt-6">
        <label className="text-sm font-semibold">Ler código de barras</label>
        <input ref={scanRef} value={code} onChange={(e) => setCode(e.target.value)} disabled={!!current}
          inputMode="numeric" autoComplete="off" placeholder="Aponte a pistola…"
          className="mt-1 w-full rounded-md border-4 border-accent bg-card px-4 py-4 font-mono text-2xl outline-none disabled:opacity-40" />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} />
          Modo rápido: cada leitura conta 1 unidade
        </label>
      </form>

      {current && (
        <form onSubmit={onQty} className="mt-4 rounded-lg border-2 border-primary bg-card p-4">
          <div className="font-mono text-sm text-muted-foreground">{current.barcode}{current.product?.reference ? ` · ${current.product.reference}` : ""}</div>
          <div className={`text-xl font-bold ${current.product ? "" : "text-destructive"}`}>
            {current.product?.description || "Produto não encontrado na base"}
          </div>
          <div className="mt-3 flex gap-2">
            <input ref={qtyRef} autoFocus onFocus={(e) => e.target.select()} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal"
              className="w-32 rounded-md border-2 border-input px-3 py-3 font-mono text-2xl outline-none focus:border-ring" />
            <button className="flex-1 rounded-md bg-primary font-bold text-primary-foreground">Gravar (Enter)</button>
            <button type="button" onClick={() => { setCurrent(null); scanRef.current?.focus(); }} className="rounded-md border-2 border-input px-4">Cancelar</button>
          </div>
        </form>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">As minhas leituras</h2>
          <span className="font-mono text-sm text-muted-foreground">{log.length} linhas · {total} un.</span>
        </div>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
          {log.length === 0 && <li className="p-4 text-sm text-muted-foreground">Ainda sem leituras.</li>}
          {log.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-14 text-right font-mono font-bold">{r.quantity}</span>
              <span className="flex-1 truncate">{r.description}<span className="ml-2 font-mono text-xs text-muted-foreground">{r.barcode}</span></span>
              <button onClick={() => remove(r.id)} className="text-sm text-destructive">Apagar</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}