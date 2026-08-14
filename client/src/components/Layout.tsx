// ============================================
// Controle de Extras — Layout principal (sidebar + conteúdo)
// Design: sidebar verde-escura, item ativo com indicador lateral
// ============================================

import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Upload,
  Table2,
  Wallet,
  BarChart3,
  AlarmClock,
  FileText,
  History,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  Clock4,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: React.ElementType;
  adminOnly?: boolean;
}

const ITENS_MENU: ItemMenu[] = [
  { rotulo: "Dashboard", caminho: "/", icone: LayoutDashboard },
  { rotulo: "Importar Relatórios", caminho: "/importar", icone: Upload, adminOnly: true },
  { rotulo: "Todas as Extras", caminho: "/extras", icone: Table2 },
  { rotulo: "Pagamentos", caminho: "/pagamentos", icone: Wallet },
  { rotulo: "Análises", caminho: "/analises", icone: BarChart3 },
  { rotulo: "Extras Atrasadas", caminho: "/atrasadas", icone: AlarmClock },
  { rotulo: "Relatórios", caminho: "/relatorios", icone: FileText },
  { rotulo: "Histórico de Importações", caminho: "/historico", icone: History, adminOnly: true },
  { rotulo: "Usuários", caminho: "/usuarios", icone: Users, adminOnly: true },
  { rotulo: "Configurações", caminho: "/configuracoes", icone: Settings, adminOnly: true },
  { rotulo: "Auditoria", caminho: "/auditoria", icone: ScrollText, adminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { usuario, sair, isAdmin } = useAuth();
  const [location] = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const itensVisiveis = ITENS_MENU.filter((i) => !i.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
          <Clock4 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[15px] leading-tight text-white truncate">
            Controle de Extras
          </p>
          <p className="text-[11px] text-sidebar-foreground/70">Gestão de Horas Extras</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {itensVisiveis.map((item) => {
          const ativo = location === item.caminho;
          const Icone = item.icone;
          return (
            <Link key={item.caminho} href={item.caminho}>
              <span
                onClick={() => setMenuAberto(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150 cursor-pointer",
                  ativo
                    ? "bg-sidebar-accent text-white"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                {ativo && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-emerald-400" />
                )}
                <Icone className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
                <span className="truncate">{item.rotulo}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Usuário */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-[13px] font-bold text-white shrink-0">
            {usuario?.nome?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{usuario?.nome}</p>
            <p className="text-[11px] text-sidebar-foreground/70">
              {isAdmin ? "Administrador" : "Conferência"}
            </p>
          </div>
          <button
            onClick={sair}
            title="Sair"
            className="text-sidebar-foreground/70 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAberto(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground">
            <button
              onClick={() => setMenuAberto(false)}
              className="absolute right-3 top-3 text-sidebar-foreground/70 hover:text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center gap-3 bg-sidebar text-white px-4 py-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuAberto(true)}
            className="text-white hover:bg-sidebar-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock4 className="h-5 w-5 text-emerald-400" />
            <span className="font-display font-bold text-sm">Controle de Extras</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

// ---------- Componentes auxiliares de página ----------

export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function BadgeStatus({ status }: { status: string }) {
  const mapa: Record<string, { cor: string; rotulo: string }> = {
    pendente: { cor: "bg-amber-100 text-amber-800 border-amber-200", rotulo: "Pendente" },
    conferido: { cor: "bg-sky-100 text-sky-800 border-sky-200", rotulo: "Conferido" },
    pago: { cor: "bg-emerald-100 text-emerald-800 border-emerald-200", rotulo: "Pago" },
    divergencia: { cor: "bg-red-100 text-red-800 border-red-200", rotulo: "Divergência" },
  };
  const cfg = mapa[status] || { cor: "bg-slate-100 text-slate-700 border-slate-200", rotulo: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cfg.cor)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {cfg.rotulo}
    </span>
  );
}

export function BadgeOrigem({ origem }: { origem: string }) {
  const mapa: Record<string, string> = {
    pdf: "bg-slate-100 text-slate-700 border-slate-200",
    excel: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pdf_excel: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  const rotulos: Record<string, string> = {
    pdf: "PDF",
    excel: "Excel",
    pdf_excel: "PDF + Excel",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold", mapa[origem] || mapa.pdf)}>
      {rotulos[origem] || origem}
    </span>
  );
}
