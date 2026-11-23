import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Contar" },
  { to: "/consolidado", label: "Consolidado" },
  { to: "/produtos", label: "Produtos" },
] as const;

export function AppNav() {
  return (
    <header className="border-b-4 border-accent bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-mono text-sm font-bold tracking-widest">▮▯▮▮ INVENTÁRIO</span>
        <nav className="ml-auto flex gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
              className="rounded px-3 py-1.5 text-sm font-semibold opacity-80 hover:opacity-100"
              activeProps={{ className: "bg-accent text-accent-foreground opacity-100" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}