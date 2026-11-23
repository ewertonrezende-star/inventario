import { Link } from "@tanstack/react-router";
import { Boxes, ClipboardList, Database, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/", label: "Contagem", icon: ClipboardList },
  { to: "/consolidado", label: "Consolidado", icon: Boxes },
  { to: "/produtos", label: "Base Primavera", icon: Database },
] as const;

export function AppNav() {
  const { session, profile, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Boxes size={22} /></span>
          <span><strong className="block text-sm font-extrabold tracking-wide">COOPSINTRA</strong><span className="block text-xs text-primary-foreground/70">Gestão de Inventário</span></span>
        </Link>
        {session && <nav className="ml-auto flex flex-wrap items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary-foreground/75 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
              activeProps={{ className: "inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground shadow-sm" }}>
              <Icon size={16} />{label}
            </Link>
          ))}
          <span className="ml-2 hidden text-xs text-primary-foreground/75 md:inline">{profile?.nome || session.user?.email}</span>
          <button onClick={() => void signOut()} title="Terminar sessão" className="ml-1 inline-flex items-center gap-2 rounded-lg border border-primary-foreground/25 px-3 py-2 text-sm hover:bg-primary-foreground/10"><LogOut size={15} /><span className="hidden sm:inline">Sair</span></button>
        </nav>}
      </div>
    </header>
  );
}
