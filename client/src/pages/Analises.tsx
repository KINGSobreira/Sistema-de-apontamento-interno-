// ============================================
// Controle de Extras — Análises (colaborador, posto, motivo, comparar períodos)
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais, Extra } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Minus, GitCompareArrows } from "lucide-react";

interface Agregado {
  nome: string;
  qtd: number;
  unidades: number;
  valor: number;
  motivos: Map<string, number>;
  relacionados: Map<string, number>;
}

function agregar(extras: Extra[], campo: "substituto" | "posto" | "motivo", relCampo: "posto" | "substituto" | "motivo"): Agregado[] {
  const mapa = new Map<string, Agregado>();
  for (const e of extras) {
    const nome = e[campo] || "Não informado";
    if (!mapa.has(nome)) {
      mapa.set(nome, { nome, qtd: 0, unidades: 0, valor: 0, motivos: new Map(), relacionados: new Map() });
    }
    const a = mapa.get(nome)!;
    a.qtd += 1;
    a.unidades += e.quantidade;
    a.valor += e.totalGeral;
    a.motivos.set(e.motivo, (a.motivos.get(e.motivo) || 0) + 1);
    a.relacionados.set(e[relCampo], (a.relacionados.get(e[relCampo]) || 0) + 1);
  }
  return Array.from(mapa.values()).sort((a, b) => b.valor - a.valor);
}

