// ============================================
// Controle de Extras — Extras Atrasadas
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/utils";
import { AlarmClock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function Atrasadas() {
  const { extras, configuracoes } = useData();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const { atencaoMin, atrasoMin } = configuracoes.regrasAtraso;

  const comDataInput = useMemo(
    () => aplicarFiltros(extras, filtros).filter((e) => e.diasParaLancamento !== undefined),
    [extras, filtros]
  );

  const classificar = (dias: number) => {
    if (dias >= atrasoMin) return "atrasada";
    if (dias >= atencaoMin) return "atencao";
    return "prazo";
  };

  const resumo = useMemo(() => {
    let prazo = 0, atencao = 0, atrasada = 0;
    for (const e of comDataInput) {
      const c = classificar(e.diasParaLancamento!);
      if (c === "prazo") prazo++;
      else if (c === "atencao") atencao++;
      else atrasada++;
    }
    return { prazo, atencao, atrasada, total: comDataInput.length };
  }, [comDataInput, atencaoMin, atrasoMin]);

  const atrasadas = useMemo(
    () =>
      comDataInput
        .filter((e) => classificar(e.diasParaLancamento!) !== "prazo")
        .sort((a, b) => (b.diasParaLancamento || 0) - (a.diasParaLancamento || 0)),
    [comDataInput, atencaoMin, atrasoMin]
  );

  const rankingUsuarios = useMemo(() => {
    const mapa = new Map<string, { total: number; atrasados: number; somaDias: number }>();
    for (const e of comDataInput) {
      const u = e.usuario || "Não informado";
      if (!mapa.has(u)) mapa.set(u, { total: 0, atrasados: 0, somaDias: 0 });
      const r = mapa.get(u)!;
      r.total += 1;
      r.somaDias += e.diasParaLancamento || 0;
      if (classificar(e.diasParaLancamento!) === "atrasada") r.atrasados += 1;
    }
    return Array.from(mapa.entries())
      .map(([usuario, d]) => ({
        usuario,
        ...d,
        pct: d.total > 0 ? (d.atrasados / d.total) * 100 : 0,
        media: d.total > 0 ? d.somaDias / d.total : 0,
      }))
      .sort((a, b) => b.atrasados - a.atrasados);
  }, [comDataInput, atencaoMin, atrasoMin]);

  const BadgePrazo = ({ dias }: { dias: number }) => {
    const c = classificar(dias);
    if (c === "atrasada")
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-700"><XCircle className="h-3 w-3" /> Atrasada</span>;
    if (c === "atencao")
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700"><AlertTriangle className="h-3 w-3" /> Atenção</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> No prazo</span>;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Extras Atrasadas"
        descricao={`Dias para lançamento = DataInput − Data. Regras: 0–${atencaoMin - 1} dia(s) no prazo, ${atencaoMin}–${atrasoMin - 1} atenção, ${atrasoMin}+ atrasada.`}
      />

      <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: "Com data de lançamento", valor: resumo.total, icone: AlarmClock, cor: "bg-slate-100 text-slate-700" },
          { titulo: "Dentro do prazo", valor: resumo.prazo, icone: CheckCircle2, cor: "bg-emerald-100 text-emerald-700" },
          { titulo: "Atenção", valor: resumo.atencao, icone: AlertTriangle, cor: "bg-amber-100 text-amber-700" },
          { titulo: "Atrasadas", valor: resumo.atrasada, icone: XCircle, cor: "bg-red-100 text-red-700" },
        ].map((k) => (
          <div key={k.titulo} className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.cor}`}>
              <k.icone className="h-5 w-5" />
            </div>
            <div>
              <p className="num font-display text-2xl font-bold">{k.valor}</p>
              <p className="text-[11.5px] text-muted-foreground">{k.titulo}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tabela de atrasadas */}
        <div className="xl:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-slate-50/60">
            <h3 className="text-[14px] font-bold">Registros em atenção ou atrasados ({atrasadas.length})</h3>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 font-semibold">DataInput</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Dias</th>
                  <th className="px-4 py-2.5 font-semibold">Substituto</th>
                  <th className="px-4 py-2.5 font-semibold">Posto</th>
                  <th className="px-4 py-2.5 font-semibold">Motivo</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                  <th className="px-4 py-2.5 font-semibold">Usuário</th>
                  <th className="px-4 py-2.5 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {atrasadas.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 num whitespace-nowrap">{e.data}</td>
                    <td className="px-4 py-2.5 num whitespace-nowrap">{e.dataInput}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`num font-bold ${classificar(e.diasParaLancamento!) === "atrasada" ? "text-red-600" : "text-amber-600"}`}>
                        {e.diasParaLancamento}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate font-medium">{e.substituto}</td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate">{e.posto}</td>
                    <td className="px-4 py-2.5 max-w-[130px] truncate">{e.motivo}</td>
                    <td className="px-4 py-2.5 text-right num font-semibold">{formatarMoeda(e.totalGeral)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.usuario || "—"}</td>
                    <td className="px-4 py-2.5"><BadgePrazo dias={e.diasParaLancamento!} /></td>
                  </tr>
                ))}
                {atrasadas.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Nenhuma extra atrasada ou em atenção. {comDataInput.length === 0 && "Registros com DataInput aparecerão aqui após importação de Excel com essa coluna."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking de usuários */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden h-fit">
          <div className="px-5 py-3.5 border-b bg-slate-50/60">
            <h3 className="text-[14px] font-bold">Usuários que mais lançam atrasadas</h3>
          </div>
          <div className="divide-y">
            {rankingUsuarios.map((u, i) => (
              <div key={u.usuario} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-100 text-[11px] font-bold text-red-700 num">{i + 1}</span>
                  <p className="font-semibold text-[13px] truncate flex-1">{u.usuario}</p>
                  <span className="num text-[13px] font-bold text-red-700">{u.atrasados} atrasada(s)</span>
                </div>
                <div className="mt-1.5 ml-9 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-muted-foreground">
                  <span>Total: <strong className="num">{u.total}</strong></span>
                  <span>Atraso: <strong className="num">{u.pct.toFixed(0)}%</strong></span>
                  <span>Média: <strong className="num">{formatarNumero(u.media, 1)} dias</strong></span>
                </div>
              </div>
            ))}
            {rankingUsuarios.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sem dados de usuários.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
