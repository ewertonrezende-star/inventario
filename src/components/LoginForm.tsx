import { useState, type FormEvent } from "react";
import { Boxes, LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const message = await signIn(email, password);
      if (message) setError(message);
    } catch (e: any) {
      setError(e.message ?? "Não foi possível iniciar sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Boxes size={28} /></div>
        <h1 className="mt-5 text-center text-2xl font-extrabold">Inventário Coopsintra</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Acede com o utilizador da tua loja.</p>
        <label className="mt-6 block text-sm font-semibold">Email</label>
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="utilizador@coopsintra.pt" className="mt-1 w-full rounded-lg border bg-background px-3 py-3" />
        <label className="mt-4 block text-sm font-semibold">Palavra-passe</label>
        <div className="relative mt-1"><LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border bg-background py-3 pl-10 pr-3" /></div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "A entrar…" : "Entrar"}</button>
      </form>
    </main>
  );
}