function topN(mapa: Map<string, number>, n: number): string {
  return Array.from(mapa.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .join(", ");
}

function TabelaAnalise({ dados, colunaNome, colunaRel, relRotulo }: { dados: Agregado[]; colunaNome: string; colunaRel: boolean; relRotulo: string }) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold w-10">#</th>
              <th className="px-4 py-2.5 font-semibold">{colunaNome}</th>
              <th className="px-4 py-2.5 font-semibold text-right">Extras</th>
              <th className="px-4 py-2.5 font-semibold text-right">Unidades</th>
              <th className="px-4 py-2.5 font-semibold text-right">Valor total</th>
              <th className="px-4 py-2.5 font-semibold text-right">Valor médio</th>
              <th className="px-4 py-2.5 font-semibold text-right">% do total</th>
              <th className="px-4 py-2.5 font-semibold">Principais motivos</th>
              {colunaRel && <th className="px-4 py-2.5 font-semibold">{relRotulo}</th>}
            </tr>
          </thead>
          <tbody>
            {dados.map((d, i) => (
              <tr key={d.nome} className="border-b last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-800 num">{i + 1}</span>
                </td>
                <td className="px-4 py-2.5 font-medium max-w-[220px] truncate">{d.nome}</td>
                <td className="px-4 py-2.5 text-right num">{d.qtd}</td>
                <td className="px-4 py-2.5 text-right num">{formatarNumero(d.unidades)}</td>
                <td className="px-4 py-2.5 text-right num font-semibold text-emerald-800">{formatarMoeda(d.valor)}</td>
                <td className="px-4 py-2.5 text-right num">{formatarMoeda(d.qtd > 0 ? d.valor / d.qtd : 0)}</td>
                <td className="px-4 py-2.5 text-right num">{total > 0 ? ((d.valor / total) * 100).toFixed(1) : 0}%</td>
                <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{topN(d.motivos, 2)}</td>
                {colunaRel && <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{topN(d.relacionados, 2)}</td>}
              </tr>
            ))}
            {dados.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">Sem dados para análise.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Analises() {
  const { extras } = useData();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const filtrados = useMemo(() => aplicarFiltros(extras, filtros), [extras, filtros]);

  // Comparar períodos
  const [p1Ini, setP1Ini] = useState("");
  const [p1Fim, setP1Fim] = useState("");
  const [p2Ini, setP2Ini] = useState("");
  const [p2Fim, setP2Fim] = useState("");
  const [comparacao, setComparacao] = useState<null | {
    p1: { valor: number; qtd: number; unidades: number; colaboradores: number; postos: number };
    p2: { valor: number; qtd: number; unidades: number; colaboradores: number; postos: number };
  }>(null);

  const comparar = () => {
    if (!p1Ini || !p1Fim || !p2Ini || !p2Fim) return;
    const resumir = (ini: string, fim: string) => {
      const lista = extras.filter((e) => e.dataISO >= ini && e.dataISO <= fim);
      return {
        valor: lista.reduce((s, e) => s + e.totalGeral, 0),
        qtd: lista.length,
        unidades: lista.reduce((s, e) => s + e.quantidade, 0),
        colaboradores: new Set(lista.map((e) => e.substituto)).size,
        postos: new Set(lista.map((e) => e.posto)).size,
      };
    };
    setComparacao({ p1: resumir(p1Ini, p1Fim), p2: resumir(p2Ini, p2Fim) });
  };

  const Variacao = ({ v1, v2, moeda }: { v1: number; v2: number; moeda?: boolean }) => {
    const diff = v2 - v1;
    const pct = v1 !== 0 ? (diff / v1) * 100 : v2 > 0 ? 100 : 0;
    const Icone = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
    const cor = diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-700" : "text-muted-foreground";
    return (
      <span className={`inline-flex items-center gap-1 num font-semibold ${cor}`}>
        <Icone className="h-3.5 w-3.5" />
        {moeda ? formatarMoeda(Math.abs(diff)) : formatarNumero(Math.abs(diff))}
        <span className="text-[11px]">({Math.abs(pct).toFixed(1)}%)</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Análises" descricao="Rankings por colaborador, posto e motivo, e comparação entre períodos." />

      <Tabs defaultValue="colaboradores">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="colaboradores">Ranking de Colaboradores</TabsTrigger>
          <TabsTrigger value="postos">Ranking de Postos</TabsTrigger>
          <TabsTrigger value="motivos">Análise de Motivos</TabsTrigger>
          <TabsTrigger value="comparar">Comparar Períodos</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="colaboradores" className="space-y-4 mt-0">
            <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />
            <TabelaAnalise dados={agregar(filtrados, "substituto", "posto")} colunaNome="Colaborador (substituto)" colunaRel relRotulo="Principais postos" />
          </TabsContent>

          <TabsContent value="postos" className="space-y-4 mt-0">
            <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />
            <TabelaAnalise dados={agregar(filtrados, "posto", "substituto")} colunaNome="Posto" colunaRel relRotulo="Principais colaboradores" />
          </TabsContent>

          <TabsContent value="motivos" className="space-y-4 mt-0">
            <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />
            <TabelaAnalise dados={agregar(filtrados, "motivo", "posto")} colunaNome="Motivo" colunaRel={false} relRotulo="" />
          </TabsContent>

          <TabsContent value="comparar" className="space-y-4 mt-0">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="font-display text-[15px] font-bold mb-4 flex items-center gap-2">
                <GitCompareArrows className="h-5 w-5 text-emerald-700" />
                Selecione os dois períodos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-800">Período A</p>
                  <div className="flex gap-2">
                    <Input type="date" value={p1Ini} onChange={(e) => setP1Ini(e.target.value)} className="h-9 text-[13px]" />
                    <Input type="date" value={p1Fim} onChange={(e) => setP1Fim(e.target.value)} className="h-9 text-[13px]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-slate-600">Período B</p>
                  <div className="flex gap-2">
                    <Input type="date" value={p2Ini} onChange={(e) => setP2Ini(e.target.value)} className="h-9 text-[13px]" />
                    <Input type="date" value={p2Fim} onChange={(e) => setP2Fim(e.target.value)} className="h-9 text-[13px]" />
                  </div>
                </div>
              </div>
              <Button onClick={comparar} disabled={!p1Ini || !p1Fim || !p2Ini || !p2Fim} className="mt-4 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white">
                Comparar
              </Button>
            </div>

            {comparacao && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-slate-50/60">
                  <h3 className="text-[14px] font-bold">Resultado da comparação</h3>
                  <p className="text-[12px] text-muted-foreground">
                    A: {p1Ini.split("-").reverse().join("/")} a {p1Fim.split("-").reverse().join("/")} vs B: {p2Ini.split("-").reverse().join("/")} a {p2Fim.split("-").reverse().join("/")}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2.5 font-semibold">Indicador</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Período A</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Período B</th>
                        <th className="px-5 py-2.5 font-semibold text-right">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { rotulo: "Valor total", v1: comparacao.p1.valor, v2: comparacao.p2.valor, moeda: true },
                        { rotulo: "Quantidade de extras", v1: comparacao.p1.qtd, v2: comparacao.p2.qtd },
                        { rotulo: "Unidades/horas", v1: comparacao.p1.unidades, v2: comparacao.p2.unidades },
                        { rotulo: "Colaboradores", v1: comparacao.p1.colaboradores, v2: comparacao.p2.colaboradores },
                        { rotulo: "Postos", v1: comparacao.p1.postos, v2: comparacao.p2.postos },
                      ].map((l) => (
                        <tr key={l.rotulo} className="border-b last:border-0">
                          <td className="px-5 py-3 font-medium">{l.rotulo}</td>
                          <td className="px-5 py-3 text-right num">{l.moeda ? formatarMoeda(l.v1) : formatarNumero(l.v1)}</td>
                          <td className="px-5 py-3 text-right num">{l.moeda ? formatarMoeda(l.v2) : formatarNumero(l.v2)}</td>
                          <td className="px-5 py-3 text-right"><Variacao v1={l.v1} v2={l.v2} moeda={l.moeda} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
