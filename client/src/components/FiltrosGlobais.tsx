// ============================================
// Controle de Extras — Barra de filtros globais
// ============================================

import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import type { FiltrosGlobais } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterX, Search } from "lucide-react";

interface Props {
  filtros: FiltrosGlobais;
  onChange: (f: FiltrosGlobais) => void;
  extras?: import("@/lib/types").Extra[];
  compacto?: boolean;
}

export function BarraFiltros({ filtros, onChange, extras: extrasProp, compacto }: Props) {
  const { extras: extrasCtx } = useData();
  const extras = extrasProp || extrasCtx;

  const opcoes = useMemo(() => {
    const filiais = new Set<string>();
    const postos = new Set<string>();
    const motivos = new Set<string>();
    const colaboradores = new Set<string>();
    const substitutos = new Set<string>();
    const anos = new Set<number>();
    for (const e of extras) {
      if (e.filial && e.filial !== "Não informado") filiais.add(e.filial);
      if (e.posto && e.posto !== "Não informado") postos.add(e.posto);
      if (e.motivo && e.motivo !== "Não informado") motivos.add(e.motivo);
      if (e.substituto && e.substituto !== "Não informado") substitutos.add(e.substituto);
      if (e.colaborador && e.colaborador !== "Não informado") colaboradores.add(e.colaborador);
      if (e.dataISO) anos.add(parseInt(e.dataISO.slice(0, 4), 10));
    }
    return {
      filiais: Array.from(filiais).sort(),
      postos: Array.from(postos).sort(),
      motivos: Array.from(motivos).sort(),
      colaboradores: Array.from(colaboradores).sort(),
      substitutos: Array.from(substitutos).sort(),
      anos: Array.from(anos).sort((a, b) => b - a),
    };
  }, [extras]);

  const set = (campo: keyof FiltrosGlobais, valor: unknown) => {
    onChange({ ...filtros, [campo]: valor === "todos" || valor === "" ? undefined : valor });
  };

  const limpar = () => onChange({});
  const temFiltro = Object.values(filtros).some((v) => v !== undefined && v !== "");

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">De</label>
          <Input
            type="date"
            value={filtros.dataInicial || ""}
            onChange={(e) => set("dataInicial", e.target.value || undefined)}
            className="h-9 w-[150px] text-[13px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Até</label>
          <Input
            type="date"
            value={filtros.dataFinal || ""}
            onChange={(e) => set("dataFinal", e.target.value || undefined)}
            className="h-9 w-[150px] text-[13px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ano</label>
          <Select value={filtros.ano?.toString() || "todos"} onValueChange={(v) => set("ano", v === "todos" ? undefined : parseInt(v, 10))}>
            <SelectTrigger className="h-9 w-[110px] text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {opcoes.anos.map((a) => (
                <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mês</label>
          <Select value={filtros.mes?.toString() || "todos"} onValueChange={(v) => set("mes", v === "todos" ? undefined : parseInt(v, 10))}>
            <SelectTrigger className="h-9 w-[130px] text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Posto</label>
          <Select value={filtros.posto || "todos"} onValueChange={(v) => set("posto", v)}>
            <SelectTrigger className="h-9 w-[200px] text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {opcoes.postos.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Motivo</label>
          <Select value={filtros.motivo || "todos"} onValueChange={(v) => set("motivo", v)}>
            <SelectTrigger className="h-9 w-[200px] text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {opcoes.motivos.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Classificação</label>
          <Select value={filtros.classificacao?.toString() || "todos"} onValueChange={(v) => set("classificacao", v === "todos" ? undefined : parseInt(v, 10))}>
            <SelectTrigger className="h-9 w-[130px] text-[13px]"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {[1, 2, 3, 4].map((c) => (
                <SelectItem key={c} value={c.toString()}>Classif. {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
          <Select value={filtros.status || "todos"} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="h-9 w-[140px] text-[13px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="conferido">Conferido</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="divergencia">Divergência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!compacto && (
          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Colaborador / Substituto</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nome..."
                value={filtros.colaborador || ""}
                onChange={(e) => set("colaborador", e.target.value || undefined)}
                className="h-9 pl-8 text-[13px]"
              />
            </div>
          </div>
        )}
        {temFiltro && (
          <Button variant="outline" size="sm" onClick={limpar} className="h-9 gap-1.5 text-[13px]">
            <FilterX className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

export function aplicarFiltros(extras: import("@/lib/types").Extra[], filtros: FiltrosGlobais) {
  return extras.filter((e) => {
    if (filtros.dataInicial && e.dataISO < filtros.dataInicial) return false;
    if (filtros.dataFinal && e.dataISO > filtros.dataFinal) return false;
    if (filtros.ano && parseInt(e.dataISO.slice(0, 4), 10) !== filtros.ano) return false;
    if (filtros.mes && parseInt(e.dataISO.slice(5, 7), 10) !== filtros.mes) return false;
    if (filtros.filial && e.filial !== filtros.filial) return false;
    if (filtros.posto && e.posto !== filtros.posto) return false;
    if (filtros.motivo && e.motivo !== filtros.motivo) return false;
    if (filtros.classificacao && e.classificacao !== filtros.classificacao) return false;
    if (filtros.status && e.status !== filtros.status) return false;
    if (filtros.colaborador) {
      const busca = filtros.colaborador.toUpperCase();
      const alvo = `${e.colaborador} ${e.substituto}`.toUpperCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}
