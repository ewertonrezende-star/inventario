import { Link } from "@tanstack/react-router";
import { Boxes, ClipboardList, Package, Warehouse } from "lucide-react";

const links = [
  { to: "/", label: "Contagem", icon: ClipboardList },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/consolidado", label: "Consolidado", icon: Boxes },
] as const;

export function AppNav() {
  return (
    <>
      <header className="pda-topbar sticky top-0 z-40 border-b bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white"><Warehouse size={23} /></span>
          <span className="min-w-0">
            <strong className="block text-sm font-extrabold tracking-wide">COOPSINTRA</strong>
            <span className="block text-xs text-primary-foreground/75">Terminal de Inventário</span>
          </span>
          <span className="ml-auto hidden rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold sm:inline-flex">PDA · Operação</span>
        </div>
        <nav className="pda-desktop-nav mx-auto hidden max-w-7xl gap-2 px-4 pb-3 sm:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground/75 transition hover:bg-white/10 hover:text-white"
              activeProps={{ className: "inline-flex items-center gap-2 rounded-lg bg-white text-primary px-4 py-2 text-sm font-bold shadow-sm" }}>
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
      </header>
      <nav className="pda-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t bg-slate-950 text-white shadow-[0_-8px_24px_rgba(0,0,0,.18)] sm:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: true }}
            className="flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold text-white/65"
            activeProps={{ className: "flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-emerald-400 bg-emerald-950 px-2 py-2 text-[11px] font-bold text-white" }}>
            <Icon size={21} />{label}
          </Link>
        ))}
      </nav>
    </>
  );
}
