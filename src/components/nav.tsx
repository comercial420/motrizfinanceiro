"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Bike, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/frota-contratos", label: "Frota & Contratos" },
  { href: "/vendas", label: "Vendas" },
  { href: "/visitas-tecnicas", label: "Visitas Técnicas" },
  { href: "/historico-visitas", label: "Histórico Visitas" },
  { href: "/pagamentos", label: "Pagamentos" },
  { href: "/projecoes", label: "Projeções" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    document.cookie = "fmm_session=; path=/; max-age=0; SameSite=Lax";
    sessionStorage.removeItem("fmm_auth");
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bike className="size-4" />
          </div>
          <span className="hidden sm:inline">
            <span className="text-primary">FMM</span>
            <span className="ml-1.5 text-muted-foreground font-medium">Financial Master Motriz</span>
          </span>
          <span className="sm:hidden text-primary">FMM</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Logout + Mobile hamburger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="hidden md:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sair"
          >
            <LogOut className="size-3.5" />
            <span>Sair</span>
          </button>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="mt-2 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}